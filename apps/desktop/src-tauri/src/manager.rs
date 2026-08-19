/**
 * HarnessRuntimeManager: the exclusive owner of the sidecar lifecycle.
 * Owns spawn, the stdin writer, the bounded stdout frame reader, stderr
 * capture, generation numbering, the crash/restart policy, and graceful
 * shutdown. The WebView never touches the process; it talks only through
 * the Tauri commands over this manager. The manager is generic over
 * `DesktopHost` so the process ownership logic is unit-testable without
 * constructing a Tauri application.
 */

use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

use crate::workspace_watcher::{WorkspaceChanged, WorkspaceWatcher};

/// Default maximum stdout frame size in bytes (16 MiB).
/// Rationale: tool results and terminal output ride single JSON frames and
/// can legitimately reach megabytes; 16 MiB covers them while bounding the
/// reader's allocation against a pathological unterminated line.
pub const DEFAULT_MAX_FRAME_BYTES: usize = 16 * 1024 * 1024;
/// Harness release this desktop milestone pins (authoritative: the repository root package.json).
pub const HARNESS_VERSION: &str = "0.1.0-rc.7";
/// The desktop wire protocol version the app expects (mirrors the TypeScript DESKTOP_PROTOCOL_VERSION).
pub const DESKTOP_PROTOCOL_VERSION: u32 = 1;
/// macOS Keychain service namespace for the desktop credential bridge.
/// Matches the bundle identifier so the credential namespace moves with the app identity;
/// do not change it silently (docs/desktop/CREDENTIALS.md).
pub const KEYCHAIN_SERVICE: &str = "io.github.alexmen97.harness-desktop";

/// Restart budget: at most this many automatic restarts per window.
pub const MAX_RESTARTS_PER_WINDOW: u32 = 3;
pub const RESTART_WINDOW: Duration = Duration::from_secs(60);

/// Grace for stdin-EOF cooperative teardown, then SIGTERM, then SIGKILL.
pub const SHUTDOWN_GRACE: Duration = Duration::from_secs(5);
/// One unary request round trip may wait at most this long for a response.
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(65);
/// How often the monitor polls the child for exit.
pub const MONITOR_POLL: Duration = Duration::from_millis(150);
/// Desktop log retention: rotate `desktop.log` once it outgrows this size.
pub const LOG_ROTATE_BYTES: u64 = 1024 * 1024;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeState {
    Stopped,
    Starting,
    Running,
    Restarting,
    Failed,
    Stopping,
}

#[derive(Clone, Serialize)]
pub struct LifecycleEvent {
    pub state: RuntimeState,
    pub generation: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct RuntimeFrame {
    pub generation: u64,
    pub stream: String,
    pub rpc_id: String,
    pub payload: Value,
}

struct PendingRequest {
    tx: std::sync::mpsc::Sender<Result<Value, String>>,
}

/// The host side of the desktop transport boundary. The production
/// implementation is the Tauri application handle; tests provide a fake that
/// records events and owns the manager for automatic restarts.
pub trait DesktopHost: Clone + Send + Sync + 'static {
    fn emit_lifecycle(&self, event: &LifecycleEvent);
    fn emit_frame(&self, frame: &RuntimeFrame);
    fn emit_log(&self, line: &str);
    fn resource_dir(&self) -> Result<PathBuf, String>;
    fn data_dir(&self) -> Result<PathBuf, String>;
    /// Automatic restart attempted by the monitor after an unexpected exit.
    fn auto_restart(&self) -> Result<(), String>;
    /// Forward one coalesced workspace invalidation batch to the frontend.
    fn emit_workspace_changed(&self, event: &WorkspaceChanged);
    /// Ask the frontend to resolve unsaved changes before the app exits.
    fn emit_quit_guard(&self, generation: u64);
    /// Exit the host application with a code after the quit decision.
    fn exit_app(&self, code: i32);
}

