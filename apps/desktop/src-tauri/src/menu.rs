//! Native application menu: localized labels (English/Italian), conventional
//! macOS shortcuts, and menu:// events for the WebView-owned actions.

use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

pub const MENU_NEW_SESSION: &str = "menu://new-session";
pub const MENU_OPEN_WORKSPACE: &str = "menu://open-workspace";
pub const MENU_SETTINGS: &str = "menu://settings";
pub const MENU_RESTART_HARNESS: &str = "menu://restart-harness";
pub const MENU_SHOW_LOGS: &str = "menu://show-logs";
pub const MENU_ATTACH_FILE: &str = "menu://attach-file";

const DEEPSEEK_HARNESS_REPOSITORY: &str = "https://github.com/deepseek-ai/deepseek-harness";
const DEEPSEEK_HARNESS_LICENSES: &str = "https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE";

struct Labels {
    app: &'static str,
    file: &'static str,
    edit: &'static str,
    view: &'static str,
    session: &'static str,
    window: &'static str,
    help: &'static str,
    about: &'static str,
    settings: &'static str,
    new_session: &'static str,
    open_workspace: &'static str,
    restart_harness: &'static str,
    show_logs: &'static str,
    attach_file: &'static str,
    close_window: &'static str,
    fullscreen: &'static str,
    undo: &'static str,
    redo: &'static str,
    cut: &'static str,
    copy: &'static str,
    paste: &'static str,
    select_all: &'static str,
    minimize: &'static str,
    zoom: &'static str,
    hide: &'static str,
    hide_others: &'static str,
    show_all: &'static str,
    quit: &'static str,
    repository: &'static str,
    licenses: &'static str,
}

const EN: Labels = Labels {
    app: "Harness Desktop",
    file: "File",
    edit: "Edit",
    view: "View",
    session: "Session",
    window: "Window",
    help: "Help",
    about: "About Harness Desktop",
    settings: "Settings…",
    new_session: "New Session",
    open_workspace: "Open Workspace…",
    restart_harness: "Restart Harness",
    show_logs: "Show Logs",
    attach_file: "Attach Image…",
    close_window: "Close Window",
    fullscreen: "Toggle Full Screen",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    select_all: "Select All",
    minimize: "Minimize",
    zoom: "Zoom",
    hide: "Hide Harness Desktop",
    hide_others: "Hide Others",
    show_all: "Show All",
    quit: "Quit Harness Desktop",
    repository: "DeepSeek Harness Repository",
    licenses: "Open Source Licenses",
};

const IT: Labels = Labels {
    app: "Harness Desktop",
    file: "File",
    edit: "Modifica",
    view: "Vista",
    session: "Sessione",
    window: "Finestra",
    help: "Aiuto",
    about: "Informazioni su Harness Desktop",
    settings: "Impostazioni…",
    new_session: "Nuova sessione",
    open_workspace: "Apri workspace…",
    restart_harness: "Riavvia Harness",
    show_logs: "Mostra i log",
    attach_file: "Allega immagine…",
    close_window: "Chiudi finestra",
    fullscreen: "Schermo intero",
    undo: "Annulla",
    redo: "Ripeti",
    cut: "Taglia",
    copy: "Copia",
    paste: "Incolla",
    select_all: "Seleziona tutto",
    minimize: "Riduci a icona",
    zoom: "Zoom",
    hide: "Nascondi Harness Desktop",
    hide_others: "Nascondi altri",
    show_all: "Mostra tutto",
    quit: "Esci da Harness Desktop",
    repository: "Repository DeepSeek Harness",
    licenses: "Licenze open source",
};

fn labels(language: &str) -> &'static Labels {
    if language == "it" { &IT } else { &EN }
}

