# DeepSeek Harness Desktop for macOS — Architecture

Phase 0 repository & architecture discovery for the macOS desktop client of [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), updated with the M1B desktop application contract.
This document is based on direct source inspection of upstream at commit `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca` (`0.1.0-rc.7`, 2026-08-17, branch `master`), not on documentation alone.
Every conclusion carries a source reference.
Upstream is in developer preview: compatibility-breaking changes are expected, so the desktop client pins the runtime version and treats upstream as the single source of truth for engine behavior.

Guiding principle (from the project brief): DeepSeek Harness remains the engine; the desktop app is a desktop host, runtime manager, GUI, and client of the harness SDK/API.
It must not re-implement the agent loop, session engine, tool registry, plugin engine, adapters, approvals, persistence, skills, subagents, MCP, terminal, LSP, compaction, or workflows.

## A. Repository map

| Path | Role |
|---|---|
| `vendor/` | Vendored Cordis source (`@deepseek-ai/cordis`), the plugin framework: services, typed events, reversible effects |
| `packages/core/` | Product spine: `session`, `system-prompt`, `tools`, `agent`, `agent-loop`, `scope` |
| `packages/api/` | Remote BFF assembly (`api-remotes`) and the Typert RPC gateway (`api-gateway`) |
| `packages/llm/` | LLM seam (`llm`), DeepSeek provider (`llm-deepseek`), retry, token meter |
| `packages/fs/` `packages/subprocess/` `packages/shell/` | Filesystem, process-tree, and bash capability seams (`ctx.fs`, `ctx.subprocess`, `ctx.shell`) |
| `packages/terminal/` | Persistent owner-scoped PTY sessions (`ctx.terminals`) |
| `packages/lsp/` | LSP seam (`ctx.lsp`): goToDefinition, references, implementation, hover |
| `packages/skill/` | Skill registry (`ctx.skills`) plus filesystem provider and catalog tool |
| `packages/subagent/` `packages/workflow/` | Subagent seam (`ctx.subagents`) and workflow engine (`ctx.workflowEngine`) |
| `packages/session/` | Durable session data: persistence seam (JSONL/SQLite), checkpoint policy, projections, titles, telemetry |
| `packages/session-query/` | Session listing/search/tracing (`ctx.sessionQuery`), SQLite FTS backend |
| `packages/interaction/` | Approval (`ctx.approval`), permission presets, commands, ask-user questions |
| `packages/credentials/` `packages/settings/` | Credential-reference seam (`ctx.credentials`) and user-settings seam (`ctx.settings`) with file providers |
| `packages/host/` | Web server, frontend-static, API proxy, directory picker (native/browse/auto), plugin inventory |
| `packages/client/` | React client: `client-connection`, `client-runtime`, `api-remotes`, `client-web`, `client-modules`, `ui-*` feature plugins |
| `packages/sdk/` | JSON-RPC stdio protocol, server plugin, TypeScript client |
| `packages/acp/` | Automation-only Agent Client Protocol server |
| `packages/bundle/` `packages/boot/` | Installable patch-layer bundles (`base`, `web-app`, `headless`) and shared app-bin glue |
| `packages/desktop/` | `desktop-protocol` (wire contract), `desktop-jsonrpc-server` (stdio carrier), `desktop-runtime` (composition + bins), `desktop-client` (IPC carrier, connection plugin, onboarding/settings surfaces) |
| `packages/credentials/` | `credentials-keychain`: the runtime credential provider bridged over the stdio channel to the desktop host |
| `apps/cli/` `apps/web/` | `dsh` CLI and the Vite frontend shell |
| `apps/desktop/` | The Tauri 2 shell: reused client roster, onboarding, and the Rust runtime manager |
| `apps/desktop-agent-pkg/` | NEW: dependency-only deploy root for the single-executable runtime |
| `python/` | Python SDK + bundled single-executable runtime (the distribution precedent) |

The extension model is Cordis: every product part is a plugin, and new behavior attaches to documented extension points (`docs/architecture.md`).
This is what keeps the desktop client additive: everything the desktop needs on the engine side is reachable as a plugin or service.

## B. Current Web UI architecture

