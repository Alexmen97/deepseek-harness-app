/// Append one structured WebView error (window.onerror / unhandledrejection)
/// to the same bounded desktop log, with the full stack for diagnosis.
#[tauri::command]
pub fn web_error(app: tauri::AppHandle, kind: String, message: String, stack: String) -> Result<(), String> {
    use std::io::Write;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("logs");
    let mut file = manager::open_log(&dir).map_err(|error| error.to_string())?;
    writeln!(file, "[web:{kind}] {message}\n{stack}").map_err(|error| error.to_string())
}

/**
 * The minimal host surface the WebView may invoke. No generic exec, shell,
 * readFile, writeFile, or spawn primitive exists: agent command execution
 * stays inside the Harness subprocess/sandbox pipeline.
 */

use serde_json::{json, Value};
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use tauri::{Manager, State};

use crate::manager::{self, RuntimeManager, RuntimeState};

/// Managed holder for the resolved application language (menu and About window).
pub struct LanguageState(pub std::sync::Mutex<String>);

/// The seven application languages the native surfaces serve.
pub const MENU_LANGUAGES: [&str; 7] = ["en", "zh", "it", "es", "fr", "de", "pt-BR"];

/// Workspace-scoped caps for the M4 inspector surface.
const FS_LIST_MAX_ENTRIES: usize = 500;
const FS_READ_MAX_BYTES: usize = 512 * 1024;
const GIT_DIFF_MAX_BYTES: usize = 512 * 1024;

/// Upstream attachment-local defaults mirrored by the native picker
/// (packages/attachment/attachment-local/src/index.ts).
const ATTACHMENT_MAX_IMAGE_BYTES: usize = 5 * 1024 * 1024;

/// Serialize the current lifecycle state and generation.
#[derive(serde::Serialize)]
pub struct RuntimeStatus {
    pub state: RuntimeState,
    pub generation: u64,
    pub last_exit: Option<i32>,
}

#[tauri::command]
pub fn runtime_start(manager: State<'_, RuntimeManager>) -> Result<(), String> {
    manager.start()
}

#[tauri::command]
pub fn runtime_restart(manager: State<'_, RuntimeManager>) -> Result<(), String> {
    manager.restart()
}

#[tauri::command]
pub fn runtime_stop(manager: State<'_, RuntimeManager>) -> Result<(), String> {
    manager.stop()
}

#[tauri::command]
pub fn runtime_status(manager: State<'_, RuntimeManager>) -> RuntimeStatus {
    RuntimeStatus {
        state: manager.state(),
        generation: manager.generation(),
        last_exit: manager.last_exit(),
    }
}

/// One unary JSON-RPC round trip over the runtime's stdio.
#[tauri::command]
pub fn rpc_request(
    manager: State<'_, RuntimeManager>,
    request_id: String,
    generation: u64,
    method: String,
    rpc_id: String,
    payload: Value,
) -> Result<Value, String> {
    manager.request(request_id, generation, method, rpc_id, payload)
}

/// Append one desktop log line (the same bounded store as runtime stderr).
#[tauri::command]
pub fn log_line(app: tauri::AppHandle, line: String) -> Result<(), String> {
    use std::io::Write;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("logs");
    let mut file = manager::open_log(&dir).map_err(|error| error.to_string())?;
    writeln!(file, "{line}").map_err(|error| error.to_string())
}



/// Native macOS directory picker; cancellation answers null, never an error.
#[tauri::command]
pub fn pick_workspace() -> Result<Option<String>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Choose a project folder")
        .pick_folder();
    Ok(picked.map(|path| path.to_string_lossy().to_string()))
}

/// One user-selected image: the content of the explicitly chosen resource.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedAttachment {
    pub name: String,
    pub media_type: String,
    pub data: String,
}

/// Native image picker for the composer attachment flow. Returns the bytes
/// of the explicitly selected files only — there is no general filesystem
/// read command on the desktop surface.
#[tauri::command]
pub fn pick_attachments() -> Result<Vec<PickedAttachment>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Choose images to attach")
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "gif"])
        .pick_files();
    let Some(paths) = picked else { return Ok(Vec::new()) };
    let mut attachments = Vec::new();
    for path in paths {
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_lowercase();
        let media_type = match extension.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => return Err(format!("unsupported image type: {}", path.display())),
        };
        let bytes = std::fs::read(&path)
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
        if bytes.len() > ATTACHMENT_MAX_IMAGE_BYTES {
            return Err(format!("{} exceeds the 5 MiB image limit", path.display()));
        }
        use base64::Engine as _;
        attachments.push(PickedAttachment {
            name: path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_else(|| "image".to_string()),
            media_type: media_type.to_string(),
            data: base64::engine::general_purpose::STANDARD.encode(&bytes),
        });
    }
    Ok(attachments)
}

/// Configured state of one credential reference; never the value.
#[tauri::command]
pub fn credential_status(reference: String) -> Result<Value, String> {
    let stored = manager::keychain_get(&reference)?;
    Ok(json!({
        "configured": stored.is_some(),
        "source": stored.as_ref().map(|_value| "keychain"),
    }))
}

/// Store one credential in the macOS Keychain.
#[tauri::command]
pub fn credential_set(reference: String, value: String) -> Result<(), String> {
    if value.is_empty() {
        return Err("credential value must be non-empty".into());
    }
    manager::keychain_set(&reference, &value)
}

/// Delete one credential from the macOS Keychain.
#[tauri::command]
pub fn credential_delete(reference: String) -> Result<(), String> {
    manager::keychain_delete(&reference)
}

/// Reveal the runtime log location in Finder.
#[tauri::command]
pub fn open_logs(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app data dir unavailable: {error}"))?
        .join("logs");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    open_in_system(&dir.to_string_lossy())
}

/// Open one external URL in the system browser.
#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("only http(s) URLs may be opened".into());
    }
    open_in_system(&url)
}

/// Read one desktop preference (window state, selected workspace/session).
#[tauri::command]
pub fn prefs_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let path = prefs_path(&app)?;
    let text = std::fs::read_to_string(&path).unwrap_or_default();
    let prefs: Value = if text.trim().is_empty() {
        Value::Object(Default::default())
    } else {
        serde_json::from_str(&text).map_err(|error| error.to_string())?
    };
    Ok(prefs
        .get(&key)
        .and_then(Value::as_str)
        .map(String::from))
}

/// Write one desktop preference.
#[tauri::command]
pub fn prefs_set(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let path = prefs_path(&app)?;
    let text = std::fs::read_to_string(&path).unwrap_or_default();
    let mut prefs: Value = if text.trim().is_empty() {
        Value::Object(Default::default())
    } else {
        serde_json::from_str(&text).map_err(|error| error.to_string())?
    };
    prefs[key] = Value::String(value);
    let serialized = serde_json::to_string_pretty(&prefs).map_err(|error| error.to_string())?;
    std::fs::write(&path, serialized).map_err(|error| error.to_string())
}