/** Build the native menu for a language; menu:// ids name the WebView actions. */
pub fn build_menu<R: Runtime>(app: &AppHandle<R>, language: &str) -> tauri::Result<tauri::menu::Menu<R>> {
    let labels = labels(language);
    let settings_item = MenuItemBuilder::with_id("settings", labels.settings)
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let new_session_item = MenuItemBuilder::with_id("new-session", labels.new_session)
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let open_workspace_item = MenuItemBuilder::with_id("open-workspace", labels.open_workspace)
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let restart_item = MenuItemBuilder::with_id("restart-harness", labels.restart_harness).build(app)?;
    let logs_item = MenuItemBuilder::with_id("show-logs", labels.show_logs).build(app)?;
    let attach_item = MenuItemBuilder::with_id("attach-file", labels.attach_file).build(app)?;
    let repository_item = MenuItemBuilder::with_id("repository", labels.repository).build(app)?;
    let licenses_item = MenuItemBuilder::with_id("licenses", labels.licenses).build(app)?;

    let app_menu = SubmenuBuilder::new(app, labels.app)
        .item(&MenuItemBuilder::with_id("about", labels.about).build(app)?)
        .separator()
        .item(&settings_item)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some(labels.hide))?)
        .item(&PredefinedMenuItem::hide_others(app, Some(labels.hide_others))?)
        .item(&PredefinedMenuItem::show_all(app, Some(labels.show_all))?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some(labels.quit))?)
        .build()?;
    let file_menu = SubmenuBuilder::new(app, labels.file)
        .item(&new_session_item)
        .item(&open_workspace_item)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some(labels.close_window))?)
        .build()?;
    let edit_menu = SubmenuBuilder::new(app, labels.edit)
        .item(&PredefinedMenuItem::undo(app, Some(labels.undo))?)
        .item(&PredefinedMenuItem::redo(app, Some(labels.redo))?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some(labels.cut))?)
        .item(&PredefinedMenuItem::copy(app, Some(labels.copy))?)
        .item(&PredefinedMenuItem::paste(app, Some(labels.paste))?)
        .item(&PredefinedMenuItem::select_all(app, Some(labels.select_all))?)
        .build()?;
    let view_menu = SubmenuBuilder::new(app, labels.view)
        .item(&PredefinedMenuItem::fullscreen(app, Some(labels.fullscreen))?)
        .build()?;
    let session_menu = SubmenuBuilder::new(app, labels.session)
        .item(&new_session_item)
        .item(&attach_item)
        .separator()
        .item(&restart_item)
        .item(&logs_item)
        .build()?;
    let window_menu = SubmenuBuilder::new(app, labels.window)
        .item(&PredefinedMenuItem::minimize(app, Some(labels.minimize))?)
        .item(&PredefinedMenuItem::maximize(app, Some(labels.zoom))?)
        .build()?;
    let help_menu = SubmenuBuilder::new(app, labels.help)
        .item(&repository_item)
        .item(&licenses_item)
        .build()?;

    let menu = MenuBuilder::new(app)
        .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &session_menu, &window_menu, &help_menu])
        .build()?;
    Ok(menu)
}

/** Route one native menu selection to its action or menu:// event. */
pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        "new-session" => { let _ = app.emit(MENU_NEW_SESSION, ()); }
        "open-workspace" => { let _ = app.emit(MENU_OPEN_WORKSPACE, ()); }
        "settings" => { let _ = app.emit(MENU_SETTINGS, ()); }
        "restart-harness" => { let _ = app.emit(MENU_RESTART_HARNESS, ()); }
        "show-logs" => { let _ = app.emit(MENU_SHOW_LOGS, ()); }
        "attach-file" => { let _ = app.emit(MENU_ATTACH_FILE, ()); }
        "about" => { let _ = crate::commands::open_about_window(app.clone()); }
        "repository" => { let _ = crate::commands::open_in_system(DEEPSEEK_HARNESS_REPOSITORY); }
        "licenses" => { let _ = crate::commands::open_in_system(DEEPSEEK_HARNESS_LICENSES); }
        _ => {}
    }
}
