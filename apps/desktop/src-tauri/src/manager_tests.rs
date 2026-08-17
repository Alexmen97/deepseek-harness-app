//! Process-ownership tests for the desktop runtime manager. The manager runs
//! against scripted stand-ins for the packaged runtime, so spawn, monitor,
//! restart, frame-safety, and teardown behavior are exercised without a
//! Tauri window or a real Node runtime.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde_json::json;

use super::{redact_secrets, route_frame, DesktopHost, LifecycleEvent, RuntimeFrame, RuntimeManager, RuntimeState};

/// Serializes tests that mutate process-wide environment variables.
static ENV_LOCK: Mutex<()> = Mutex::new(());
static NEXT_DIR: AtomicU64 = AtomicU64::new(0);

#[derive(Clone)]
struct FakeHost {
    events: Arc<Mutex<Vec<String>>>,
    dirs: Arc<(PathBuf, PathBuf)>,
    manager: Arc<OnceLock<Arc<RuntimeManager<FakeHost>>>>,
}

impl FakeHost {
    fn new(base: &Path) -> Self {
        let resource = base.join("resources");
        let data = base.join("data");
        std::fs::create_dir_all(&resource).unwrap();
        std::fs::create_dir_all(&data).unwrap();
        Self {
            events: Arc::new(Mutex::new(Vec::new())),
            dirs: Arc::new((resource, data)),
            manager: Arc::new(OnceLock::new()),
        }
    }

    fn events(&self) -> Vec<String> {
        self.events.lock().unwrap().clone()
    }

    fn has_event(&self, needle: &str) -> bool {
        self.events().iter().any(|event| event.contains(needle))
    }
}

impl DesktopHost for FakeHost {
    fn emit_lifecycle(&self, event: &LifecycleEvent) {
        self.events
            .lock()
            .unwrap()
            .push(format!("state:{:?}:{}:{:?}", event.state, event.generation, event.reason));
    }

    fn emit_frame(&self, frame: &RuntimeFrame) {
        self.events.lock().unwrap().push(format!("frame:{}:{}", frame.generation, frame.rpc_id));
    }

    fn emit_log(&self, line: &str) {
        self.events.lock().unwrap().push(format!("log:{line}"));
    }

    fn resource_dir(&self) -> Result<PathBuf, String> {
        Ok(self.dirs.0.clone())
    }

    fn data_dir(&self) -> Result<PathBuf, String> {
        Ok(self.dirs.1.clone())
    }

    fn auto_restart(&self) -> Result<(), String> {
        self.manager.get().map(|manager| manager.start()).unwrap_or(Err("manager unavailable".into()))
    }
}

/// One temp tree per test; removed on drop.
struct TestDir(PathBuf);

impl TestDir {
    fn new(tag: &str) -> Self {
        let seq = NEXT_DIR.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("dsh-desktop-manager-{}-{tag}-{seq}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        Self(dir)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// Write an executable shell stand-in for the runtime.
fn write_runtime(dir: &Path, body: &str) -> PathBuf {
    use std::os::unix::fs::PermissionsExt;
    let path = dir.join("fake-runtime.sh");
    std::fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
    path
}

fn setup_manager(dir: &TestDir, body: &str, max_frame: Option<usize>, grace_ms: Option<u64>) -> (Arc<RuntimeManager<FakeHost>>, FakeHost) {
    let runtime = write_runtime(dir.path(), body);
    std::env::set_var("DSH_DESKTOP_RUNTIME_PATH", &runtime);
    let config = dir.path().join("cordis.yml");
    std::fs::write(&config, "runtime: desktop-test\n").unwrap();
    std::env::set_var("DSH_DESKTOP_RUNTIME_CONFIG", &config);
    match max_frame {
        Some(value) => std::env::set_var("DSH_DESKTOP_MAX_FRAME_BYTES", value.to_string()),
        None => {
            std::env::remove_var("DSH_DESKTOP_MAX_FRAME_BYTES");
        }
    }
    match grace_ms {
        Some(value) => std::env::set_var("DSH_DESKTOP_SHUTDOWN_GRACE_MS", value.to_string()),
        None => {
            std::env::remove_var("DSH_DESKTOP_SHUTDOWN_GRACE_MS");
        }
    }
    let host = FakeHost::new(dir.path());
    let manager = Arc::new(RuntimeManager::new(host.clone()));
    host.manager.set(manager.clone()).ok();
    (manager, host)
}

fn wait_until(timeout: Duration, mut condition: impl FnMut() -> bool) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if condition() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    condition()
}

fn request_ok(manager: &RuntimeManager<FakeHost>) -> bool {
    matches!(
        manager.request("req-1".into(), manager.generation(), "echo".into(), String::new(), json!({})),
        Ok(value) if value.get("echo") == Some(&json!(true))
    )
}

/// Answers every non-shutdown request with a fixed response id.
const ECHO_SERVER: &str = r#"while IFS= read -r line; do
  case "$line" in
    *desktop.shutdown*) exit 0 ;;
    *) echo '{"jsonrpc":"2.0","id":"req-1","result":{"echo":true}}' ;;
  esac