`dsh web` boots the `web` profile: the `dsh-base` bundle (agent loop, tools, persistence, sandbox/approval policy, settings, credentials, telemetry) plus the `dsh-web-app` bundle (webserver, frontend, API proxy, browser client roster) — `packages/bundle/web-app/cordis.patch.yml`.
The host serves the `apps/web` dist through `packages/host/frontend-static`, exposes the complete client RPC surface through `packages/host/apiproxy/src/api/rpc-map.ts` (`session.*`, `workspace.*`, `settings.*`, `credentials.*`, `llm.*`, `goal.*`, `subagent.*`, `skill.*`, `agentPreset.*`, `host.*`), and streams `MuxFrame`/`HostFrame` events over two WebSocket downlinks with answerable approval/question frames (stable `rpcId`, answered via `/api/respond`).
The Typert gateway serves typed Remote methods over the same connection (`docs/api-gateway.md`).
The browser client is a React client already: `client-runtime` assembles the conversation from durable `session/event` frames, and every surface is a separate `ui-*` plugin.
The browser carrier (`WebApiClient`: fetch + WebSocket) sits behind the `AbstractApiClient` seam (`packages/client/connection/src/client/web-api-client.ts`), which is the seam the desktop carrier replaces.
The gateway itself is transport-agnostic: `ApiProxyService` provides `ctx.apiProxy` and registers no routes — physical carriers wrap it (`packages/host/apiproxy/src/index.ts`).

## C. Session/event model

Sessions are append-only logs of `SessionEvent` envelopes (`type`, monotonic `seq`, epoch-ms `time`, `data`, conditional `surfaceOp`/`sourceEventSeqs`); the vocabulary is merge-extensible (`SessionEventMap` in `@deepseek-ai/dsh-session/types`).
Only `user/message`, `assistant/message`, `tool/result` are surface events; `deriveMessages()` projects the model view from the log (`docs/architecture.md`, `docs/persistence-catalog.md`).
Durability runs through the persistence seam `ctx.sessionPersistence` (JSONL zstd and SQLite backends), a semantic checkpoint policy, a projection cache, titles, and telemetry (`packages/session/README.md`).
`ctx.sessions` supports create, replay, fork (with an inclusive boundary seq), resume, and list; a cold persisted session is resumed on first touch (`packages/core/session/src/index.ts`).
`ctx.sessionQuery` lists, filters, searches, and traces the corpus (`packages/session-query/session-query/README.md`).
Every log append is broadcast through the single `session/event` event, alongside live `agent/*`, `llm/stream`, `tools/*`, `approval/request`, `jobs/*`, `subagent/*` events.
The desktop consequence: the conversation UI must be a projection of this stream (upstream `client-runtime` already implements it); the desktop client keeps only UI state.

## D. Runtime options

Four ways to run the engine were evaluated: `dsh web` (full HTTP/WS host, needs a user-installed Node), the SDK JSON-RPC stdio server (`initialize`, `session/prompt`, `shutdown` plus `session.event`/`session.status`/`subagent.*` notifications — minimal, automation-oriented), the ACP server (automation-only Agent Client Protocol, no transcript replay), and in-process embedding.
The SDK and ACP protocols lack the interactive surface (session management, workspace, approvals, questions).

**Decision (ADR-002):** ship the engine as a single-executable sidecar built with the upstream `@yao-pkg/pkg --sea` route (the Python SDK `dsh-jsonrpc-agent-pkg` precedent, `scripts/build-exe-for-python-sdk.ts`), exposing the full interactive surface (the apiproxy `RpcMethodMap` vocabulary plus `MuxFrame`/`HostFrame` events and `respond`) over newline-delimited JSON-RPC on stdio.
The transport is option 2's shape with option 1's vocabulary: zero network listeners, full process control for the desktop host, and the browser client's contract types reused unchanged.

## E. Desktop framework decision (ADR-001)

| Criterion | Tauri 2 | Electron | Swift/SwiftUI |
|---|---|---|---|
| Reuse of `apps/web` + `packages/client/*` | Full (Vite + React) | Full | None — rewrite every surface |
| Reuse of `client-runtime` event projection | Full (TS) | Full (TS) | None — reimplement |
| Binary size / memory | Small (system WebKit) | Large (bundled Chromium) | Small |
| Startup | Fast | Slower | Fastest |
| Native macOS APIs (window, menu, tray, notifications, dialogs) | First-class | Via main-process modules | First-class |
| Keychain | Plugin/Rust crate | `safeStorage` | Native |
| Sidecar process management | Built-in sidecar + Rust `Command` | `child_process` in main | `Process` |
| Code signing / notarization / updater | First-class tooling | `electron-updater` | Native |
| Apple Silicon / Intel / universal | Yes | Yes | Yes |
| App Sandbox compatibility with subprocess-heavy agent | Configurable | Configurable | Configurable |
| Future compatibility with harness (TS ecosystem) | High | High | Medium (duplicate client) |