impl DesktopHost for AppHandle {
    fn emit_lifecycle(&self, event: &LifecycleEvent) {
        let _ = self.emit("runtime://state", event);
    }
    fn emit_frame(&self, frame: &RuntimeFrame) {
        let _ = self.emit("runtime://frame", frame);
    }
    fn emit_log(&self, line: &str) {
        let _ = self.emit("runtime://log", &json!({ "line": line }));
    }
    fn resource_dir(&self) -> Result<PathBuf, String> {
        self.path().resource_dir().map_err(|error| format!("resource dir unavailable: {error}"))
    }
    fn data_dir(&self) -> Result<PathBuf, String> {
        self.path().app_data_dir().map_err(|error| format!("app data dir unavailable: {error}"))
    }
    fn auto_restart(&self) -> Result<(), String> {
        let Some(state) = self.try_state::<RuntimeManager<AppHandle>>() else {
            return Err("runtime manager state unavailable".into());
        };
        state.inner().start()
    }
    fn emit_workspace_changed(&self, event: &WorkspaceChanged) {
        let _ = self.emit("workspace://changed", event);
    }
    fn emit_quit_guard(&self, generation: u64) {
        let _ = self.emit("desktop://quit-guard", &json!({ "generation": generation }));
    }
    fn exit_app(&self, code: i32) {
        self.exit(code);
    }
}

pub struct RuntimeManager<H: DesktopHost = AppHandle> {
    host: H,
    inner: Arc<Mutex<Inner>>,
    generation: Arc<AtomicU64>,
    pending: Arc<Mutex<HashMap<String, PendingRequest>>>,
    /// Armed while the frontend holds dirty editor buffers; a quit attempt
    /// pauses for the user decision instead of shutting down the runtime.
    quit_guard: Arc<AtomicBool>,
}

struct Inner {
    state: RuntimeState,
    /// Owned while a generation is alive; the monitor reaps it on exit.
    child: Option<Child>,
    /// The stdin pipe lives here so it is never dropped while the child runs.
    stdin: Option<ChildStdin>,
    /// Once set, the manager refuses new starts until an explicit restart.
    shutdown: bool,
    /// Set by `transport_corrupted` so the monitor can name the reason.
    corrupt_reason: Option<String>,
    restart_times: Vec<Instant>,
    last_exit: Option<i32>,
    /// The generation-scoped native workspace watcher, owned while the
    /// runtime generation is alive and dropped on stop/restart.
    watcher: Option<WorkspaceWatcher>,
}

