use manager::RuntimeManager;
use tauri::Manager;

mod commands;
mod manager;
mod menu;
mod navigation;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            app.manage(commands::LanguageState(std::sync::Mutex::new("en".to_string())));
            // The window is built here so the navigation policy can attach.
            // Production loads only the app origin; external links open in
            // the system browser (docs/desktop/CSP-EVAL-AUDIT.md).
            let development = cfg!(dev);
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
                .title("Harness Desktop")
                .inner_size(1180.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .resizable(true)
                .fullscreen(false)
                .background_color(tauri::window::Color(22, 23, 28, 255))
                .on_navigation(move |url| {
                    match navigation::navigation_action(url, development) {
                        navigation::NavigationAction::Allow => true,
                        navigation::NavigationAction::OpenExternally => {
                            let _ = commands::open_in_system(url.as_str());
                            false
                        }
                        navigation::NavigationAction::Deny => false,
                    }
                })
                // target=_blank links request a new window: external links
                // open in the system browser, everything else is denied.
                .on_new_window(move |url, _features| {
                    if navigation::navigation_action(&url, development) == navigation::NavigationAction::OpenExternally {
                        let _ = commands::open_in_system(url.as_str());
                    }
                    tauri::webview::NewWindowResponse::Deny
                })
                .on_menu_event(|window, event| {
                    menu::handle_menu_event(window.app_handle(), event.id().0.as_str())
                })
                .build()?;
            // The native menu starts in English; the frontend corrects it to
            // the resolved desktop language right after locale init.
            let initial_menu = menu::build_menu(app.handle(), "en")?;
            app.set_menu(initial_menu)?;
            let manager = RuntimeManager::new(app.handle().clone());
            app.manage(manager);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::runtime_start,
            commands::runtime_restart,
            commands::runtime_stop,
            commands::runtime_status,
            commands::rpc_request,
            commands::pick_workspace,
            commands::pick_attachments,
            commands::credential_status,
            commands::credential_set,
            commands::credential_delete,
            commands::open_logs,
            commands::open_external,
            commands::prefs_get,
            commands::prefs_set,
            commands::fs_list,
            commands::fs_read_text,
            commands::reveal_in_path,
            commands::git_status,
            commands::git_diff,
            commands::diagnostics,
            commands::menu_set_language,
            commands::about_info,
            commands::log_line,
        ])
        .build(tauri::generate_context!())
        .expect("error while building the desktop application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(manager) = app.try_state::<RuntimeManager>() {
                    let _ = manager.stop();
                }
            }
        });
}
