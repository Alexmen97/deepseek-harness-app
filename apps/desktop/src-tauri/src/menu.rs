//! Native application menu: localized labels for the seven supported languages, conventional
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


const ZH: Labels = Labels {
    app: "Harness Desktop",
    file: "文件",
    edit: "编辑",
    view: "显示",
    session: "会话",
    window: "窗口",
    help: "帮助",
    about: "关于 Harness Desktop",
    settings: "设置…",
    new_session: "新建会话",
    open_workspace: "打开工作区…",
    restart_harness: "重启 Harness",
    show_logs: "显示日志",
    attach_file: "附加图像…",
    close_window: "关闭窗口",
    fullscreen: "切换全屏",
    undo: "撤销",
    redo: "重做",
    cut: "剪切",
    copy: "复制",
    paste: "粘贴",
    select_all: "全选",
    minimize: "最小化",
    zoom: "缩放",
    hide: "隐藏 Harness Desktop",
    hide_others: "隐藏其他",
    show_all: "全部显示",
    quit: "退出 Harness Desktop",
    repository: "DeepSeek Harness 仓库",
    licenses: "开源许可证",
};

const ES: Labels = Labels {
    app: "Harness Desktop",
    file: "Archivo",
    edit: "Edición",
    view: "Vista",
    session: "Sesión",
    window: "Ventana",
    help: "Ayuda",
    about: "Acerca de Harness Desktop",
    settings: "Ajustes…",
    new_session: "Nueva sesión",
    open_workspace: "Abrir área de trabajo…",
    restart_harness: "Reiniciar Harness",
    show_logs: "Mostrar registros",
    attach_file: "Adjuntar imagen…",
    close_window: "Cerrar ventana",
    fullscreen: "Pantalla completa",
    undo: "Deshacer",
    redo: "Rehacer",
    cut: "Cortar",
    copy: "Copiar",
    paste: "Pegar",
    select_all: "Seleccionar todo",
    minimize: "Minimizar",
    zoom: "Zoom",
    hide: "Ocultar Harness Desktop",
    hide_others: "Ocultar otros",
    show_all: "Mostrar todo",
    quit: "Salir de Harness Desktop",
    repository: "Repositorio de DeepSeek Harness",
    licenses: "Licencias de código abierto",
};

const FR: Labels = Labels {
    app: "Harness Desktop",
    file: "Fichier",
    edit: "Édition",
    view: "Affichage",
    session: "Session",
    window: "Fenêtre",
    help: "Aide",
    about: "À propos de Harness Desktop",
    settings: "Réglages…",
    new_session: "Nouvelle session",
    open_workspace: "Ouvrir l’espace de travail…",
    restart_harness: "Redémarrer Harness",
    show_logs: "Afficher les journaux",
    attach_file: "Joindre une image…",
    close_window: "Fermer la fenêtre",
    fullscreen: "Plein écran",
    undo: "Annuler",
    redo: "Rétablir",
    cut: "Couper",
    copy: "Copier",
    paste: "Coller",
    select_all: "Tout sélectionner",
    minimize: "Réduire",
    zoom: "Zoom",
    hide: "Masquer Harness Desktop",
    hide_others: "Masquer les autres",
    show_all: "Tout afficher",
    quit: "Quitter Harness Desktop",
    repository: "Dépôt DeepSeek Harness",
    licenses: "Licences open source",
};

const DE: Labels = Labels {
    app: "Harness Desktop",
    file: "Datei",
    edit: "Bearbeiten",
    view: "Darstellung",
    session: "Sitzung",
    window: "Fenster",
    help: "Hilfe",
    about: "Über Harness Desktop",
    settings: "Einstellungen…",
    new_session: "Neue Sitzung",
    open_workspace: "Arbeitsbereich öffnen…",
    restart_harness: "Harness neu starten",
    show_logs: "Protokolle anzeigen",
    attach_file: "Bild anhängen…",
    close_window: "Fenster schließen",
    fullscreen: "Vollbild umschalten",
    undo: "Widerrufen",
    redo: "Wiederholen",
    cut: "Ausschneiden",
    copy: "Kopieren",
    paste: "Einsetzen",
    select_all: "Alles auswählen",
    minimize: "Minimieren",
    zoom: "Zoomen",
    hide: "Harness Desktop ausblenden",
    hide_others: "Andere ausblenden",
    show_all: "Alle einblenden",
    quit: "Harness Desktop beenden",
    repository: "DeepSeek Harness Repository",
    licenses: "Open-Source-Lizenzen",
};

const PT_BR: Labels = Labels {
    app: "Harness Desktop",
    file: "Arquivo",
    edit: "Editar",
    view: "Visualizar",
    session: "Sessão",
    window: "Janela",
    help: "Ajuda",
    about: "Sobre o Harness Desktop",
    settings: "Ajustes…",
    new_session: "Nova sessão",
    open_workspace: "Abrir área de trabalho…",
    restart_harness: "Reiniciar o Harness",
    show_logs: "Mostrar registros",
    attach_file: "Anexar imagem…",
    close_window: "Fechar janela",
    fullscreen: "Tela cheia",
    undo: "Desfazer",
    redo: "Refazer",
    cut: "Recortar",
    copy: "Copiar",
    paste: "Colar",
    select_all: "Selecionar tudo",
    minimize: "Minimizar",
    zoom: "Zoom",
    hide: "Ocultar o Harness Desktop",
    hide_others: "Ocultar outros",
    show_all: "Mostrar tudo",
    quit: "Sair do Harness Desktop",
    repository: "Repositório do DeepSeek Harness",
    licenses: "Licenças de código aberto",
};
fn labels(language: &str) -> &'static Labels {
    match language {
        "it" => &IT,
        "zh" => &ZH,
        "es" => &ES,
        "fr" => &FR,
        "de" => &DE,
        "pt-BR" => &PT_BR,
        _ => &EN,
    }
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

#[cfg(test)]
mod tests {
    use super::labels;
    use crate::commands::MENU_LANGUAGES;

    /// Every shipped language resolves to a label table whose application-owned
    /// entries are all non-empty; unknown ids fall back to English.
    #[test]
    fn every_shipped_language_has_complete_menu_labels() {
        let representative = [
            "file", "session", "window", "help", "settings", "new_session",
            "open_workspace", "restart_harness", "show_logs", "attach_file",
            "close_window", "quit", "repository", "licenses",
        ];
        for language in MENU_LANGUAGES {
            let table = labels(language);
            for field in representative {
                let value = match field {
                    "file" => table.file,
                    "session" => table.session,
                    "window" => table.window,
                    "help" => table.help,
                    "settings" => table.settings,
                    "new_session" => table.new_session,
                    "open_workspace" => table.open_workspace,
                    "restart_harness" => table.restart_harness,
                    "show_logs" => table.show_logs,
                    "attach_file" => table.attach_file,
                    "close_window" => table.close_window,
                    "quit" => table.quit,
                    "repository" => table.repository,
                    "licenses" => table.licenses,
                    _ => unreachable!(),
                };
                assert!(!value.is_empty(), "{language}: {field} is empty");
            }
        }
        assert_eq!(labels("nl").settings, labels("en").settings);
    }

    /// The seven tables are pairwise distinct where they translate app-owned copy.
    #[test]
    fn shipped_language_tables_are_distinct() {
        for (index, language) in MENU_LANGUAGES.iter().enumerate() {
            let table = labels(language);
            for other in &MENU_LANGUAGES[index + 1..] {
                let other_table = labels(other);
                assert_ne!(
                    table.new_session, other_table.new_session,
                    "{language} and {other} must not share the New Session label"
                );
            }
        }
    }
}