impl<H: DesktopHost> RuntimeManager<H> {
    pub fn new(host: H) -> Self {
        Self {
            host,
            inner: Arc::new(Mutex::new(Inner {
                state: RuntimeState::Stopped,
                child: None,
                stdin: None,
                shutdown: false,
                corrupt_reason: None,
                restart_times: Vec::new(),
                last_exit: None,
                watcher: None,
            })),
            generation: Arc::new(AtomicU64::new(0)),
            pending: Arc::new(Mutex::new(HashMap::new())),
            quit_guard: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn state(&self) -> RuntimeState {
        self.inner.lock().unwrap().state
    }

    pub fn generation(&self) -> u64 {
        self.generation.load(Ordering::SeqCst)
    }

    pub fn last_exit(&self) -> Option<i32> {
        self.inner.lock().unwrap().last_exit
    }

    fn set_inner_state(&self, state: RuntimeState) {
        self.inner.lock().unwrap().state = state;
    }

    fn emit_state(&self, state: RuntimeState, reason: Option<String>) {
        self.host.emit_lifecycle(&LifecycleEvent { state, generation: self.generation(), reason });
    }

    pub fn resolve_runtime_path(&self) -> Result<PathBuf, String> {
        if let Ok(path) = std::env::var("DSH_DESKTOP_RUNTIME_PATH") {
            let candidate = PathBuf::from(&path);
            if !path.is_empty() && candidate.exists() {
                return Ok(candidate);
            }
        }
        let resource = self.host.resource_dir()?.join("sidecar").join("dsh-desktop-runtime");
        if resource.exists() {
            Ok(resource)
        } else {
            Err(format!("bundled runtime not found at {}", resource.display()))
        }
    }

    pub fn resolve_runtime_config(&self) -> Result<PathBuf, String> {
        if let Ok(path) = std::env::var("DSH_DESKTOP_RUNTIME_CONFIG") {
            let candidate = PathBuf::from(&path);
            if !path.is_empty() && candidate.exists() {
                return Ok(candidate);
            }
        }
        let resource = self.host.resource_dir()?.join("runtime").join("cordis.yml");
        if resource.exists() {
            Ok(resource)
        } else {
            Err(format!("runtime config not found at {}", resource.display()))
        }
    }

    fn app_data_dir(&self, leaf: &str) -> Result<PathBuf, String> {
        let dir = self.host.data_dir()?.join(leaf);
        std::fs::create_dir_all(&dir).map_err(|error| format!("cannot create {}: {error}", dir.display()))?;
        Ok(dir)
    }

    fn workspace_dir(&self) -> PathBuf {
        let prefs = self
            .host
            .data_dir()
            .ok()
            .and_then(|dir| std::fs::read_to_string(dir.join("prefs.json")).ok())
            .and_then(|text| serde_json::from_str::<Value>(&text).ok());
        prefs
            .as_ref()
            .and_then(|value| value.get("workspace"))
            .and_then(Value::as_str)
            .map(PathBuf::from)
            .unwrap_or_else(|| std::env::var("HOME").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("/")))
    }

    fn augmented_path(&self) -> String {
        let mut path = std::env::var("PATH").unwrap_or_default();
        for prefix in ["/opt/homebrew/bin", "/usr/local/bin"] {
            if !path.split(':').any(|entry| entry == prefix) {
                path = format!("{prefix}:{path}");
            }
        }
        path
    }

    /// Start the runtime, incrementing the transport generation first.
    pub fn start(&self) -> Result<(), String> {
        {
            let inner = self.inner.lock().unwrap();
            if inner.child.is_some() {
                return Err("runtime already owned".into());
            }
            if inner.shutdown {
                return Err("runtime manager is shutting down".into());
            }
        }
        let binary = self.resolve_runtime_path()?;
        let config = self.resolve_runtime_config()?;
        let home = self.app_data_dir("data")?;
        let sessions = self.app_data_dir("sessions")?;
        let workspace = self.workspace_dir();
        let max_frame = std::env::var("DSH_DESKTOP_MAX_FRAME_BYTES")
            .ok()
            .and_then(|value| value.parse::<usize>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_MAX_FRAME_BYTES);

        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        self.set_inner_state(RuntimeState::Starting);
        let mut command = Command::new(&binary);
        command
            .current_dir(&workspace)
            .env("DSH_HOME", &home)
            .env("DSH_CORDIS_CONFIG", &config)
            .env("DSH_SESSION_ROOT", &sessions)
            .env("DSH_CWD", &workspace)
            .env("PATH", self.augmented_path())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let mut child = command.spawn().map_err(|error| format!("spawn failed: {error}"))?;
        let stdin = child.stdin.take().ok_or("stdin pipe unavailable")?;
        let stdout = child.stdout.take().ok_or("stdout pipe unavailable")?;
        let stderr = child.stderr.take().ok_or("stderr pipe unavailable")?;
        {
            let mut inner = self.inner.lock().unwrap();
            inner.child = Some(child);
            // Keep the pipe for the whole generation: dropping it closes
            // stdin and makes the runtime exit on EOF.
            inner.stdin = Some(stdin);
            inner.corrupt_reason = None;
        }

        let shared = self.shared();
        let reader = shared.clone();
        std::thread::spawn(move || read_frames(stdout, generation, max_frame, reader));
        let log_dir = self.log_dir();
        let stderr_shared = shared.clone();
        std::thread::spawn(move || capture_stderr(stderr, stderr_shared, log_dir));
        let monitor = shared.clone();
        std::thread::spawn(move || monitor_loop(monitor));
        self.set_inner_state(RuntimeState::Running);
        self.emit_state(RuntimeState::Running, None);
        self.start_watcher(generation, &workspace);
        Ok(())
    }

    fn log_dir(&self) -> Option<PathBuf> {
        self.host.data_dir().ok().map(|dir| dir.join("logs"))
    }

    /// Explicit restart used by the restart command: the shutdown flag is
    /// reset so `start` can run again after `stop`.
    pub fn restart(&self) -> Result<(), String> {
        self.stop()?;
        self.inner.lock().unwrap().shutdown = false;
        self.start()
    }

    /// Graceful shutdown: protocol shutdown request, then the dispose ladder
    /// (stdin EOF, SIGTERM, SIGKILL) within the bounded grace window.
    pub fn stop(&self) -> Result<(), String> {
        // Drop the watcher first: after this point no workspace change event
        // can outlive the runtime generation it belongs to.
        self.stop_watcher();
        let (child, stdin) = {
            let mut inner = self.inner.lock().unwrap();
            // Mark first so a concurrent monitor never schedules a restart.
            inner.shutdown = true;
            inner.state = RuntimeState::Stopping;
            let child = inner.child.take();
            let stdin = inner.stdin.take();
            (child, stdin)
        };
        self.emit_state(RuntimeState::Stopping, None);
        self.shared().fail_pending("runtime stopping");
        let Some(mut child) = child else {
            self.set_inner_state(RuntimeState::Stopped);
            self.emit_state(RuntimeState::Stopped, None);
            return Ok(());
        };
        let request_id = format!("shutdown-{}", self.generation());
        let frame = json!({ "jsonrpc": "2.0", "id": request_id, "method": "desktop.shutdown", "params": {} });
        let mut line = serde_json::to_vec(&frame).unwrap_or_default();
        line.push(b'\n');
        if let Some(mut stdin) = stdin {
            let _ = stdin.write_all(&line);
            let _ = stdin.flush();
            // Dropping the pipe signals EOF, the cooperative teardown path.
        }
        // Cooperative window: the runtime flushes its response and exits 0.
        let deadline = Instant::now() + self.shutdown_grace();
        let mut exited = false;
        while !exited && Instant::now() < deadline {
            match child.try_wait() {
                Ok(Some(_)) => exited = true,
                Ok(None) => std::thread::sleep(Duration::from_millis(100)),
                Err(_) => exited = true,
            }
        }
        // Dispose ladder after the cooperative window.
        if !exited {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.set_inner_state(RuntimeState::Stopped);
        self.emit_state(RuntimeState::Stopped, None);
        Ok(())
    }

    /// Arm or disarm the unsaved-changes quit guard; the frontend keeps it
    /// in sync with dirty editor buffers.
    pub fn set_quit_guard(&self, armed: bool) {
        self.quit_guard.store(armed, Ordering::SeqCst);
    }

    /// Whether a quit attempt must pause for the frontend decision.
    pub fn quit_guard_armed(&self) -> bool {
        self.quit_guard.load(Ordering::SeqCst)
    }

    /// Final quit after the frontend decision: disarm and exit so the normal
    /// RunEvent::Exit path stops the runtime (no orphan).
    pub fn request_quit(&self) {
        self.quit_guard.store(false, Ordering::SeqCst);
        self.host.exit_app(0);
    }

    /// Tell the frontend that a quit attempt is waiting on unsaved changes.
    pub fn emit_quit_guard_request(&self) {
        self.host.emit_quit_guard(self.generation());
    }

    /// Start the generation-scoped native workspace watcher. Non-fatal on
    /// failure: live sync degrades to manual refresh.
    fn start_watcher(&self, generation: u64, workspace: &Path) {
        if !workspace.is_dir() {
            self.host.emit_log("workspace watcher: workspace is not a directory; live sync disabled");
            return;
        }
        let host = self.host.clone();
        let emit = move |changed: WorkspaceChanged| host.emit_workspace_changed(&changed);
        match WorkspaceWatcher::start(workspace.to_path_buf(), generation, emit) {
            Ok(watcher) => {
                self.inner.lock().unwrap().watcher = Some(watcher);
            }
            Err(error) => self.host.emit_log(&format!("workspace watcher failed to start: {error}")),
        }
    }

    /// Stop the current watcher (workspace change, restart, shutdown).
    fn stop_watcher(&self) {
        let watcher = self.inner.lock().unwrap().watcher.take();
        drop(watcher);
    }

    fn shutdown_grace(&self) -> Duration {
        std::env::var("DSH_DESKTOP_SHUTDOWN_GRACE_MS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .map(Duration::from_millis)
            .unwrap_or(SHUTDOWN_GRACE)
    }

    /// Send one JSON-RPC request to the runtime and await its response.
    pub fn request(
        &self,
        request_id: String,
        generation: u64,
        method: String,
        rpc_id: String,
        mut payload: Value,
    ) -> Result<Value, String> {
        self.host.emit_log(&format!("request {method} generation={generation}"));
        if method == "desktop.initialize" {
            // The protocol requires the launch cwd; the client may not know
            // it before the first run, so the manager fills its own.
            if let Some(object) = payload.as_object_mut() {
                if !object.contains_key("cwd") {
                    object.insert("cwd".into(), json!(self.workspace_dir().to_string_lossy()));
                }
            }
        }
        // Generation 0 is the unanchored first contact: the client cannot
        // know the runtime's generation before its first state event.
        if generation != 0 && generation != self.generation() {
            return Err(format!(
                "stale generation: request targets {generation}, runtime serves {}",
                self.generation()
            ));
        }
        let (tx, rx) = std::sync::mpsc::channel();
        self.pending.lock().unwrap().insert(request_id.clone(), PendingRequest { tx });
        // desktop.* methods take their typed params directly; apiproxy
        // methods ride the { rpcId, payload } envelope the server unwraps.
        let params = if method == "respond" || method.starts_with("desktop.") {
            payload
        } else {
            json!({ "rpcId": rpc_id, "payload": payload })
        };
        let frame = json!({ "jsonrpc": "2.0", "id": request_id, "method": method, "params": params });
        let mut line = serde_json::to_vec(&frame).map_err(|error| error.to_string())?;
        line.push(b'\n');
        {
            let mut inner = self.inner.lock().unwrap();
            let Some(stdin) = inner.stdin.as_mut() else {
                drop(inner);
                self.pending.lock().unwrap().remove(&request_id);
                return Err("runtime not running".into());
            };
            if stdin.write_all(&line).is_err() || stdin.flush().is_err() {
                drop(inner);
                self.pending.lock().unwrap().remove(&request_id);
                return Err("write failed".into());
            }
        }
        match rx.recv_timeout(REQUEST_TIMEOUT) {
            Ok(result) => {
                self.host.emit_log(&format!("request {method} settled"));
                result
            }
            Err(error) => {
                self.pending.lock().unwrap().remove(&request_id);
                self.host.emit_log(&format!("request {method} failed: {error:?}"));
                Err("request timed out or the runtime exited".into())
            }
        }
    }

    fn shared(&self) -> SharedManager<H> {
        SharedManager {
            host: self.host.clone(),
            inner: self.inner.clone(),
            pending: self.pending.clone(),
            generation: self.generation.clone(),
        }
    }
}

/// Clone-friendly handle the reader/monitor threads hold.
#[derive(Clone)]
struct SharedManager<H: DesktopHost> {
    host: H,
    inner: Arc<Mutex<Inner>>,
    pending: Arc<Mutex<HashMap<String, PendingRequest>>>,
    generation: Arc<AtomicU64>,
}

impl<H: DesktopHost> SharedManager<H> {
    fn generation(&self) -> u64 {
        self.generation.load(Ordering::SeqCst)
    }

    fn set_inner_state(&self, state: RuntimeState) {
        self.inner.lock().unwrap().state = state;
    }

    fn emit_state(&self, state: RuntimeState, reason: Option<String>) {
        self.host.emit_lifecycle(&LifecycleEvent { state, generation: self.generation(), reason });
    }

    fn fail_pending(&self, reason: &str) {
        let ids: Vec<String> = self.pending.lock().unwrap().keys().cloned().collect();
        for id in ids {
            if let Some(entry) = self.pending.lock().unwrap().remove(&id) {
                let _ = entry.tx.send(Err(reason.to_string()));
            }
        }
    }
}

fn read_frames<H: DesktopHost>(stdout: std::process::ChildStdout, generation: u64, max_frame: usize, manager: SharedManager<H>) {
    let mut reader = BufReader::new(stdout);
    let mut buffer: Vec<u8> = Vec::new();
    loop {
        buffer.clear();
        // Incremental reads bound the allocation: an unterminated or
        // oversized line trips the limit before unbounded memory grows.
        loop {
            let available = match reader.fill_buf() {
                Ok(available) => available,
                Err(_) => {
                    transport_corrupted(&manager, "stdout read failed");
                    return;
                }
            };
            if available.is_empty() {
                return;
            }
            let newline = available.iter().position(|byte| *byte == b'\n');
            let take = match newline {
                Some(index) => index + 1,
                None => available.len(),
            };
            if buffer.len() + take > max_frame {
                transport_corrupted(&manager, &format!("frame exceeds {max_frame} bytes"));
                return;
            }
            buffer.extend_from_slice(&available[..take]);
            reader.consume(take);
            if newline.is_some() {
                break;
            }
        }
        let line = String::from_utf8_lossy(buffer.strip_suffix(b"\n").unwrap_or(&buffer));
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let value: Value = match serde_json::from_str(trimmed) {
            Ok(value) => value,
            Err(_) => continue, // malformed frames are skipped, never interpreted
        };
        route_frame(value, generation, &manager);
    }
}

fn transport_corrupted<H: DesktopHost>(manager: &SharedManager<H>, reason: &str) {
    let message = format!("transport corrupted: {reason}");
    manager.emit_state(RuntimeState::Restarting, Some(message.clone()));
    {
        let mut inner = manager.inner.lock().unwrap();
        inner.corrupt_reason = Some(message);
        if let Some(child) = inner.child.as_mut() {
            let _ = child.kill();
        }
    }
    manager.fail_pending(reason);
}

fn route_frame<H: DesktopHost>(value: Value, generation: u64, manager: &SharedManager<H>) {
    let id = value.get("id").and_then(Value::as_str).map(String::from);
    let method = value.get("method").and_then(Value::as_str).map(String::from);
    match (id, method) {
        (Some(id), Some(method)) => {
            // Server-initiated request: only the credential bridge is served.
            let response = match method.as_str() {
                "desktop/credential-resolve" => {
                    let reference = value.pointer("/params/ref").and_then(Value::as_str).unwrap_or("");
                    let resolved = keychain_get(reference).ok().flatten();
                    json!({ "jsonrpc": "2.0", "id": id, "result": { "value": resolved } })
                }
                "desktop/credential-store" => {
                    let reference = value.pointer("/params/ref").and_then(Value::as_str).unwrap_or("");
                    let secret = value.pointer("/params/value").and_then(Value::as_str).unwrap_or("");
                    match keychain_set(reference, secret) {
                        Ok(()) => json!({ "jsonrpc": "2.0", "id": id, "result": {} }),
                        Err(error) => json!({ "jsonrpc": "2.0", "id": id, "error": { "code": -32603, "message": error } }),
                    }
                }
                "desktop/credential-delete" => {
                    let reference = value.pointer("/params/ref").and_then(Value::as_str).unwrap_or("");
                    match keychain_delete(reference) {
                        Ok(()) => json!({ "jsonrpc": "2.0", "id": id, "result": {} }),
                        Err(error) => json!({ "jsonrpc": "2.0", "id": id, "error": { "code": -32603, "message": error } }),
                    }
                }
                _ => json!({ "jsonrpc": "2.0", "id": id, "error": { "code": -32601, "message": "method not found" } }),
            };
            write_to_runtime(manager, &response);
        }
        (Some(id), None) => {
            let mut pending = manager.pending.lock().unwrap();
            if let Some(entry) = pending.remove(&id) {
                manager.host.emit_log(&format!("response {id}"));
                let result = if let Some(error) = value.get("error") {
                    Err(error.to_string())
                } else {
                    Ok(value.get("result").cloned().unwrap_or(Value::Null))
                };
                let _ = entry.tx.send(result);
            }
        }
        (None, Some(method)) => {
            let rpc_id = value
                .get("params")
                .and_then(|params| params.get("rpcId"))
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let payload = value
                .get("params")
                .and_then(|params| params.get("payload"))
                .cloned()
                .unwrap_or(Value::Null);
            if method == "desktop.status" {
                let state = value
                    .get("params")
                    .and_then(|params| params.get("state"))
                    .and_then(Value::as_str)
                    .unwrap_or("initializing");
                let state = match state {
                    "ready" => RuntimeState::Running,
                    "stopping" => RuntimeState::Stopping,
                    _ => RuntimeState::Starting,
                };
                manager.host.emit_lifecycle(&LifecycleEvent {
                    state,
                    generation,
                    reason: None,
                });
            } else {
                let stream = if method == "events.host" { "host" } else { "mux" };
                manager.host.emit_frame(&RuntimeFrame {
                    generation,
                    stream: stream.into(),
                    rpc_id,
                    payload,
                });
            }
        }
        (None, None) => {}
    }
}

fn write_to_runtime<H: DesktopHost>(manager: &SharedManager<H>, frame: &Value) {
    let mut line = serde_json::to_vec(frame).unwrap_or_default();
    line.push(b'\n');
    let mut inner = manager.inner.lock().unwrap();
    if let Some(stdin) = inner.stdin.as_mut() {
        let _ = stdin.write_all(&line);
        let _ = stdin.flush();
    }
}

fn capture_stderr<H: DesktopHost>(stderr: std::process::ChildStderr, manager: SharedManager<H>, log_dir: Option<PathBuf>) {
    let reader = BufReader::new(stderr);
    let mut log_file = log_dir.as_ref().and_then(|dir| open_log(dir).ok());
    for line in reader.lines().map_while(Result::ok) {
        let redacted = redact_secrets(&line);
        manager.host.emit_log(&redacted);
        if let Some(file) = log_file.as_mut() {
            let _ = writeln!(file, "{redacted}");
        }
    }
}

/// Append-only desktop log with one rotation at LOG_ROTATE_BYTES.
pub(crate) fn open_log(dir: &PathBuf) -> std::io::Result<File> {
    std::fs::create_dir_all(dir)?;
    let path = dir.join("desktop.log");
    if let Ok(meta) = std::fs::metadata(&path) {
        if meta.len() > LOG_ROTATE_BYTES {
            let _ = std::fs::rename(&path, dir.join("desktop.log.1"));
        }
    }
    OpenOptions::new().create(true).append(true).open(path)
}

/// Remove credential-shaped values before a stderr line reaches the webview.
fn redact_secrets(line: &str) -> String {
    let mut output = line.to_string();
    for key in ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL"] {
        if let Ok(value) = std::env::var(key) {
            if !value.is_empty() && output.contains(&value) {
                output = output.replace(&value, "[redacted]");
            }
        }
    }
    output
}

/// Poll the owned child without moving it, so `stop` can still take over.
fn monitor_loop<H: DesktopHost>(manager: SharedManager<H>) {
    loop {
        let outcome = {
            let mut inner = manager.inner.lock().unwrap();
            let Some(child) = inner.child.as_mut() else {
                // stop() or terminate_generation took the process over.
                return;
            };
            match child.try_wait() {
                Ok(Some(status)) => {
                    let code = status.code();
                    inner.last_exit = code;
                    inner.child = None;
                    inner.stdin = None;
                    Some(code)
                }
                Ok(None) => None,
                Err(_) => {
                    inner.last_exit = None;
                    inner.child = None;
                    inner.stdin = None;
                    Some(None)
                }
            }
        };
        match outcome {
            None => std::thread::sleep(MONITOR_POLL),
            Some(exit_code) => {
                handle_child_exit(&manager, exit_code);
                return;
            }
        }
    }
}

fn handle_child_exit<H: DesktopHost>(manager: &SharedManager<H>, exit_code: Option<i32>) {
    manager.fail_pending("runtime exited");
    let (shutdown, corrupt) = {
        let mut inner = manager.inner.lock().unwrap();
        (inner.shutdown, inner.corrupt_reason.take())
    };
    if shutdown {
        // stop() owns the terminal state; nothing to restart.
        return;
    }
    let crashed = exit_code != Some(0) || corrupt.is_some();
    if !crashed {
        manager.set_inner_state(RuntimeState::Stopped);
        manager.emit_state(RuntimeState::Stopped, None);
        return;
    }
    let reason = corrupt.unwrap_or_else(|| format!("harness stopped unexpectedly (exit {exit_code:?})"));
    let now = Instant::now();
    let budget_exhausted = {
        let mut inner = manager.inner.lock().unwrap();
        inner.restart_times.retain(|time| now.duration_since(*time) < RESTART_WINDOW);
        if inner.restart_times.len() as u32 >= MAX_RESTARTS_PER_WINDOW {
            true
        } else {
            inner.restart_times.push(now);
            false
        }
    };
    if budget_exhausted {
        manager.set_inner_state(RuntimeState::Failed);
        manager.emit_state(RuntimeState::Failed, Some(format!("{reason}; restart budget exhausted")));
        return;
    }
    manager.emit_state(RuntimeState::Restarting, Some(reason));
    if let Err(error) = manager.host.auto_restart() {
        // A concurrent stop wins: do not surface a failure then.
        if !manager.inner.lock().unwrap().shutdown {
            manager.set_inner_state(RuntimeState::Failed);
            manager.emit_state(RuntimeState::Failed, Some(format!("automatic restart failed: {error}")));
        }
    }
}

pub fn keychain_get(reference: &str) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, reference)
        .map_err(|error| format!("keychain unavailable: {error}"))?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("keychain read failed: {error}")),
    }
}

