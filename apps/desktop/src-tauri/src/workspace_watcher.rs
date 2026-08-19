/**
 * Native workspace change watcher: path-only invalidation for M5B live
 * synchronization. The watcher is deliberately non-authoritative: it emits
 * relative workspace paths that *may* have changed; content and FsVersion
 * always come from ctx.fs through the runtime. It exposes no filesystem
 * read or write surface, does not follow symlinks outside the workspace,
 * coalesces event bursts, and is generation-scoped: a restart or workspace
 * change drops the previous watcher before a new one starts, and every
 * emitted batch carries its generation so the frontend can ignore stale
 * events even if one races a teardown.
 */
use std::collections::BTreeSet;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;

/// Quiet window after the last raw event before a burst is flushed.
pub const COALESCE_MS: u64 = 100;
/// Flood guard: flush immediately once a burst reaches this many paths.
pub const MAX_BURST_PATHS: usize = 512;

/// One forwarded invalidation batch, tagged with the watcher's generation.
#[derive(Clone, Debug, Serialize)]
pub struct WorkspaceChanged {
    pub generation: u64,
    pub paths: Vec<String>,
    /// True when the flood cap truncated this batch: the frontend must treat
    /// every cached surface as potentially stale (invalidate-all).
    #[serde(default, skip_serializing_if = "not_full")]
    pub full: bool,
}

fn not_full(value: &bool) -> bool {
    !*value
}

/**
 * Pure policy over one OS event path: return the workspace-relative path to
 * invalidate, or None when the event must be dropped. Drops .git internals
 * (git churn), .DS_Store noise, and any path whose entry point escapes the
 * canonical workspace (symlink containment). notify does not follow
 * symlinks, so a link event reports the link path itself; the parent
 * canonicalization below keeps that entry visible while target changes stay
 * outside the workspace.
 */
pub fn classify(root: &Path, path: &Path) -> Option<String> {
    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    // FSEvents reports paths under the canonical root (for example
    // /private/var/folders while the caller watched /var/folders); match
    // against both the lexical and the canonical form.
    let rel = {
        let lexical = path
            .strip_prefix(root)
            .or_else(|_| path.strip_prefix(&canonical_root))
            .ok()
            .map(std::path::Path::to_path_buf);
        let canonical = path
            .canonicalize()
            .ok()
            .and_then(|canon| canon.strip_prefix(&canonical_root).ok().map(std::path::Path::to_path_buf));
        lexical.or(canonical)
    }?;
    if rel.as_os_str().is_empty() {
        return None;
    }
    let mut has_normal = false;
    for component in rel.components() {
        match component {
            Component::Normal(value) => {
                has_normal = true;
                let name = value.to_string_lossy();
                if name == ".git" || name == ".DS_Store" {
                    return None;
                }
            }
            _ => return None,
        }
    }
    if !has_normal {
        return None;
    }
    let parent = path.parent()?;
    let Ok(canonical_parent) = parent.canonicalize() else {
        // The path is already gone (delete cascade): lexical containment
        // under the watched root stands; the tree entry itself is valid.
        return Some(rel.to_string_lossy().into_owned());
    };
    if canonical_parent.starts_with(&canonical_root) {
        Some(rel.to_string_lossy().into_owned())
    } else {
        None
    }
}

/** Burst accumulator with quiet-window coalescing and a flood cap. */
struct BurstBuffer {
    paths: BTreeSet<String>,
    last_event: Option<Instant>,
}

impl BurstBuffer {
    fn new() -> Self {
        Self { paths: BTreeSet::new(), last_event: None }
    }

    /// Record one path; returns true when the flood cap is reached and the
    /// burst must flush now (the batch may then be partial).
    fn push(&mut self, path: String) -> bool {
        self.last_event = Some(Instant::now());
        self.paths.insert(path);
        self.paths.len() >= MAX_BURST_PATHS
    }