**Decision: Tauri 2 + React frontend reusing `packages/client/*`, with a Rust sidecar manager for the embedded harness runtime.**
The decisive factor is that the upstream client stack is a large, tested, event-correct React codebase; SwiftUI would force a parallel client — exactly the duplication the brief forbids.
Between the two WebView routes, Tauri wins on footprint, startup, native macOS integration, notarization/updater tooling, and a strict command allowlist.
The transport replaces HTTP/WebSocket entirely, so there is no port, no LAN exposure, and no browser trust fence to maintain.

## F. Runtime distribution

Upstream already builds per-platform single-file executables with `@yao-pkg/pkg --sea` (Node 24 embedded, closed runtime closure, whole-tree assets) — `scripts/build-exe-for-python-sdk.ts`.
`scripts/build-exe-for-desktop.ts` is the desktop sibling: it verifies the closure (`verify-runtime-closure --manifest apps/desktop-agent-pkg/package.json`), deploys the `dsh-desktop-agent-pkg` closure, and packs `dsh-desktop-runtime-<platform>-<arch>` from the entry `node_modules/@deepseek-ai/dsh-desktop-runtime/lib/packaged-bin.js`.
The desktop asset globs additionally carry `.dylib`/`.so` files (sharp/libvips load through them) and the macOS `node-pty` spawn helper is emitted beside the executable.
The executable is `dist-exe/dsh-desktop-runtime-macos-arm64` (177.9 MB, Mach-O arm64, Node v24.19.0 embedded) and boots with a PATH of only `/usr/bin:/bin` — no user Node, pnpm, or Homebrew required. The M1B closure adds the credentials-keychain provider over the M1A closure.
An environment override `DSH_PKG_BIN` lets the script use a locally installed pkg binary where `pnpm dlx` prompts for build approvals.
The desktop app will embed the executable in the Tauri resources, sign it with the app, and launch it with `DSH_HOME` under Application Support, `DSH_CWD`/spawn cwd set to the workspace, and a PATH augmented from the user's shell.
Version pinning: the app manifest records `desktopVersion` and `harnessVersion`; the handshake reports both and the app refuses to run on an unexpected protocol version.

## G. IPC architecture

```
React UI (packages/client/* reused verbatim)
   | AbstractApiClient seam
DesktopApiClient (TS): newline-delimited JSON-RPC over sidecar stdio
   | Tauri invoke (allowlisted commands)
Rust HarnessRuntimeManager (Tauri core):
   spawn/stop/restart/health/logs/crash-loop guard of the sidecar
   | child process stdio
dsh-desktop-runtime (embedded engine): Cordis tree +
   desktop JSON-RPC server (RpcMethodMap + events + respond + desktop.*)
```

### Process ownership (single owner)

The Tauri/Rust layer is the ONLY owner of the sidecar lifecycle.
The React/WebView layer must never spawn the harness; it speaks to the runtime exclusively through the stdio transport the Rust layer owns.
The lifecycle semantics are reused from `@deepseek-ai/dsh-sdk-client`: stdin EOF (cooperative quiesce) → SIGTERM → SIGKILL with bounded grace windows (`packages/sdk/client/src/dispose.ts`), reproduced in Rust in M1B.
M1A proves the contract in the subprocess tests: `desktop.shutdown` exits 0 after the response flush, stdin EOF disposes the tree, and the acceptance client observes a clean exit with no orphan processes.
When the transport disappears while an approval is pending the runtime disposes its root, the gateway teardown settles every pending approval as `cancelled` (fail closed), and the process exits — asserted by the fail-closed test.

### Wire protocol

`packages/desktop/desktop-protocol` owns the complete typed contract: `DESKTOP_PROTOCOL_VERSION = 1`, the `DesktopRequestMap`/`DesktopNotificationMap` names, the handshake result with negotiated capabilities, and the envelopes.
Method names reuse the apiproxy keys (`session.list`, `session.create`, `session.history`, `session.prompt`, `session.cancel`, `workspace.list`, `workspace.create`, `llm.providers`, `llm.models`, `respond`); desktop-only methods are prefixed (`desktop.initialize`, `desktop.describe`, `desktop.shutdown`).
Unary params carry a client-minted `rpcId` beside the payload; the server validates payloads with the same zod schemas the HTTP carrier uses and echoes `rpcId` in the result, preserving the four-quadrant message model (`docs/desktop/RPC-MAPPING.md` documents the REUSE/ADAPT/NEW matrix per method).
Notifications carry the `MuxFrame`/`HostFrame` payloads verbatim (`events.mux`, `events.host`) plus `desktop.status`; approval and question frames are answerable through `respond` with the same validation the web surface applies.
The handshake is the first RPC: `desktop.initialize` validates cwd and route hints, and returns `protocolVersion`, `harnessVersion`, `runtimeVersion`, `serverInfo`, and capabilities computed from the composed services (never inferred from versions).
The app must fail with an actionable message when its compiled `DESKTOP_PROTOCOL_VERSION` differs from the runtime's report.