pub fn keychain_set(reference: &str, value: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, reference)
        .map_err(|error| format!("keychain unavailable: {error}"))?;
    entry
        .set_password(value)
        .map_err(|error| format!("keychain write failed: {error}"))
}

pub fn keychain_delete(reference: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, reference)
        .map_err(|error| format!("keychain unavailable: {error}"))?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("keychain delete failed: {error}")),
    }
}

pub fn diagnostics_summary<H: DesktopHost>(manager: &RuntimeManager<H>, app: &AppHandle) -> String {
    let inner = manager.inner.lock().unwrap();
    let prefs = read_prefs(app);
    format!(
        "Desktop version: {}\nHarness version: {}\nDesktop protocol: {}\nmacOS version: {}\nArchitecture: {}\nRuntime state: {:?}\nRuntime generation: {}\nSigning status: {}\nApp bundle path: {}\nCurrent locale: {}\nCurrent theme: {}\nLast runtime exit: {:?}",
        env!("CARGO_PKG_VERSION"),
        HARNESS_VERSION,
        DESKTOP_PROTOCOL_VERSION,
        os_info::get().version(),
        std::env::consts::ARCH,
        inner.state,
        manager.generation(),
        signing_status(),
        bundle_path(app),
        prefs.get("language").cloned().unwrap_or_else(|| "system".into()),
        prefs.get("appearance").cloned().unwrap_or_else(|| "system".into()),
        inner.last_exit,
    )
}