/// Redacted diagnostics summary (no environment dump, no secrets).
#[tauri::command]
pub fn diagnostics(manager: State<'_, RuntimeManager>, app: tauri::AppHandle) -> String {
    manager::diagnostics_summary(&manager, &app)
}

/// Rebuild the native menu with the resolved desktop language (one of the seven).
#[tauri::command]
pub fn menu_set_language(app: tauri::AppHandle, state: State<'_, LanguageState>, language: String) -> Result<(), String> {
    if !MENU_LANGUAGES.contains(&language.as_str()) {
        return Err(format!("unsupported menu language {language:?}"));
    }
    let menu = crate::menu::build_menu(&app, &language).map_err(|error| error.to_string())?;
    app.set_menu(menu).map_err(|error| error.to_string())?;
    if let Ok(mut current) = state.0.lock() {
        *current = language;
    }
    Ok(())
}

/// Versions and identity for the About window (single source of truth).
#[derive(serde::Serialize)]
pub struct AboutInfo {
    pub desktop_version: String,
    pub harness_version: String,
    pub protocol_version: u32,
    pub architecture: String,
    pub git: Option<String>,
    pub language: String,
}

#[tauri::command]
pub fn about_info(state: State<'_, LanguageState>) -> AboutInfo {
    let language = state.0.lock().map(|current| current.clone()).unwrap_or_else(|_| "en".to_string());
    AboutInfo {
        desktop_version: env!("CARGO_PKG_VERSION").to_string(),
        harness_version: manager::HARNESS_VERSION.to_string(),
        protocol_version: manager::DESKTOP_PROTOCOL_VERSION,
        architecture: std::env::consts::ARCH.to_string(),
        git: option_env!("DSH_DESKTOP_GIT").map(String::from),
        language,
    }
}

/// Open (or focus) the About window, with the same navigation policy as the main window.
pub fn open_about_window<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.set_focus();
        return Ok(());
    }
    let development = cfg!(dev);
    tauri::WebviewWindowBuilder::new(&app, "about", tauri::WebviewUrl::App("about.html".into()))
        .title("About Harness Desktop")
        .inner_size(400.0, 470.0)
        .resizable(false)
        .minimizable(false)
        .maximizable(false)
        .background_color(tauri::window::Color(246, 246, 248, 255))
        .on_navigation(move |url| {
            match crate::navigation::navigation_action(url, development) {
                crate::navigation::NavigationAction::Allow => true,
                crate::navigation::NavigationAction::OpenExternally => {
                    let _ = open_in_system(url.as_str());
                    false
                }
                crate::navigation::NavigationAction::Deny => false,
            }
        })
        .on_new_window(move |url, _features| {
            if crate::navigation::navigation_action(&url, development) == crate::navigation::NavigationAction::OpenExternally {
                let _ = open_in_system(url.as_str());
            }
            tauri::webview::NewWindowResponse::Deny
        })
        .build()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn prefs_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app data dir unavailable: {error}"))?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("prefs.json"))
}

/// Resolve the pinned workspace root from preferences; fail without one.
fn workspace_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let raw = std::fs::read_to_string(prefs_path(app)?).unwrap_or_default();
    let value: Value = if raw.trim().is_empty() {
        Value::Object(serde_json::Map::new())
    } else {
        serde_json::from_str(&raw).map_err(|error| format!("prefs parse failed: {error}"))?
    };
    let root = value
        .get("workspace")
        .and_then(Value::as_str)
        .ok_or("no workspace selected")?;
    let path = PathBuf::from(root);
    if !path.is_absolute() || !path.is_dir() {
        return Err(format!("workspace is unavailable: {}", path.display()));
    }
    path.canonicalize().map_err(|error| format!("workspace resolve failed: {error}"))
}

/// Contain one workspace-relative path: no absolute input, no parent escape,
/// and no symlink target outside the canonical root.
fn contained_path(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|error| format!("workspace resolve failed: {error}"))?;
    if rel.is_empty() {
        return Ok(root);
    }
    if rel.starts_with('/') || rel.contains('\\') || rel.contains(':') {
        return Err("invalid relative path".into());
    }
    let mut base = root.to_path_buf();
    for component in Path::new(rel).components() {
        match component {
            Component::Normal(part) => base.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("path escapes the workspace".into())
            }
        }
    }
    let canonical = base.canonicalize().map_err(|error| format!("path unavailable: {error}"))?;
    if !canonical.starts_with(&root) {
        return Err("path escapes the workspace".into());
    }
    Ok(canonical)
}

/// One directory entry for the M4 file explorer (names and kinds only).
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

/// List one directory level under the workspace (bounded, sorted dirs-first).
#[tauri::command]
pub fn fs_list(app: tauri::AppHandle, path: String) -> Result<Vec<FsEntry>, String> {
    let root = workspace_root(&app)?;
    list_dir(&root, &path)
}