    fn quiet_elapsed(&self) -> bool {
        self.last_event
            .map(|at| at.elapsed() >= Duration::from_millis(COALESCE_MS))
            .unwrap_or(true)
    }

    fn drain(&mut self) -> Vec<String> {
        self.last_event = None;
        std::mem::take(&mut self.paths).into_iter().collect()
    }
}

/// Owned native watcher for one workspace and generation. Dropping the value
/// stops delivery and joins the worker, so teardown is synchronous.
pub struct WorkspaceWatcher {
    stop: Arc<AtomicBool>,
    join: Option<JoinHandle<()>>,
    watcher: Option<RecommendedWatcher>,
}

impl WorkspaceWatcher {
    /**
     * Start a recursive watcher on root for generation. Every coalesced
     * batch is delivered to emit from the worker thread. Failure to start
     * (unwatchable path, OS limit) is reported as Err; the manager treats
     * it as non-fatal and logs.
     */
    pub fn start<F>(root: PathBuf, generation: u64, emit: F) -> Result<Self, String>
    where
        F: Fn(WorkspaceChanged) + Send + Sync + 'static,
    {
        let (tx, rx): (Sender<notify::Result<notify::Event>>, _) = mpsc::channel();
        let mut watcher = RecommendedWatcher::new(
            move |result| { let _ = tx.send(result); },
            Config::default().with_compare_contents(false),
        )
        .map_err(|error| format!("notify watcher creation failed: {error}"))?;
        // Watch the canonical root so FSEvents-delivered paths share one
        // prefix with the workspace identity used by classification.
        let canonical_root = root
            .canonicalize()
            .map_err(|error| format!("workspace canonicalize failed: {error}"))?;
        watcher
            .watch(&canonical_root, RecursiveMode::Recursive)
            .map_err(|error| format!("cannot watch {}: {error}", canonical_root.display()))?;
        let stop = Arc::new(AtomicBool::new(false));
        let worker_stop = stop.clone();
        let worker_root = canonical_root.clone();
        let emit = Arc::new(emit);
        let join = thread::Builder::new()
            .name(format!("workspace-watcher-{generation}"))
            .spawn(move || {
                let mut burst = BurstBuffer::new();
                let mut truncated = false;
                loop {
                    if worker_stop.load(Ordering::SeqCst) {
                        flush(&emit, generation, &mut burst, truncated);
                        break;
                    }
                    match rx.recv_timeout(Duration::from_millis(COALESCE_MS)) {
                        Ok(Ok(event)) => {
                            for path in event.paths {
                                if let Some(rel) = classify(&worker_root, &path) {
                                    if burst.push(rel) {
                                        truncated = true;
                                        flush(&emit, generation, &mut burst, truncated);
                                        truncated = false;
                                    }
                                }
                            }
                        }
                        Ok(Err(_error)) => {
                            // A single notify error is transient (overflown
                            // event queue, watcher re-registration); the next
                            // burst still arrives.
                        }
                        Err(RecvTimeoutError::Timeout) => {
                            if burst.quiet_elapsed() && !burst.paths.is_empty() {
                                flush(&emit, generation, &mut burst, truncated);
                                truncated = false;
                            }
                        }
                        Err(RecvTimeoutError::Disconnected) => break,
                    }
                }
            })
            .map_err(|error| format!("watcher thread spawn failed: {error}"))?;
        Ok(Self { stop, join: Some(join), watcher: Some(watcher) })
    }

