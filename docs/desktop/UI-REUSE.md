# Desktop UI reuse — M1B

Reference for the M1B desktop composition: every client package that matters for the desktop shell, classified REUSE / CONFIGURE / ADAPT / DESKTOP-ONLY / NOT-M1B, with the exact reason per adapter.
The rule from the brief: reuse the existing web client plugins and replace only platform boundaries; never fork a component to change styling.

## The reuse seams (verified in source)

- `AbstractApiClient` (`packages/host/apiproxy/src/fetch/client.ts`) owns every protocol invariant — rpcId minting, the four-quadrant envelopes, zod parsing, timeouts, respond receipts — and leaves exactly two platform aspects abstract: `doFetch` and the `openMux`/`openHost` stream openers.
  `WebApiClient` is only the browser implementation of those two aspects.
- `ConnectionController` (`packages/client/connection/src/client/connection.ts`) is exported and carrier-agnostic: it drives the readiness handshake (`host.describe` + both stream `onOpen`), the pump/reconnect loop, and the sink callbacks from any `IApiClient`.
- `client-runtime` consumes only `ConnectionHandle` (`{ api, start(sinks) }`) and passes frames to session/workspace runtimes — `packages/client/runtime/src/client/index.ts`.
  Everything above it (sessions, workspaces, conversation assembly, stores) is transport-blind.
- The web shell kernel (`packages/client/web/src/boot.tsx`) parses `window.__DSH_BOOT__` into a module manifest, registers statically available modules, and mounts one loader entry per plugin row.
  `BootSeams.loadBundle` and `registerStatic` are the sanctioned module-transport hooks: a desktop build can register every used plugin statically and never fetch bundles.
- `ui-workspace` declares two directory-flow holes (`conversation.hero.workspace.directoryFlow`, `sidebar.workspaces.directoryFlow`) with one owner contract: an occupant renders a picking interaction and reports `onPicked(path)`/`onCancel()`/`onError(message)` — the exact seam for the Tauri native picker (`packages/client/ui-workspace/src/client/contract/slots.ts`).

## Classification

| Package | Class | Why |
|---|---|---|
| `client-web` | REUSE | Shell kernel; desktop boot uses the same `AppWebEntry` with a desktop manifest and static module registration |
| `client-modules` | REUSE | Boot manifest parsing and module system |
| `client-runtime` | REUSE | Session/workspace/conversation runtimes consume `ConnectionHandle` only |
| `client-connection` (contracts + `ConnectionController`) | REUSE | Controller and contract types reused verbatim by the desktop connection plugin |
| `client-locale` | REUSE | English locale for M1B |
| `ui-theme`, `ui-layout`, `ui-sidebar`, `ui-conversation`, `ui-trajectory`, `ui-tool` | REUSE | Conversation rendering, tool cards, streaming, layout — all render from the client-runtime stores |
| `ui-settings`, `ui-settings-general`, `ui-settings-models` | REUSE | Settings sections; models page already drives `credentials.describe/set/unset` and `llm.providers/models` through the same RPC surface the desktop serves |
| `ui-model-selection`, `ui-permission-presets` | REUSE | Composer model seat and permission selector over the same RPCs |
| `ui-commands`, `ui-input-trigger`, `ui-skill`, `ui-subagent` | REUSE | `/` and `@` composer pipeline and its sources; no desktop changes |
| `ui-user-questions` | REUSE | Question interaction rendering (M1B requirement) |
| `ui-workspace` | REUSE | Sidebar workspaces and session list; the picker hole is filled by the desktop occupant below |
| `api-remotes` | CONFIGURE | Mount the row; the Client face already assembles the goal and plugin-inventory remotes and the forwarded-event bridge the runtime consumes |
| `client-hmr` | NOT-M1B | Development-only bundle watcher; desktop dev uses Vite HMR instead |
| `client-connection` (the plugin `apply`) | ADAPT | Its `apply` hardcodes `new WebApiClient()` and reads the page URL; no carrier-injection seam exists upstream. The desktop adds `packages/desktop/desktop-client/connection` providing the identical `ConnectionHandle` built from `DesktopApiClient` + the SAME `ConnectionController` |
| `ui-directory-picker-browse` / `ui-directory-picker-native` | ADAPT → DESKTOP-ONLY | The browse dialog and the host `osascript` picker are replaced by `ui-directory-picker-tauri`, a renderless occupant of the two directory-flow holes calling the Tauri `pick_workspace` command |
| `ui-agent-preset`, `ui-settings-plugins`, `ui-settings-plugin-inventory`, `ui-cordis`, `ui-jobs`, `ui-goal`, `ui-workflow-run`, `ui-deliverables`, `ui-message-feedback` | NOT-M1B | Preset/plugin/jobs/goals managers and non-essential surfaces are out of M1B scope |

## Desktop-only additions

- `packages/desktop/desktop-client` — `DesktopApiClient` (`AbstractApiClient` subclass over Tauri IPC), the `desktop-connection` plugin, the Tauri picker occupant, the host-capabilities wrapper (`pick_workspace`, `open_external`, `open_logs`, credential status/set/delete), the onboarding flow, and the desktop settings section (versions, runtime state, restart, diagnostics).
- `packages/credentials/credentials-keychain` — the runtime-side credential provider that resolves references by asking the trusted desktop host over the stdio transport (the option-C design from `docs/desktop/CREDENTIALS.md`).
- `apps/desktop` — Tauri 2 shell, the Rust `HarnessRuntimeManager`, and the Vite entry that registers the desktop module table and boots the reused shell kernel.

## Why the adapters exist (and nothing else)

`DesktopApiClient` must preserve the `AbstractApiClient` invariants, so it subclasses the upstream base and implements only `doFetch` (route the two POST shapes through one generic `rpc_request` invoke) and the stream openers (subscribe to generation-scoped runtime frames).
`desktop-connection` exists only because the upstream browser `apply` selects the transport by page URL; a desktop carrier cannot be injected there without modifying upstream.
The Tauri picker occupant exists because M1B requires the native macOS panel, not the browser dialog or `osascript`.
No other adapter is required: sessions, workspaces, streaming, tool cards, approvals, questions, settings, and the composer operate over the same `ConnectionHandle` and the same RPC vocabulary.
