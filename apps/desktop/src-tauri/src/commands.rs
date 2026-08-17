/**
 * The minimal host surface the WebView may invoke. No generic exec, shell,
 * readFile, writeFile, or spawn primitive exists: agent command execution
 * stays inside the Harness subprocess/sandbox pipeline.
 */

use serde_json::{json, Value};
use tauri::{Manager, State};

use crate::manager::{self, RuntimeManager, RuntimeState};

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

/// Native macOS directory picker; cancellation answers null, never an error.
#[tauri::command]
pub fn pick_workspace() -> Result<Option<String>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Choose a project folder")
        .pick_folder();
    Ok(picked.map(|path| path.to_string_lossy().to_string()))
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
pub fn diagnostics(manager: State<'_, RuntimeManager>) -> String {
    manager::diagnostics_summary(&manager)
}

fn prefs_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app data dir unavailable: {error}"))?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("prefs.json"))
}

/// Hand a path or URL to the system default opener (host capability only).
fn open_in_system(target: &str) -> Result<(), String> {
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