done"#;

const CRASH_ONCE: &str = r#"if [ ! -f "$DSH_HOME/crashed" ]; then
  touch "$DSH_HOME/crashed"
  exit 7
fi
while IFS= read -r line; do
  case "$line" in
    *desktop.shutdown*) exit 0 ;;
    *) echo '{"jsonrpc":"2.0","id":"req-1","result":{"echo":true}}' ;;
  esac
done"#;

const ALWAYS_CRASH: &str = "exit 7";

const OVERSIZED_TERMINATED_ONCE: &str = r#"if [ ! -f "$DSH_HOME/oversized" ]; then
  touch "$DSH_HOME/oversized"
  head -c 2048 /dev/zero | tr '[:cntrl:]' 'a'
  echo
  exit 0
fi
while IFS= read -r line; do
  case "$line" in
    *desktop.shutdown*) exit 0 ;;
    *) echo '{"jsonrpc":"2.0","id":"req-1","result":{"echo":true}}' ;;
  esac
done"#;

const OVERSIZED_UNTERMINATED_ONCE: &str = r#"if [ ! -f "$DSH_HOME/unterminated" ]; then
  touch "$DSH_HOME/unterminated"
  head -c 2048 /dev/zero | tr '[:cntrl:]' 'a'
  sleep 30
  exit 0
fi
while IFS= read -r line; do
  case "$line" in
    *desktop.shutdown*) exit 0 ;;
    *) echo '{"jsonrpc":"2.0","id":"req-1","result":{"echo":true}}' ;;
  esac
done"#;

const MALFORMED_FIRST: &str = r#"echo 'not-json'
while IFS= read -r line; do
  case "$line" in
    *desktop.shutdown*) exit 0 ;;
    *) echo '{"jsonrpc":"2.0","id":"req-1","result":{"echo":true}}' ;;
  esac
done"#;

const FRAGMENTED_AND_MULTIPLE: &str = r#"while IFS= read -r line; do
  case "$line" in
    *desktop.shutdown*) exit 0 ;;
    *)
      printf '%s' '{"jsonrpc":"2.0","id":"req-1","result":{"ok":'
      echo 'true}}'
      echo '{"jsonrpc":"2.0","id":"stray-9","result":{}}'
      ;;
  esac
done"#;

const DIES_QUIETLY: &str = "sleep 1; exit 3";

const IGNORES_EVERYTHING: &str = "while true; do sleep 1; done";

#[test]
fn spawn_roundtrip_and_graceful_stop() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("roundtrip");
    let (manager, host) = setup_manager(&dir, ECHO_SERVER, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running && manager.generation() == 1));
    assert!(request_ok(&manager));
    manager.stop().unwrap();
    assert_eq!(manager.state(), RuntimeState::Stopped);
    assert!(manager.request("req-1".into(), manager.generation(), "echo".into(), String::new(), json!({})).is_err());
    assert!(host.has_event("state:Running"));
    assert!(host.has_event("state:Stopping"));
    assert!(host.has_event("state:Stopped"));
    assert!(!host.has_event("state:Restarting"));
}

#[test]
fn crash_restarts_with_new_generation() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("crash-restart");
    let (manager, host) = setup_manager(&dir, CRASH_ONCE, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(10), || manager.state() == RuntimeState::Running && manager.generation() >= 2));
    assert!(host.has_event("state:Restarting"));
    assert!(request_ok(&manager));
    manager.stop().unwrap();
}

#[test]
fn crash_budget_exhausted_marks_failed() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("crash-budget");
    let (manager, host) = setup_manager(&dir, ALWAYS_CRASH, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(15), || manager.state() == RuntimeState::Failed));
    // Initial spawn plus at most MAX_RESTARTS_PER_WINDOW automatic restarts.
    assert_eq!(manager.generation(), 4);
    assert!(host.has_event("restart budget exhausted"));
}

#[test]
fn oversized_terminated_frame_terminates_generation_and_recovers() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("oversized-terminated");
    let (manager, host) = setup_manager(&dir, OVERSIZED_TERMINATED_ONCE, Some(256), None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(10), || manager.state() == RuntimeState::Running && manager.generation() >= 2));
    assert!(host.has_event("state:Restarting"));
    assert!(request_ok(&manager));
    manager.stop().unwrap();
}

#[test]
fn oversized_unterminated_frame_terminates_generation_and_recovers() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("oversized-unterminated");
    let (manager, host) = setup_manager(&dir, OVERSIZED_UNTERMINATED_ONCE, Some(256), None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(10), || manager.state() == RuntimeState::Running && manager.generation() >= 2));
    assert!(host.has_event("state:Restarting"));
    assert!(request_ok(&manager));
    manager.stop().unwrap();
}