    /// Explicit teardown: stop delivery, drop the OS watcher, join the worker.
    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        self.watcher.take();
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

impl Drop for WorkspaceWatcher {
    fn drop(&mut self) {
        self.stop();
    }
}

fn flush<F>(emit: &Arc<F>, generation: u64, burst: &mut BurstBuffer, truncated: bool)
where
    F: Fn(WorkspaceChanged) + Send + Sync + 'static,
{
    let paths = burst.drain();
    if !paths.is_empty() {
        emit(WorkspaceChanged { generation, paths, full: truncated });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn classify_reports_nested_files() {
        let root = Path::new("/tmp/ws");
        assert_eq!(classify(root, Path::new("/tmp/ws/src/editor.ts")).as_deref(), Some("src/editor.ts"));
        assert_eq!(classify(root, Path::new("/tmp/ws/README.md")).as_deref(), Some("README.md"));
    }

    #[test]
    fn classify_ignores_git_internals_and_finder_noise() {
        let root = Path::new("/tmp/ws");
        assert_eq!(classify(root, Path::new("/tmp/ws/.git/objects/ab/cd")), None);
        assert_eq!(classify(root, Path::new("/tmp/ws/.git/index.lock")), None);
        assert_eq!(classify(root, Path::new("/tmp/ws/.DS_Store")), None);
        assert_eq!(classify(root, Path::new("/tmp/ws/.gitignore")), Some(".gitignore".into()));
        assert_eq!(classify(root, Path::new("/tmp/ws/src/.gitkeep")), Some("src/.gitkeep".into()));
    }

    #[test]
    fn classify_drops_outside_and_root_paths() {
        let root = Path::new("/tmp/ws");
        assert_eq!(classify(root, Path::new("/tmp/other/file.ts")), None);
        assert_eq!(classify(root, Path::new("/tmp/ws")), None);
        assert_eq!(classify(root, Path::new("/tmp/ws2/file.ts")), None);
    }

    #[test]
    fn classify_contains_symlink_entries() {
        let dir = tempdir();
        let root = dir.join("ws");
        fs::create_dir_all(root.join("src")).unwrap();
        let outside = dir.join("outside");
        fs::create_dir_all(&outside).unwrap();
        std::os::unix::fs::symlink(&outside, root.join("src/linked")).unwrap();
        // The link path itself lives in the workspace and stays visible.
        assert_eq!(classify(&root, &root.join("src/linked")).as_deref(), Some("src/linked"));
        assert_eq!(classify(&root, Path::new("/tmp/ws/../../etc/passwd")), None);
    }

    #[test]
    fn burst_buffer_coalesces_and_caps() {
        let mut burst = BurstBuffer::new();
        assert!(!burst.push("a".into()));
        assert!(!burst.push("b".into()));
        let mut drained = burst.drain();
        drained.sort();
        assert_eq!(drained, vec!["a", "b"]);
        for index in 0..MAX_BURST_PATHS {
            let full = burst.push(format!("p{index}"));
            if index == MAX_BURST_PATHS - 1 {
                assert!(full, "flood cap must flush on the final push");
            }
        }
    }

    #[test]
    fn watcher_delivers_real_filesystem_events() {
        let dir = tempdir();
        let root = dir.join("ws");
        fs::create_dir_all(&root).unwrap();
        let (tx, rx) = mpsc::channel();
        let watcher = WorkspaceWatcher::start(
            root.clone(),
            7,
            move |changed| { let _ = tx.send(changed); },
        )
        .expect("watcher starts");
        fs::write(root.join("hello.txt"), "hi").unwrap();
        // FSEvents delivery is asynchronous; bounded wait instead of sleep.
        let deadline = Instant::now() + Duration::from_secs(5);
        let mut saw = false;
        while Instant::now() < deadline {
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(changed) => {
                    if changed.generation == 7 && changed.paths.iter().any(|path| path == "hello.txt") {
                        saw = true;
                        break;
                    }
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
        drop(watcher);
        assert!(saw, "watcher must report the created file");
    }

    static NEXT_WATCH_DIR: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

    /// Unique per call: parallel tests must never share one temp path.
    fn tempdir() -> PathBuf {
        let seq = NEXT_WATCH_DIR.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let base = std::env::temp_dir().join(format!("dsh-watch-test-{}-{seq}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();
        base
    }
}