fn read_prefs(app: &AppHandle) -> serde_json::Map<String, Value> {
    let path = app
        .path()
        .app_data_dir()
        .ok()
        .and_then(|dir| std::fs::read_to_string(dir.join("prefs.json")).ok());
    match path {
        Some(text) => serde_json::from_str::<Value>(&text)
            .ok()
            .and_then(|value| value.as_object().cloned())
            .unwrap_or_default(),
        None => serde_json::Map::new(),
    }
}

fn bundle_path(app: &AppHandle) -> String {
    app.path()
        .resource_dir()
        .map(|dir| {
            dir.parent()
                .and_then(std::path::Path::parent)
                .map(|bundle| bundle.to_string_lossy().to_string())
                .unwrap_or_else(|| dir.to_string_lossy().to_string())
        })
        .unwrap_or_else(|_| "unavailable".to_string())
}

/// Detectable signing state: the codesign authority chain, or ad-hoc/unsigned.
fn signing_status() -> String {
    let Ok(exe) = std::env::current_exe() else { return "unavailable".to_string() };
    let output = std::process::Command::new("/usr/bin/codesign")
        .args(["-dv", "--verbose=2"])
        .arg(&exe)
        .output();
    let Ok(output) = output else { return "unavailable".to_string() };
    let text = String::from_utf8_lossy(&output.stderr);
    let authorities: Vec<&str> = text
        .lines()
        .filter_map(|line| line.trim().strip_prefix("Authority="))
        .collect();
    if authorities.is_empty() {
        return "ad-hoc or unsigned".to_string()
    }
    format!("signed ({})", authorities.join(", "))
}

#[cfg(test)]
#[path = "manager_tests.rs"]
mod tests;