#[test]
fn malformed_frame_is_skipped_without_restart() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("malformed");
    let (manager, host) = setup_manager(&dir, MALFORMED_FIRST, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running && manager.generation() == 1));
    assert!(request_ok(&manager));
    assert_eq!(manager.generation(), 1);
    assert!(!host.has_event("state:Restarting"));
    manager.stop().unwrap();
}

#[test]
fn fragmented_and_multiple_frames_in_one_read() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("fragmented");
    let (manager, _host) = setup_manager(&dir, FRAGMENTED_AND_MULTIPLE, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running));
    let response = manager.request("req-1".into(), manager.generation(), "echo".into(), String::new(), json!({})).unwrap();
    assert_eq!(response.get("ok"), Some(&json!(true)));
    manager.stop().unwrap();
}

#[test]
fn stale_generation_request_is_rejected() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("stale-generation");
    let (manager, _host) = setup_manager(&dir, ECHO_SERVER, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running));
    let error = manager.request("req-1".into(), 0, "echo".into(), String::new(), json!({})).unwrap_err();
    assert!(error.contains("stale generation"));
    manager.stop().unwrap();
}

#[test]
fn pending_request_fails_closed_when_runtime_dies() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("pending-crash");
    let (manager, _host) = setup_manager(&dir, DIES_QUIETLY, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running));
    let error = manager.request("req-1".into(), manager.generation(), "echo".into(), String::new(), json!({})).unwrap_err();
    assert!(error.contains("runtime exited") || error.contains("runtime stopping"));
    manager.stop().unwrap();
}

#[test]
fn uncooperative_runtime_is_killed_on_stop() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("uncooperative");
    let (manager, _host) = setup_manager(&dir, IGNORES_EVERYTHING, None, Some(200));
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running));
    let started = Instant::now();
    manager.stop().unwrap();
    assert!(started.elapsed() < Duration::from_secs(5));
    assert_eq!(manager.state(), RuntimeState::Stopped);
    assert!(manager.request("req-1".into(), manager.generation(), "echo".into(), String::new(), json!({})).is_err());
}

#[test]
fn spawn_failure_reports_error() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("spawn-failure");
    let (manager, _host) = setup_manager(&dir, ECHO_SERVER, None, None);
    // Point at a missing binary: resolution falls through to the bundled path.
    std::env::set_var("DSH_DESKTOP_RUNTIME_PATH", dir.path().join("missing-runtime"));
    let error = manager.start().unwrap_err();
    assert!(error.contains("bundled runtime not found"));
    assert_eq!(manager.state(), RuntimeState::Stopped);
}

#[test]
fn duplicate_start_is_rejected() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("duplicate-start");
    let (manager, _host) = setup_manager(&dir, ECHO_SERVER, None, None);
    manager.start().unwrap();
    assert!(wait_until(Duration::from_secs(5), || manager.state() == RuntimeState::Running));
    let error = manager.start().unwrap_err();
    assert!(error.contains("runtime already owned"));
    manager.stop().unwrap();
}

#[test]
fn redaction_replaces_configured_secret() {
    let _env = ENV_LOCK.lock().unwrap();
    std::env::set_var("DEEPSEEK_API_KEY", "sk-test-secret-123");
    let output = redact_secrets("log line says sk-test-secret-123 and more");
    assert!(!output.contains("sk-test-secret-123"));
    assert!(output.contains("[redacted]"));
    std::env::remove_var("DEEPSEEK_API_KEY");
}

#[test]
fn route_frame_handles_protocol_mismatch_without_panicking() {
    let _env = ENV_LOCK.lock().unwrap();
    let dir = TestDir::new("route-frame");
    let host = FakeHost::new(dir.path());
    let manager = Arc::new(RuntimeManager::new(host.clone()));
    host.manager.set(manager.clone()).ok();
    let shared = manager.shared();
    // Unknown host-initiated method gets a JSON-RPC method-not-found answer.
    route_frame(json!({ "jsonrpc": "2.0", "id": "host-1", "method": "desktop/unknown" }), 1, &shared);
    // A response whose id has no pending request is dropped, never treated.
    route_frame(json!({ "jsonrpc": "2.0", "id": "nobody", "result": { "x": 1 } }), 1, &shared);
    // The runtime status notification surfaces as a lifecycle event.
    route_frame(json!({ "jsonrpc": "2.0", "method": "desktop.status", "params": { "state": "stopping" } }), 1, &shared);
    assert!(host.has_event("state:Stopping:1"), "events: {:?}", host.events());
    route_frame(json!({ "jsonrpc": "2.0", "method": "desktop.status", "params": { "state": "ready" } }), 1, &shared);
    assert!(host.has_event("state:Running:1"), "events: {:?}", host.events());
}