/// Directory listing body, separated from the workspace lookup for tests.
fn list_dir(root: &Path, path: &str) -> Result<Vec<FsEntry>, String> {
    let target = contained_path(root, path)?;
    let mut entries = Vec::new();
    let mut seen = 0usize;
    for item in std::fs::read_dir(&target).map_err(|error| format!("cannot list directory: {error}"))? {
        let item = item.map_err(|error| format!("cannot read entry: {error}"))?;
        seen += 1;
        if seen > FS_LIST_MAX_ENTRIES {
            return Err(format!("directory exceeds the {FS_LIST_MAX_ENTRIES}-entry limit"));
        }
        let name = item.file_name().to_string_lossy().to_string();
        if name == ".git" { continue }
        let is_dir = item.file_type().map(|kind| kind.is_dir()).unwrap_or(false);
        let rel = if path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), name)
        };
        entries.push(FsEntry { name, path: rel, is_dir });
    }
    entries.sort_by(|left, right| {
        right.is_dir.cmp(&left.is_dir).then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(entries)
}

/// Read one workspace file as a size-capped UTF-8 text preview.
#[tauri::command]
pub fn fs_read_text(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let root = workspace_root(&app)?;
    read_text_file(&root, &path)
}

/// Text preview body, separated from the workspace lookup for tests.
fn read_text_file(root: &Path, path: &str) -> Result<String, String> {
    let target = contained_path(root, path)?;
    let metadata = std::fs::metadata(&target).map_err(|error| format!("cannot stat file: {error}"))?;
    if metadata.is_dir() {
        return Err("expected a file, got a directory".into());
    }
    if metadata.len() > FS_READ_MAX_BYTES as u64 {
        return Err(format!("file exceeds the {}-byte preview limit", FS_READ_MAX_BYTES));
    }
    let bytes = std::fs::read(&target).map_err(|error| format!("cannot read file: {error}"))?;
    if bytes.iter().take(8192).any(|byte| *byte == 0) {
        return Err("binary files cannot be previewed".into());
    }
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

/// Reveal one workspace file or directory in Finder (narrow reveal-only).
#[tauri::command]
pub fn reveal_in_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let root = workspace_root(&app)?;
    let target = contained_path(&root, &path)?;
    let status = Command::new("open")
        .args(["-R", target.to_string_lossy().as_ref()])
        .status()
        .map_err(|error| format!("cannot reveal path: {error}"))?;
    if !status.success() {
        return Err(format!("reveal failed with status {status}"));
    }
    Ok(())
}

/// Structured read-only git status for the workspace.
#[tauri::command]
pub fn git_status(app: tauri::AppHandle) -> Result<Value, String> {
    let root = workspace_root(&app)?;
    git_status_at(&root)
}

/// Structured read-only git status (porcelain v2 model) for the workspace.
#[tauri::command]
pub fn git_status_v2(app: tauri::AppHandle) -> Result<Value, String> {
    let root = workspace_root(&app)?;
    git_status_v2_at(&root)
}

/// Git status body over an explicit root for tests (M5C v2 model).
///
/// The workspace root is the resolution base; repository discovery is
/// delegated to git itself (rev-parse --show-toplevel) and every path is
/// returned exactly as git reports it, including paths outside the
/// workspace when the workspace is a subdirectory of a larger repository.
/// Callers that mutate paths must still validate each path through
/// contained_path() against the workspace root (see the M5C security
/// model); this read-only status never enumerates anything outside the
/// repository the workspace belongs to.
fn git_status_v2_at(root: &Path) -> Result<Value, String> {
    let inside = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "rev-parse", "--is-inside-work-tree"])
        .output();
    match inside {
        Err(_) => return Ok(json!({ "repository": false, "reason": "git-not-found" })),
        Ok(output) if !output.status.success() => return Ok(json!({ "repository": false, "reason": "no-repository" })),
        Ok(_) => {}
    }
    let porcelain = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "status", "--porcelain=v2", "-z"])
        .output()
        .map_err(|error| format!("git status failed: {error}"))?;
    if !porcelain.status.success() {
        return Err("git status failed".into());
    }
    let branch = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string());
    let text = String::from_utf8_lossy(&porcelain.stdout);
    // Porcelain v2 records are NUL-terminated and never C-quoted (the -z
    // contract), so a path is the remainder after the fixed header token
    // count and may contain spaces verbatim. A rename/copy entry ('2')
    // emits the original path as its own NUL-delimited chunk immediately
    // after the record; the parse consumes it on the next iteration.
    let mut files: Vec<Value> = Vec::new();
    let mut pending_rename_original: Option<String> = None;
    for entry in text.split('\0') {
        if entry.is_empty() {
            continue;
        }
        if let Some(original) = pending_rename_original.take() {
            // Next chunk after a '2' record: the original path. A chunk
            // that itself opens a new record is not consumed.
            let looks_like_record = ["1 ", "2 ", "u ", "? "]
                .iter()
                .any(|prefix| entry.starts_with(prefix));
            if looks_like_record {
                pending_rename_original = Some(original);
            } else if let Some(last) = files.last_mut() {
                last["originalPath"] = json!(entry);
            }
            continue;
        }
        let record = entry
            .strip_prefix("1 ")
            .or_else(|| entry.strip_prefix("2 "))
            .or_else(|| entry.strip_prefix("u "));
        if let Some(rest) = record {
            // 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
            // 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>
            // u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>
            let mut parts = rest.split_whitespace();
            let Some(xy) = parts.next() else { continue };
            let is_rename = entry.starts_with("2 ");
            let is_conflict = entry.starts_with("u ");
            // Consume the remaining header tokens: 6 more for '1'/'2'
            // (sub, mH, mI, mW, hH, hI), 8 more for 'u' (sub, m1, m2, m3,
            // mW, h1, h2, h3), then the rename score token for '2'.
            let header_tokens = if is_conflict { 8 } else { 6 };
            let mut consumed = 0;
            while consumed < header_tokens {
                match parts.next() {
                    Some(_) => consumed += 1,
                    None => break,
                }
            }
            if consumed < header_tokens {
                continue;
            }
            if is_rename {
                parts.next(); // <X><score>
            }
            let path = parts.collect::<Vec<_>>().join(" ");
            if path.is_empty() {
                continue;
            }
            files.push(json!({
                "path": path,
                "status": xy,
                "originalPath": "",
                "conflicted": is_conflict,
            }));
            if is_rename {
                pending_rename_original = Some(String::new());
            }
        } else if let Some(path) = entry.strip_prefix("? ") {
            if !path.is_empty() {
                files.push(json!({
                    "path": path.to_string(),
                    "status": "??",
                    "originalPath": "",
                    "conflicted": false,
                }));
            }
        }
    }
    let dirty = !files.is_empty();
    // The workspace-relative prefix inside the repository root: porcelain
    // v2 reports paths relative to the repository root, while the desktop
    // UI may only mutate paths inside the selected workspace. The frontend
    // strips this prefix to derive the workspace-visible path of each row.
    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    let workspace_prefix = match repo_root_for(root) {
        Ok(repo) => canonical_root
            .strip_prefix(&repo)
            .map(|suffix| suffix.components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/"))
            .unwrap_or_default(),
        Err(_) => String::new(),
    };
    Ok(json!({ "repository": true, "branch": branch, "dirty": dirty, "changedFiles": files.len(), "files": files, "workspacePrefix": workspace_prefix }))
}


/// Typed error for the M5C.2 git mutation commands. The `code` is a stable
/// category the frontend renders without parsing raw git stderr; `detail`
/// carries sanitized technical output only.
#[derive(Debug, serde::Serialize)]
pub struct GitError {
    pub code: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

impl GitError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        GitError { code, message: message.into(), detail: None }
    }

    fn with_detail(code: &'static str, message: impl Into<String>, detail: impl Into<String>) -> Self {
        GitError { code, message: message.into(), detail: Some(detail.into()) }
    }

    fn git_not_found() -> Self {
        GitError::new("GIT_NOT_FOUND", "git is not available on this system")
    }

    fn not_git() -> Self {
        GitError::new("NOT_GIT_REPOSITORY", "the workspace is not inside a git repository")
    }

    fn outside_workspace() -> Self {
        GitError::new("PATH_OUTSIDE_WORKSPACE", "the path is outside the selected workspace")
    }

    fn path_unavailable() -> Self {
        GitError::new("PATH_NOT_FOUND", "the path is not available in the workspace")
    }

    fn unsupported_state() -> Self {
        GitError::new("UNSUPPORTED_GIT_STATE", "git does not allow this operation in the current state")
    }

    fn operation_failed(stderr: &[u8]) -> Self {
        let raw = String::from_utf8_lossy(stderr);
        let detail: String = raw.trim().chars().take(500).collect();
        GitError::with_detail(
            "GIT_OPERATION_FAILED",
            "the git operation failed",
            if detail.is_empty() { "git exited with an error".to_string() } else { detail },
        )
    }

    fn workspace(message: String) -> Self {
        GitError::new("WORKSPACE_UNAVAILABLE", message)
    }
}

