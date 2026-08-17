//! WebView navigation policy: the production origin only, external http(s)
//! links handed to the system browser, everything else denied.

use tauri::Url;

/// The app origin scheme Tauri serves the embedded assets from.
const APP_SCHEME: &str = "tauri";

/** What to do with an attempted navigation. */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavigationAction {
    /// The WebView may navigate.
    Allow,
    /// Open the URL in the system browser and deny the in-app navigation.
    OpenExternally,
    /// Deny without any system action.
    Deny,
}

/**
 * Production policy: only the app origin loads in the WebView. External
 * http(s) links open in the system browser; every other scheme (file,
 * javascript, data, blob, custom) is denied. Development mode additionally
 * allows the localhost dev server.
 */
pub fn navigation_action(url: &Url, development: bool) -> NavigationAction {
    let scheme = url.scheme();
    if scheme == APP_SCHEME {
        return NavigationAction::Allow
    }
    if development && (scheme == "http" || scheme == "https") && url.host_str() == Some("localhost") {
        return NavigationAction::Allow
    }
    if scheme == "http" || scheme == "https" {
        return NavigationAction::OpenExternally
    }
    NavigationAction::Deny
}

#[cfg(test)]
mod tests {
    use super::{navigation_action, NavigationAction};
    use tauri::Url;

    #[test]
    fn allows_only_the_app_origin_in_production() {
        assert_eq!(navigation_action(&Url::parse("tauri://localhost/index.html").unwrap(), false), NavigationAction::Allow);
        assert_eq!(navigation_action(&Url::parse("https://example.com").unwrap(), false), NavigationAction::OpenExternally);
        assert_eq!(navigation_action(&Url::parse("http://localhost:5173/").unwrap(), false), NavigationAction::OpenExternally);
    }

    #[test]
    fn allows_the_dev_server_only_in_development() {
        assert_eq!(navigation_action(&Url::parse("http://localhost:5173/").unwrap(), true), NavigationAction::Allow);
        assert_eq!(navigation_action(&Url::parse("http://localhost:5173/").unwrap(), false), NavigationAction::OpenExternally);
    }

    #[test]
    fn denies_non_browser_schemes() {
        for target in [
            "javascript:alert(1)",
            "file:///etc/passwd",
            "data:text/html,<h1>x</h1>",
            "blob:tauri://localhost/abc",
            "about:blank",
        ] {
            assert_eq!(navigation_action(&Url::parse(target).unwrap(), false), NavigationAction::Deny, "{target}");
        }
    }
}
