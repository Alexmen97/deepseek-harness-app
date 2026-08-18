/**
 * The minimal host surface the WebView may invoke. No generic exec, shell,
 * readFile, writeFile, or spawn primitive exists: agent command execution
 * stays inside the Harness subprocess/sandbox pipeline.
 */

use serde_json::{json, Value};
use tauri::{Manager, State};

use crate::manager::{self, RuntimeManager, RuntimeState};

/// Managed holder for the resolved application language (menu and About window).
pub struct LanguageState(pub std::sync::Mutex<String>);

/// The seven application languages the native surfaces serve.
pub const MENU_LANGUAGES: [&str; 7] = ["en", "zh", "it", "es", "fr", "de", "pt-BR"];

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