/// One fixed-argv git invocation from the workspace root; never a shell.
fn git_run(root: &Path, args: &[&str]) -> Result<std::process::Output, GitError> {
    Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref()])
        .args(args)
        .output()
        .map_err(|_| GitError::git_not_found())
}

/// The canonical repository root above (or equal to) the workspace root.
fn repo_root_for(workspace: &Path) -> Result<PathBuf, GitError> {
    let output = git_run(workspace, &["rev-parse", "--show-toplevel"])?;
    if !output.status.success() {
        return Err(GitError::not_git());
    }
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() {
        return Err(GitError::not_git());
    }
    PathBuf::from(raw).canonicalize().map_err(|error| GitError::new("PATH_NOT_FOUND", format!("cannot resolve the repository root: {error}")))
}

/// Canonical containment for git mutation paths.
///
/// `contained_path` requires the target to exist (it canonicalizes the full
/// path), but git mutations legitimately target files that do not exist on
/// disk (staging a deletion). This variant canonicalizes the longest
/// existing prefix, verifies it stays inside the workspace root, and then
/// re-appends the missing tail with plain components. The same input rules
/// apply: no absolute paths, no parent escapes, no backslashes/colons, and
/// a symlink resolving outside the root is rejected by the prefix check.
fn contained_git_path(root: &Path, rel: &str) -> Result<PathBuf, GitError> {
    let root = root.canonicalize().map_err(|error| GitError::new("PATH_NOT_FOUND", format!("workspace resolve failed: {error}")))?;
    if rel.is_empty() {
        return Ok(root);
    }
    if rel.starts_with('/') || rel.contains('\\') || rel.contains(':') {
        return Err(GitError::outside_workspace());
    }
    let mut composed = root.clone();
    for component in Path::new(rel).components() {
        match component {
            Component::Normal(part) => composed.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(GitError::outside_workspace());
            }
        }
    }
    // Canonicalize the longest existing prefix, collecting the missing tail.
    let mut tail: Vec<std::ffi::OsString> = Vec::new();
    let mut current: &Path = composed.as_path();
    let probe = loop {
        match current.canonicalize() {
            Ok(canonical) => break canonical,
            Err(_) => {
                let Some(name) = current.file_name() else {
                    return Err(GitError::path_unavailable());
                };
                tail.push(name.to_os_string());
                let Some(parent) = current.parent() else {
                    return Err(GitError::path_unavailable());
                };
                current = parent;
            }
        }
    };
    if !probe.starts_with(&root) {
        return Err(GitError::outside_workspace());
    }
    let mut resolved = probe;
    for name in tail.iter().rev() {
        resolved.push(name);
    }
    Ok(resolved)
}

/// Whether the porcelain v2 status currently reports the path as conflicted.
/// Guard for the mutation commands: `git add` on a conflicted path would
/// stage a resolution, which M5C.2 deliberately never does.
fn is_conflicted(workspace: &Path, repo_rel: &str) -> Result<bool, GitError> {
    let output = git_run(workspace, &["status", "--porcelain=v2", "-z"])?;
    if !output.status.success() {
        return Err(GitError::operation_failed(&output.stderr));
    }
    let target_str = repo_rel;
    for entry in String::from_utf8_lossy(&output.stdout).split('\0') {
        if let Some(rest) = entry.strip_prefix("u ") {
            let mut parts = rest.split_whitespace();
            let _xy = parts.next();
            let mut consumed = 0;
            while consumed < 8 {
                match parts.next() {
                    Some(_) => consumed += 1,
                    None => break,
                }
            }
            let path = parts.collect::<Vec<_>>().join(" ");
            if path == target_str {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

/// Stage one workspace-relative path: `git add -A -- <path>`.
///
/// `-A` is required so a deleted worktree file stages its deletion (`git
/// add -- <path>` refuses a missing path); for every other state it is
/// identical to `git add -- <path>`. The argv stays fixed, the `--` is
/// mandatory, and the path is the canonical absolute target after
/// containment validation.
/// Convert one repository-relative path (the porcelain v2 model) to the
/// workspace-visible relative path. Paths outside the selected workspace
/// are rejected before any containment check: the desktop UI may only
/// mutate paths inside the workspace, even when the repository root is
/// above it. This is the single conversion layer for git mutation paths.
fn workspace_rel_for(workspace: &Path, repo_rel: &str) -> Result<String, GitError> {
    // Both sides must be canonical: git's --show-toplevel resolves symlinks
    // (e.g. /var -> /private/var on macOS), so the workspace must match.
    let workspace = workspace
        .canonicalize()
        .map_err(|error| GitError::new("PATH_NOT_FOUND", format!("workspace resolve failed: {error}")))?;
    let repo = repo_root_for(&workspace)?;
    let prefix = workspace
        .strip_prefix(&repo)
        .map(|suffix| suffix.components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/"))
        .unwrap_or_default();
    if prefix.is_empty() {
        return Ok(repo_rel.to_string());
    }
    let with_sep = format!("{prefix}/");
    if let Some(rest) = repo_rel.strip_prefix(&with_sep) {
        if !rest.is_empty() {
            return Ok(rest.to_string());
        }
    }
    Err(GitError::outside_workspace())
}

fn git_stage_at(workspace: &Path, repo_rel: &str) -> Result<(), GitError> {
    if is_conflicted(workspace, repo_rel)? {
        return Err(GitError::unsupported_state());
    }
    let rel = workspace_rel_for(workspace, repo_rel)?;
    // Canonical containment validation only: git resolves the pathspec
    // against the working directory (-C workspace), so the argv carries
    // the workspace-relative path, never an absolute one.
    contained_git_path(workspace, &rel)?;
    let output = git_run(workspace, &["add", "-A", "--", rel.as_str()])?;
    if !output.status.success() {
        return Err(GitError::operation_failed(&output.stderr));
    }
    Ok(())
}

/// Unstage one workspace-relative path.
///
/// With a HEAD: `git restore --staged -- <path>` (git >= 2.23). In an
/// unborn repository (no HEAD, detected with `git rev-parse --verify
/// --quiet HEAD`) the index-only fallback is `git rm -q --cached -- <path>`,
/// which returns an added file to the untracked state. The worktree is
/// never touched and never recreated.
fn git_unstage_at(workspace: &Path, repo_rel: &str) -> Result<(), GitError> {
    if is_conflicted(workspace, repo_rel)? {
        return Err(GitError::unsupported_state());
    }
    let rel = workspace_rel_for(workspace, repo_rel)?;
    contained_git_path(workspace, &rel)?;
    let head = git_run(workspace, &["rev-parse", "--verify", "--quiet", "HEAD"])?;
    if !head.status.success() {
        // Unborn repository: `git restore --staged` has no HEAD to restore
        // against; the index-only removal is the documented fallback.
        let removed = git_run(workspace, &["rm", "-q", "--cached", "--", rel.as_str()])?;
        if !removed.status.success() {
            return Err(GitError::operation_failed(&removed.stderr));
        }
        return Ok(());
    }
    let restored = git_run(workspace, &["restore", "--staged", "--", rel.as_str()])?;
    if !restored.status.success() {
        return Err(GitError::operation_failed(&restored.stderr));
    }
    Ok(())
}

/// Stage one workspace file through the narrow Tauri host capability.
#[tauri::command]
pub fn git_stage_file(app: tauri::AppHandle, path: String) -> Result<(), GitError> {
    let root = workspace_root(&app).map_err(GitError::workspace)?;
    git_stage_at(&root, &path)
}

/// Unstage one workspace file through the narrow Tauri host capability.
#[tauri::command]
pub fn git_unstage_file(app: tauri::AppHandle, path: String) -> Result<(), GitError> {
    let root = workspace_root(&app).map_err(GitError::workspace)?;
    git_unstage_at(&root, &path)
}


/// Git status body over an explicit root for tests.
fn git_status_at(root: &Path) -> Result<Value, String> {
    let inside = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "rev-parse", "--is-inside-work-tree"])
        .output();
    match inside {
        Err(_) => return Ok(json!({ "repository": false, "reason": "git-not-found" })),
        Ok(output) if !output.status.success() => return Ok(json!({ "repository": false, "reason": "no-repository" })),
        Ok(_) => {}
    }
    let porcelain = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "status", "--porcelain=v1"])
        .output()
        .map_err(|error| format!("git status failed: {error}"))?;
    if !porcelain.status.success() {
        return Err("git status failed".into());
    }
    let branch = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string());
    let text = String::from_utf8_lossy(&porcelain.stdout);
    let mut files = Vec::new();
    for line in text.lines() {
        if line.len() < 4 { continue }
        let status_code = line[..2].trim();
        let file_path = line[3..].trim().to_string();
        if file_path.is_empty() { continue }
        files.push(json!({ "path": file_path, "status": status_code }));
    }
    let dirty = !files.is_empty();
    Ok(json!({ "repository": true, "branch": branch, "dirty": dirty, "changedFiles": files.len(), "files": files }))
}

