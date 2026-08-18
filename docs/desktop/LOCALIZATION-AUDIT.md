# Desktop localization audit

Reference for every source of user-visible copy in Harness Desktop, how it is translated, and the gates that keep the seven shipped languages complete. Canonical locale identifiers: `en`, `zh`, `it`, `es`, `fr`, `de`, `pt-BR` (Brazilian Portuguese; every other Portuguese macOS locale resolves to it).

## Sources of user-visible strings

| Surface | Location | Status |
|---|---|---|
| Upstream Harness client UI (conversation, composer, tool cards, approvals, questions, settings sections, sidebar, workspaces, jobs, subagents, plugins, models) | 27 namespace dictionaries in `packages/client/*` and `packages/extensions/ui-cordis` via `packages/client/locale` | LOCALIZED (7 locales; zh remains the upstream key source of truth, every other locale is typed complete against it) |
| Desktop-owned surfaces (onboarding, runtime states, credentials, Base URL, diagnostics, notifications, failure copy) | `packages/desktop/desktop-client/src/ui/strings.ts` | LOCALIZED (7 locales, en canonical) |
| Native menu and About window links | `apps/desktop/src-tauri/src/menu.rs`, `apps/desktop/public/about.js` | LOCALIZED (7 locale label tables; the About data values — versions, architecture, build id — stay untranslated by policy) |
| Native macOS system UI (file dialogs, folder picker, standard menus the OS renders) | macOS itself | UPSTREAM_LOCALIZED (follows the macOS system locale; the application never overrides OS translations) |
| Runtime wire errors, shell output, command text, model-generated content, user-entered titles | runtime transport | NOT_USER_VISIBLE (presented as technical detail, never machine-translated) |
| Welcome notice for the Models onboarding | `packages/client/ui-settings-models/src/onboarding-copy.ts` | LOCALIZED (7 locales) |

## Fallback chain

The desktop host resolves the persisted preference (`system`, `en`, `zh`, `it`, `es`, `fr`, `de`, `pt-BR`) through `resolveSystemLanguage` in `packages/desktop/desktop-client/src/locale.ts`: regional macOS tags map to their shipped language, every Portuguese variant maps to `pt-BR`, Chinese variants follow the upstream `zh` model, and anything else resolves to English. English is the only desktop fallback; unsupported locales never fall back to Chinese. The resolved language is written to the upstream `locale.preference` at boot, on every language change, and after every runtime generation, so the browser client and the desktop surfaces always agree.

## Live switching

Changing the language updates the desktop store, re-renders React seats, persists only the preference identifier (`language` in `prefs.json`), rewrites the upstream `locale.preference` over the live connection, and rebuilds the native menu through `menu_set_language`. The Harness runtime process is never restarted for a language change, and the active session is untouched.

## Gates

`pnpm run desktop:i18n:check` loads every namespace dictionary plus the desktop strings and fails on missing keys, orphan keys, empty values, and placeholder mismatches against the English templates. `pnpm run desktop:hardcoded-strings` scans `apps/desktop`, `packages/desktop`, and `packages/credentials/credentials-keychain` for two-word English phrases written directly into JSX attributes or text children, with a curated allowlist for technical literals. Both gates run in the desktop PR CI and in the release workflow; a release cannot publish while any locale is below 100%.

## Locale registry

`packages/client/locale` owns the id list (`locale-settings.ts`), the seven-entry selector, the dictionary registry (typed so every shipped locale is required at registration), the lookup chain (namespace → active locale → zh → common → key), `{name}` interpolation, and the `locale/change` event. The desktop language selector (Settings → General → Language) lists System, English, 中文, Italiano, Español, Français, Deutsch, Português (Brasil), with each language named in its own language.
