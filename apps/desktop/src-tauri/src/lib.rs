use manager::RuntimeManager;
use tauri::Manager;

mod commands;
mod manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
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
            commands::credential_status,
            commands::credential_set,
            commands::credential_delete,
            commands::open_logs,
            commands::open_external,
            commands::prefs_get,
            commands::prefs_set,
            commands::diagnostics,
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