/// Read-only unified diff for tracked changes plus the untracked path list.
#[tauri::command]
pub fn git_diff(app: tauri::AppHandle) -> Result<Value, String> {
    let root = workspace_root(&app)?;
    git_diff_at(&root)
}

/// Git diff body over an explicit root for tests.
fn git_diff_at(root: &Path) -> Result<Value, String> {
    let inside = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "rev-parse", "--is-inside-work-tree"])
        .output();
    match inside {
        Err(_) => return Ok(json!({ "repository": false, "reason": "git-not-found" })),
        Ok(output) if !output.status.success() => return Ok(json!({ "repository": false, "reason": "no-repository" })),
        Ok(_) => {}
    }
    let diff = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "diff", "--no-color", "--no-ext-diff"])
        .output()
        .map_err(|error| format!("git diff failed: {error}"))?;
    if !diff.status.success() {
        return Err("git diff failed".into());
    }
    let diff_text = String::from_utf8_lossy(&diff.stdout);
    if diff_text.len() > GIT_DIFF_MAX_BYTES {
        return Err(format!("diff exceeds the {}-byte limit", GIT_DIFF_MAX_BYTES));
    }
    let porcelain = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "status", "--porcelain=v1"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).to_string())
        .unwrap_or_default();
    let untracked: Vec<&str> = porcelain
        .lines()
        .filter(|line| line.starts_with("?? "))
        .filter_map(|line| line.get(3..).map(str::trim))
        .collect();
    Ok(json!({ "repository": true, "diff": diff_text, "untracked": untracked }))
}

/// Arm or disarm the unsaved-changes quit guard (frontend keeps it in sync
/// with dirty editor buffers).
#[tauri::command]
pub fn quit_guard_arm(manager: State<'_, RuntimeManager>, armed: bool) -> Result<(), String> {
    manager.set_quit_guard(armed);
    Ok(())
}

/// Final quit after the frontend resolved unsaved changes; the normal
/// RunEvent::Exit path then stops the runtime (no orphan).
#[tauri::command]
pub fn quit_now(manager: State<'_, RuntimeManager>) -> Result<(), String> {
    manager.request_quit();
    Ok(())
}

/// Cap for the non-git Quick Open index walk; larger trees fail loudly.
const MAX_INDEX_FILES: usize = 200_000;

/// Workspace file index for Quick Open. Inside a git repository the listing
/// is 'git ls-files --cached --others --exclude-standard' (NUL-separated,
/// honors .gitignore, fixed argv, no shell); outside git it is a bounded
/// directory walk that skips .git/.DS_Store and does not descend into
/// symlinked directories. Runs on the blocking pool so a huge tree never
/// stalls the IPC thread; the frontend discards stale results.
#[tauri::command]
pub async fn workspace_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let root = workspace_root(&app)?;
    tauri::async_runtime::spawn_blocking(move || workspace_files_at(&root))
        .await
        .map_err(|error| format!("workspace index task failed: {error}"))?
}

/// Workspace index body over an explicit root for tests.
fn workspace_files_at(root: &Path) -> Result<Vec<String>, String> {
    let inside = Command::new("git")
        .args(["-C", root.to_string_lossy().as_ref(), "rev-parse", "--is-inside-work-tree"])
        .output();
    let mut files = match inside {
        Err(_) => Vec::new(),
        Ok(output) if output.status.success() => {
            let listed = Command::new("git")
                .args(["-C", root.to_string_lossy().as_ref(), "ls-files", "-z", "--cached", "--others", "--exclude-standard"])
                .output()
                .map_err(|error| format!("git ls-files failed: {error}"))?;
            if !listed.status.success() {
                return Err("git ls-files failed".into());
            }
            let mut listed_files = Vec::new();
            for part in listed.stdout.split(|byte| *byte == 0) {
                if part.is_empty() {
                    continue;
                }
                listed_files.push(String::from_utf8_lossy(part).into_owned());
            }
            listed_files
        }
        Ok(_) => Vec::new(),
    };
    if !files.is_empty() {
        files.sort();
        return Ok(files);
    }
    walk_index(root, root, &mut files)?;
    files.sort();
    Ok(files)
}