## H. Security model

- **Transport**: stdio only. No HTTP/WebSocket listener, no port, no LAN exposure, no DNS-rebinding surface.
- **API key**: stored in the macOS Keychain (`service: com.deepseek.harness.desktop`) per `docs/desktop/CREDENTIALS.md`; the runtime resolves it through the credentials-keychain provider over server-initiated stdio requests, the environment-injection path stays test/dev only, and a test pins that credential-shaped values never appear in transport output.
- **Filesystem**: the workspace is the user-picked folder; reads/writes go through `ctx.fs` plus the upstream policy; the desktop exposes no bypass.
- **Subprocess**: spawned processes go through `ctx.subprocess`/`ctx.shell` under the harness sandbox and approval policy; the Tauri layer has no exec command.
- **WebView**: restrictive CSP, navigation locked to the app origin, external links in the system browser, no DevTools auto-open in production.
- **App Sandbox**: disabled for M1B, bookmarks not required, ad-hoc signing; the harness's own sandbox/permission policy is the enforcement layer. See `docs/desktop/MACOS-SANDBOX.md`. Revisit before App Store distribution.
- **Updates**: HTTPS, signed, verified (Tauri updater), rollback-safe; engine updates are version-pinned and intentional.

## I. Upstream strategy

Zero-fork: the desktop client adds packages and apps to the monorepo. The one upstream edit is an additive re-export (ConnectionController) in `packages/client/connection/src/client/index.ts`, needed so the desktop connection plugin reuses that controller; it is filed as an upstream candidate in the M1B report.
Reused verbatim: `packages/client/*` (M1B), `packages/sdk/protocol` (the `JsonRpcLineTransport` framing), the apiproxy contract types and schemas, the apiproxy service (`ctx.apiProxy`), the agent spine bundle, and `app-boot`.
New additive packages: `packages/desktop/desktop-protocol`, `packages/desktop/desktop-jsonrpc-server`, `packages/desktop/desktop-runtime`, `packages/desktop/desktop-client`, `packages/credentials/credentials-keychain`, `apps/desktop`, `apps/desktop-agent-pkg`, and `scripts/build-exe-for-desktop.ts` — all candidates to contribute upstream.
Pin `harnessVersion`; follow `docs/desktop/UPDATING-HARNESS.md` (bump → build → contract tests → integration tests → smoke → package → release) with compatibility gates over the RpcMethodMap signatures, the `SessionEventMap` vocabulary, the protocol version, and the approval/outcome vocabulary.

## J. Milestone state

M1A ships the typed desktop protocol, the stdio JSON-RPC carrier over
`ctx.apiProxy`, the desktop runtime composition with the keyless replay
overlay, the lifecycle/approval/question test matrix, and the packaged macOS
arm64 runtime whose acceptance suite runs without node on PATH.

M1B ships the Tauri 2 application: the reused client roster over
`DesktopApiClient`, the Rust runtime manager with generation-scoped frames
and the bounded restart policy, the macOS Keychain bridge, first-run
onboarding with the native workspace picker, and the desktop test layers
described in `docs/desktop/M1B-TESTING.md`.

M2 ships the distribution and desktop UX pass: the CSP eval audit with the
manifest guard, navigation and rendered-content hardening, the
syncInspectManifest ordering fix, the English-fallback locale policy with an
Italian desktop surface, the System/Light/Dark appearance integration, the
native menu and shortcuts, macOS notifications, the native attachment
picker, the credential management surface, the About window, the
hardened-runtime signing pipeline with notarization and DMG tooling, and the
release verification script (`docs/desktop/DISTRIBUTION.md`).

## Current constraints

One runtime process serves one workspace: switching workspace restarts the
runtime, and the sidecar launch cwd is the session header cwd. The
`terminal` capability stays false until the desktop terminal domain lands.
The attachment store is served (`attachments: true`) while the desktop
composer adapter remains deferred, so the attachment surface stays hidden.
The desktop runtime owns one client per process; approval fail-closed
semantics come from the gateway teardown plus the runner's dispose-on-EOF
behavior.