/// Bounded recursive walk collecting workspace-relative file paths.
fn walk_index(root: &Path, dir: &Path, files: &mut Vec<String>) -> Result<(), String> {
    for item in std::fs::read_dir(dir).map_err(|error| format!("cannot read directory: {error}"))? {
        let item = item.map_err(|error| format!("cannot read entry: {error}"))?;
        let name = item.file_name().to_string_lossy().into_owned();
        if name == ".git" || name == ".DS_Store" {
            continue;
        }
        let kind = item.file_type().map_err(|error| format!("cannot inspect entry: {error}"))?;
        let rel = item
            .path()
            .strip_prefix(root)
            .map(|path| path.to_string_lossy().into_owned())
            .unwrap_or(name);
        if kind.is_dir() && !kind.is_symlink() {
            walk_index(root, &item.path(), files)?;
            continue;
        }
        // Symlinked directories are indexed as entries but never descended
        // into (a cycle or outside target must not leak into the index);
        // symlinked files stay indexed.
        if kind.is_symlink() && std::fs::metadata(item.path()).map(|meta| meta.is_dir()).unwrap_or(false) {
            continue;
        }
        files.push(rel);
        if files.len() > MAX_INDEX_FILES {
            return Err(format!("workspace exceeds the {MAX_INDEX_FILES}-file index limit"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn fixture_root(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("harness-desktop-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("fixture dir");
        dir
    }

    #[test]
    fn containment_rejects_escapes_and_allows_normal_paths() {
        let root = fixture_root("containment");
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("file.txt"), "hello").unwrap();

        assert!(contained_path(&root, "").is_ok());
        assert!(contained_path(&root, "/etc").is_err());
        assert!(contained_path(&root, "../etc").is_err());
        assert!(contained_path(&root, "sub/../../etc").is_err());
        assert_eq!(contained_path(&root, "file.txt").unwrap().file_name().unwrap(), "file.txt");
        assert_eq!(contained_path(&root, "sub").unwrap().file_name().unwrap(), "sub");

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(std::env::temp_dir(), root.join("escape")).unwrap();
            assert!(contained_path(&root, "escape").is_err());
        }
    }

    #[test]
    fn directory_listing_sorts_dirs_first_and_hides_git() {
        let root = fixture_root("listing");
        fs::create_dir_all(root.join("zeta-dir")).unwrap();
        fs::create_dir_all(root.join("alpha-dir")).unwrap();
        fs::create_dir_all(root.join(".git")).unwrap();
        fs::write(root.join("beta.txt"), "x").unwrap();
        let entries = list_dir(&root, "").unwrap();
        let names: Vec<String> = entries.iter().map(|entry| entry.name.clone()).collect();
        assert_eq!(names, vec!["alpha-dir", "zeta-dir", "beta.txt"]);
        assert!(entries[0].is_dir && !entries[2].is_dir);
    }

    #[test]
    fn text_preview_rejects_binary_and_missing_files() {
        let root = fixture_root("preview");
        fs::write(root.join("ok.txt"), "hello world").unwrap();
        fs::write(root.join("bin.dat"), [0u8, 1, 2, 3]).unwrap();
        assert_eq!(read_text_file(&root, "ok.txt").unwrap(), "hello world");
        assert!(read_text_file(&root, "bin.dat").is_err());
        assert!(read_text_file(&root, "missing.txt").is_err());
    }

    #[test]
    fn git_status_reports_clean_dirty_and_missing_repositories() {
        let root = fixture_root("git-status");
        assert_eq!(git_status_at(&root).unwrap()["repository"], false);

        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m4@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M4 Test"]).status.success());
        fs::write(root.join("tracked.txt"), "one").unwrap();
        assert!(git(&["add", "tracked.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());

        let clean = git_status_at(&root).unwrap();
        assert_eq!(clean["repository"], true);
        assert_eq!(clean["branch"], "main");
        assert_eq!(clean["dirty"], false);

        fs::write(root.join("tracked.txt"), "two").unwrap();
        fs::write(root.join("untracked.txt"), "new").unwrap();
        let dirty = git_status_at(&root).unwrap();
        assert_eq!(dirty["dirty"], true);
        assert_eq!(dirty["changedFiles"], 2);
    }

    #[test]
    fn git_diff_returns_unified_text_and_untracked_paths() {
        let root = fixture_root("git-diff");
        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m4@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M4 Test"]).status.success());
        fs::write(root.join("a.txt"), "before").unwrap();
        assert!(git(&["add", "a.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());
        fs::write(root.join("a.txt"), "after").unwrap();
        fs::write(root.join("new.txt"), "fresh").unwrap();

        let result = git_diff_at(&root).unwrap();
        assert_eq!(result["repository"], true);
        assert!(result["diff"].as_str().unwrap().contains("@@"));
        assert!(result["diff"].as_str().unwrap().contains("-before"));
        assert!(result["diff"].as_str().unwrap().contains("+after"));
        assert_eq!(result["untracked"][0], "new.txt");
    }

    #[test]
    fn git_status_v2_parses_staged_unstaged_renames_deletions_and_untracked() {
        let root = fixture_root("git-status-v2");
        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C Test"]).status.success());
        fs::write(root.join("tracked.txt"), "one").unwrap();
        fs::write(root.join("space name.txt"), "two").unwrap();
        fs::write(root.join("to-rename.txt"), "three").unwrap();
        assert!(git(&["add", "."]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());

        // staged then modified again: MM pair
        fs::write(root.join("tracked.txt"), "one-staged").unwrap();
        assert!(git(&["add", "tracked.txt"]).status.success());
        fs::write(root.join("tracked.txt"), "one-staged-worktree").unwrap();
        // staged rename with a space in the new name
        assert!(git(&["mv", "to-rename.txt", "renamed name.txt"]).status.success());
        // staged deletion of a file with a space
        assert!(git(&["rm", "space name.txt"]).status.success());
        fs::write(root.join("new.txt"), "new").unwrap();

        let result = git_status_v2_at(&root).unwrap();
        assert_eq!(result["repository"], true);
        assert_eq!(result["branch"], "main");
        assert_eq!(result["dirty"], true);
        let files = result["files"].as_array().unwrap();
        let by_path: std::collections::HashMap<&str, &Value> = files
            .iter()
            .map(|file| (file["path"].as_str().unwrap(), file))
            .collect();
        assert_eq!(by_path["tracked.txt"]["status"], "MM");
        let rename = by_path["renamed name.txt"];
        assert_eq!(rename["status"], "R.");
        assert_eq!(rename["originalPath"], "to-rename.txt");
        assert_eq!(by_path["space name.txt"]["status"], "D.");
        assert_eq!(by_path["new.txt"]["status"], "??");
    }

    #[test]
    fn git_status_v2_reports_conflict_entries() {
        let root = fixture_root("git-status-v2-conflict");
        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C Test"]).status.success());
        fs::write(root.join("conflict.txt"), "base").unwrap();
        assert!(git(&["add", "."]).status.success());
        assert!(git(&["commit", "-q", "-m", "init"]).status.success());
        assert!(git(&["checkout", "-q", "-b", "side"]).status.success());
        fs::write(root.join("conflict.txt"), "side").unwrap();
        assert!(git(&["commit", "-qam", "side"]).status.success());
        assert!(git(&["checkout", "-q", "main"]).status.success());
        fs::write(root.join("conflict.txt"), "main").unwrap();
        assert!(git(&["commit", "-qam", "main"]).status.success());
        let _ = git(&["merge", "side"]); // conflict leaves a u entry

        let result = git_status_v2_at(&root).unwrap();
        let files = result["files"].as_array().unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0]["path"], "conflict.txt");
        assert_eq!(files[0]["status"], "UU");
        assert_eq!(files[0]["conflicted"], true);
    }

    #[test]
    fn git_status_v2_reports_repo_root_relative_paths_from_a_subdirectory() {
        let root = fixture_root("git-status-v2-subdir");
        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C Test"]).status.success());
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("sub/a.txt"), "one").unwrap();
        assert!(git(&["add", "."]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());
        fs::write(root.join("sub/a.txt"), "two").unwrap();
        fs::write(root.join("outside.txt"), "outside").unwrap();

        let result = git_status_v2_at(&root.join("sub")).unwrap();
        assert_eq!(result["repository"], true);
        let files = result["files"].as_array().unwrap();
        // porcelain v2 reports paths relative to the repository root even
        // when run from a subdirectory; the mutation layer re-validates
        // every path against the workspace root. Entry order is git's own.
        let paths: std::collections::BTreeSet<&str> = files
            .iter()
            .map(|file| file["path"].as_str().unwrap())
            .collect();
        assert_eq!(paths.len(), 2);
        assert!(paths.contains("outside.txt"));
        assert!(paths.contains("sub/a.txt"));
    }

    #[test]
    fn git_status_v2_handles_weird_filenames_and_non_git_workspaces() {
        let root = fixture_root("git-status-v2-weird");
        assert_eq!(git_status_v2_at(&root).unwrap()["repository"], false);
        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C Test"]).status.success());
        fs::write(root.join("dash-name.txt"), "x").unwrap();
        fs::write(root.join("uni-èà.txt"), "y").unwrap();
        assert!(git(&["add", "--", "dash-name.txt", "uni-èà.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());
        fs::write(root.join("dash-name.txt"), "changed").unwrap();

        let result = git_status_v2_at(&root).unwrap();
        let files = result["files"].as_array().unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0]["path"], "dash-name.txt");
        assert_eq!(files[0]["status"], ".M");
    }

    fn v2_status_of(root: &Path) -> Vec<Value> {
        git_status_v2_at(root).unwrap()["files"].as_array().unwrap().clone()
    }

    fn status_of(root: &Path, path: &str) -> String {
        v2_status_of(root)
            .iter()
            .find(|file| file["path"].as_str() == Some(path))
            .unwrap_or_else(|| panic!("path {path} missing from v2 status"))["status"]
            .as_str()
            .unwrap()
            .to_string()
    }

    #[test]
    fn git_stage_and_unstage_tracked_modified_and_untracked() {
        let root = fixture_root("m5c2-basic");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::write(root.join("tracked.txt"), "one").unwrap();
        assert!(git(&["add", "tracked.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());

        // tracked modified -> stage -> unstage
        fs::write(root.join("tracked.txt"), "two").unwrap();
        git_stage_at(&root, "tracked.txt").unwrap();
        assert_eq!(status_of(&root, "tracked.txt"), "M.");
        git_unstage_at(&root, "tracked.txt").unwrap();
        assert_eq!(status_of(&root, "tracked.txt"), ".M");

        // untracked -> stage -> moves to staged added -> unstage back
        fs::write(root.join("new.txt"), "new").unwrap();
        git_stage_at(&root, "new.txt").unwrap();
        assert_eq!(status_of(&root, "new.txt"), "A.");
        git_unstage_at(&root, "new.txt").unwrap();
        assert_eq!(status_of(&root, "new.txt"), "??");
    }

    #[test]
    fn git_stage_and_unstage_deleted_file_never_recreates_it() {
        let root = fixture_root("m5c2-deleted");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::write(root.join("gone.txt"), "x").unwrap();
        assert!(git(&["add", "gone.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());

        fs::remove_file(root.join("gone.txt")).unwrap();
        git_stage_at(&root, "gone.txt").unwrap();
        let files = v2_status_of(&root);
        assert_eq!(files[0]["status"], "D.");
        git_unstage_at(&root, "gone.txt").unwrap();
        let files = v2_status_of(&root);
        assert_eq!(files[0]["status"], ".D");
        // The worktree file must stay absent: stage/unstage never recreate.
        assert!(!root.join("gone.txt").exists());
    }

    #[test]
    fn git_stage_and_unstage_rename_uses_current_path() {
        let root = fixture_root("m5c2-rename");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::write(root.join("old.txt"), "old").unwrap();
        assert!(git(&["add", "old.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());

        assert!(git(&["mv", "old.txt", "new name.txt"]).status.success());
        git_stage_at(&root, "new name.txt").unwrap();
        let files = v2_status_of(&root);
        assert_eq!(files[0]["status"], "R.");
        assert_eq!(files[0]["path"], "new name.txt");
        assert_eq!(files[0]["originalPath"], "old.txt");

        // git's own unstage semantics split a staged rename into a staged
        // deletion of the original plus the new untracked file; the worktree
        // is not modified and no file is recreated.
        git_unstage_at(&root, "new name.txt").unwrap();
        let files = v2_status_of(&root);
        let old = files.iter().find(|f| f["path"] == "old.txt").unwrap();
        let new = files.iter().find(|f| f["path"] == "new name.txt").unwrap();
        assert_eq!(old["status"], "D.");
        assert_eq!(new["status"], "??");
        assert!(root.join("new name.txt").exists());
        assert!(!root.join("old.txt").exists());
    }

    #[test]
    fn git_stage_and_unstage_weird_filenames_nested_and_unicode() {
        let root = fixture_root("m5c2-weird");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::create_dir_all(root.join("nested/dir")).unwrap();
        fs::write(root.join("--dash.txt"), "d").unwrap();
        fs::write(root.join("with space.txt"), "s").unwrap();
        fs::write(root.join("uni-èà.txt"), "u").unwrap();
        fs::write(root.join("nested/dir/deep.txt"), "n").unwrap();
        for rel in ["--dash.txt", "with space.txt", "uni-èà.txt", "nested/dir/deep.txt"] {
            git_stage_at(&root, rel).unwrap();
        }
        let files = v2_status_of(&root);
        assert_eq!(files.len(), 4);
        for file in &files {
            assert_eq!(file["status"], "A.");
        }
        for rel in ["--dash.txt", "with space.txt", "uni-èà.txt", "nested/dir/deep.txt"] {
            git_unstage_at(&root, rel).unwrap();
        }
        let files = v2_status_of(&root);
        assert_eq!(files.len(), 4);
        for file in &files {
            assert_eq!(file["status"], "??");
        }
    }

    #[test]
    fn git_mutations_enforce_workspace_containment_below_repo_root() {
        let root = fixture_root("m5c2-containment");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::create_dir_all(root.join("packages/frontend")).unwrap();
        fs::write(root.join("packages/frontend/app.ts"), "app").unwrap();
        fs::write(root.join("README.md"), "repo root").unwrap();
        fs::write(root.join("packages/frontend/outside-link.txt"), "x").unwrap();
        assert!(git(&["add", "."]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());

        let workspace = root.join("packages/frontend");
        // Inside the workspace (repository-relative path below the prefix).
        fs::write(root.join("packages/frontend/app.ts"), "edited").unwrap();
        git_stage_at(&workspace, "packages/frontend/app.ts").unwrap();
        git_unstage_at(&workspace, "packages/frontend/app.ts").unwrap();

        // Same repository, outside the workspace: rejected by the layer.
        fs::write(root.join("README.md"), "edited").unwrap();
        let error = git_stage_at(&workspace, "README.md").unwrap_err();
        assert_eq!(error.code, "PATH_OUTSIDE_WORKSPACE");

        // Parent-relative and absolute inputs are rejected.
        assert_eq!(git_stage_at(&workspace, "../frontend/app.ts").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");
        assert_eq!(git_stage_at(&workspace, "/etc/passwd").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");

        // Symlink escaping the workspace is rejected (canonical prefix check).
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(root.join("README.md"), root.join("packages/frontend/escape")).unwrap();
            assert_eq!(git_stage_at(&workspace, "escape").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");
        }
    }

    #[test]
    fn git_unstage_unborn_repository_uses_rm_cached() {
        let root = fixture_root("m5c2-unborn");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::write(root.join("u.txt"), "x").unwrap();
        git_stage_at(&root, "u.txt").unwrap();
        let files = v2_status_of(&root);
        assert_eq!(files[0]["status"], "A.");
        git_unstage_at(&root, "u.txt").unwrap();
        let files = v2_status_of(&root);
        assert_eq!(files[0]["status"], "??");
    }

    #[test]
    fn git_mutations_reject_conflicted_paths() {
        let root = fixture_root("m5c2-conflict");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::write(root.join("conflict.txt"), "base").unwrap();
        assert!(git(&["add", "."]).status.success());
        assert!(git(&["commit", "-q", "-m", "init"]).status.success());
        assert!(git(&["checkout", "-q", "-b", "side"]).status.success());
        fs::write(root.join("conflict.txt"), "side").unwrap();
        assert!(git(&["commit", "-qam", "side"]).status.success());
        assert!(git(&["checkout", "-q", "main"]).status.success());
        fs::write(root.join("conflict.txt"), "main").unwrap();
        assert!(git(&["commit", "-qam", "main"]).status.success());
        let _ = git(&["merge", "side"]);

        assert_eq!(git_stage_at(&root, "conflict.txt").unwrap_err().code, "UNSUPPORTED_GIT_STATE");
        assert_eq!(git_unstage_at(&root, "conflict.txt").unwrap_err().code, "UNSUPPORTED_GIT_STATE");
    }

    #[test]
    fn contained_git_path_allows_missing_tail_and_rejects_escapes() {
        let root = fixture_root("m5c2-contained");
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("sub/exists.txt"), "x").unwrap();

        // A deleted path (missing on disk) still resolves for git mutations.
        assert_eq!(contained_git_path(&root, "sub/gone.txt").unwrap().file_name().unwrap(), "gone.txt");
        assert!(contained_git_path(&root, "sub").unwrap().ends_with("sub"));
        assert!(contained_git_path(&root, "").is_ok());
        assert_eq!(contained_git_path(&root, "/etc").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");
        assert_eq!(contained_git_path(&root, "../etc").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");
        assert_eq!(contained_git_path(&root, "sub/../../etc").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(std::env::temp_dir(), root.join("escape")).unwrap();
            assert_eq!(contained_git_path(&root, "escape").unwrap_err().code, "PATH_OUTSIDE_WORKSPACE");
        }
    }

    #[test]
    fn git_status_v2_reports_workspace_prefix_for_subdirectory_workspaces() {
        let root = fixture_root("m5c2-prefix");
        let git = |args: &[&str]| {
            Command::new("git").current_dir(&root).args(args).output().expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5c2@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5C2 Test"]).status.success());
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("sub/a.txt"), "one").unwrap();
        assert!(git(&["add", "."]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());
        fs::write(root.join("sub/a.txt"), "two").unwrap();

        let result = git_status_v2_at(&root.join("sub")).unwrap();
        assert_eq!(result["workspacePrefix"], "sub");
        let root_result = git_status_v2_at(&root).unwrap();
        assert_eq!(root_result["workspacePrefix"], "");
    }

    #[test]
    fn workspace_files_indexes_git_with_ignore_semantics() {
        let root = fixture_root("index-git");
        let git = |args: &[&str]| {
            Command::new("git")
                .current_dir(&root)
                .args(args)
                .output()
                .expect("git available")
        };
        assert!(git(&["init", "-q", "-b", "main"]).status.success());
        assert!(git(&["config", "user.email", "m5@example.test"]).status.success());
        assert!(git(&["config", "user.name", "M5 Test"]).status.success());
        fs::write(root.join(".gitignore"), "*.log").unwrap();
        fs::write(root.join("tracked.txt"), "t").unwrap();
        fs::write(root.join("ignored.log"), "i").unwrap();
        assert!(git(&["add", ".gitignore", "tracked.txt"]).status.success());
        assert!(git(&["commit", "-q", "-m", "initial"]).status.success());
        fs::write(root.join("untracked.txt"), "u").unwrap();

        let files = workspace_files_at(&root).unwrap();
        assert!(files.contains(&"tracked.txt".into()));
        assert!(files.contains(&".gitignore".into()));
        assert!(files.contains(&"untracked.txt".into()));
        assert!(!files.iter().any(|file| file == "ignored.log"));
        assert!(!files.iter().any(|file| file.starts_with(".git/")));
    }

    #[test]
    fn workspace_files_walks_outside_git_and_skips_noise_and_symlink_dirs() {
        let root = fixture_root("index-walk");
        fs::create_dir_all(root.join("src/deep")).unwrap();
        fs::create_dir_all(root.join(".git/objects")).unwrap();
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::write(root.join("src/a.ts"), "a").unwrap();
        fs::write(root.join("src/deep/b.ts"), "b").unwrap();
        fs::write(root.join(".git/objects/x"), "x").unwrap();
        fs::write(root.join(".DS_Store"), "noise").unwrap();
        fs::write(root.join("node_modules/pkg/index.js"), "m").unwrap();
        std::os::unix::fs::symlink(root.join("src"), root.join("linkdir")).unwrap();

        let files = workspace_files_at(&root).unwrap();
        assert_eq!(files, vec!["node_modules/pkg/index.js", "src/a.ts", "src/deep/b.ts"]);
    }
}

/// Hand a path or URL to the system default opener (host capability only).
pub(crate) fn open_in_system(target: &str) -> Result<(), String> {
    let path = std::path::Path::new(target);
    if path.exists() || target.starts_with("http://") || target.starts_with("https://") {
        let status = std::process::Command::new("open")
            .arg(target)
            .status()
            .map_err(|error| format!("open failed: {error}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("open failed".into())
        }
    } else {
        Err("target does not exist".into())
    }
}
