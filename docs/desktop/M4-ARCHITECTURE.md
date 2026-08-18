# M4 coding experience architecture

Reference for the M4 coding surfaces: what each reuses from DeepSeek Harness, which adapter or wire method it adds, what it persists, and how it is tested. Frozen seams from M1-M3.3 stay unchanged: the Rust host owns the sidecar, the WebView talks only over Tauri IPC and the versioned stdio protocol, there is no localhost server and no generic exec, Harness SessionEvent remains the source of truth, and the macOS Keychain stays the only credential store.

## Layout and Inspector

The main window keeps the reused web shell untouched. The desktop overlay (apps/desktop) renders a collapsible Inspector beside the shell: a resizable right column with six sections — Files, Changes, Terminal, Plan, Jobs, Subagents. Only the open section and the column visibility are persisted locally through the existing prefs.json commands; every domain value shown inside comes from the runtime streams or the narrow host capabilities below. Closing the Inspector never tears down the shell, and the shell never shrinks below its minimum width.

- Existing primitive: desktop overlay + prefs commands (M1A-M3.2).
- Reusable UI: none upstream — the web shell is conversation-first; the Inspector is the desktop surface.
- New adapter: one React component tree in apps/desktop/src with its own strings namespace.
- New RPC: none for the frame itself.
- Security: inspector content is rendered data, never executable; no new IPC.
- Event source: transport frames (mux), host capabilities.
- Persistence: prefs.json keys inspector.tab and inspector.visible only.
- Tests: component tests for tab switching, persistence round-trip, and hide/show; localization coverage for every label.

## Terminal

The terminal stays on the Harness path end to end: the xterm frontend sends input over the versioned stdio protocol to the desktop runtime, whose terminal service owns the PTY through the registered bash backend. The WebView never spawns a process and the Rust host never exposes an exec primitive.

- Existing primitive: @deepseek-ai/dsh-terminal (spawn/send/resize/kill/list, owner-scoped sessions) + @deepseek-ai/dsh-terminal-bash (macOS PTY backend with ANSI sanitization); xterm.js is not used upstream, so it is added as the frontend-only dependency.
- Reusable UI: none upstream; xterm.js + fit addon.
- Required adapter: terminal plugins mounted in the desktop runtime composition; four desktop.terminal.* request methods (spawn, send, resize, kill, list) and one desktop.terminal.output notification added to the versioned protocol and served by the desktop JSON-RPC server over ctx.terminal.
- Permission/security: backend sanitization stays on; the frontend renders only the server-provided output stream inside xterm (no DOM injection); Ctrl+C is delivered as terminal input, never as a host signal.
- Event source: desktop.terminal.output notifications with session-scoped deltas and status; list() re-baselines after reconnect.
- Persistence: none — PTY state is runtime-owned; a restart clears it together with the runtime generation, and stale-generation frames are already rejected by the transport.
- Tests: Rust-free protocol/schema tests, server-side terminal handler tests over a scripted backend, frontend input/resize/lifecycle tests, and the reconnect regression (generation bump discards stale terminal state without orphaning the PTY, which the runtime disposal already guarantees).

## Files and File Viewer

The explorer reads the workspace through one narrow, read-only host capability, not through generic file IPC: fs_list returns a bounded directory tree under the runtime cwd, fs_read_text returns a size-capped UTF-8 preview of one workspace file. The agent's own file operations keep flowing through the Harness filesystem tools and sandbox policy; the Inspector is a viewer, never a mutation surface.

- Existing primitive: the runtime cwd (workspace root pinned at boot), reveal-in-Finder precedent of the narrow native capabilities.
- Reusable UI: none upstream for a tree explorer.
- Required adapter: Rust fs_list / fs_read_text / reveal_in_path commands with workspace-root containment, entry caps, and size caps.
- Permission/security: path containment against the runtime workspace root; directory entries are names only; reads cap at 512 KiB and refuse binary content; no write path exists.
- Event source: host command results + an explicit refresh; no push stream (the agent may mutate files, so the explorer refreshes on demand and on session/event changes).
- Persistence: expanded directory set in prefs.json (UI state only).
- Tests: containment and cap behavior in Rust, tree/viewer component tests, binary-refusal and unreadable-path cases.

## Changes / Diff and Git status

The repository state comes from the workspace's git repository through one narrow read-only host capability. The Rust host runs git status and git diff with fixed safe arguments and returns structured status plus unified diff text; there is no commit, push, or staging surface in M4.

- Existing primitive: none upstream (the harness has no git package), so this is the first and only git adapter.
- Reusable UI: none upstream.
- Required adapter: Rust git_status (repository detected, branch, dirty flag, per-file statuses) and git_diff (unified diff plus added/deleted counts) commands; both degrade to an explicit no-repository state when git is absent.
- Permission/security: arguments are fixed, output is capped, and the diff text is rendered as inert preformatted content with a token highlighter — no HTML interpretation.
- Event source: host command results; refreshed on demand and when a session/tool event lands (file-effect tools can change the tree).
- Persistence: none beyond the UI selection.
- Tests: Rust parsing tests over fixture repositories (clean, dirty, untracked, renamed), diff-count parsing tests, frontend rendering tests.

## Plan

The Plan section renders only structured upstream state: the plan projection frames (session/projection with the plan key) and plan/mode session events. Assistant prose is never parsed into a plan; a session without structured plan state shows the explicit empty state.

- Existing primitive: @deepseek-ai/dsh-plan-mode projection registered on sessionProjections; plan/mode SessionEvent.
- Reusable UI: the composer plan chip stays where it is; the Inspector shows the structured projection itself.
- Required adapter: a per-session higher-seq-wins projection store fed by the existing events.mux frames, seeded from session.history.
- Permission/security: render-only.
- Event source: events.mux session/projection and session/event frames.
- Persistence: none.
- Tests: projection-store tests (seed, higher-seq-wins, stale generation discard) and the section rendering tests.

## Jobs

The Jobs section renders the authoritative jobs snapshot from session/jobs mux frames (id, kind, label, status, detail, timestamps). Cancel/stop is shown as state only; M4 adds no job mutation surface because the harness exposes jobs as a registry view, not a command API.

- Existing primitive: the background-job registry and its JobView wire snapshot.
- Reusable UI: the conversation job list stays where it is; the Inspector shows the same view data.
- Required adapter: per-session job snapshot store from session/jobs frames.
- Permission/security: render-only; labels are inert text.
- Event source: events.mux session/jobs frames.
- Persistence: none.
- Tests: snapshot-store tests (baseline, empty-set transition, reconnect) and section tests.

## Subagents

The Subagents section renders the delegation tree from structured session lineage: the main session at the root and its child sessions (subagent spawn events and the subagent projection) with state and activity summary. No parallel subagent model exists.

- Existing primitive: subagent spawn/child-session events and lineage traces already durable in the session log; subagent tool events.
- Reusable UI: the conversation subagent surfaces stay where they are.
- Required adapter: a lineage reducer over session/event frames plus the session.list summaries for the children.
- Permission/security: render-only.
- Event source: events.mux session/event frames and session.list summaries.
- Persistence: none.
- Tests: lineage-reducer tests (spawn, dispose, unknown child) and section tests.

## Localization and security

Every inspector string joins the desktop strings namespace and must exist in en, zh, it, es, fr, de, pt-BR; the existing 100% coverage gate stays green. Rendered content (terminal output, diffs, paths, git metadata, job labels, subagent summaries) is always inert text: xterm's renderer, preformatted blocks, and React text nodes only — no dangerous HTML and no widened IPC. The CSP and the no-generic-exec host boundary stay as shipped in M3.3.

## Test strategy

Vitest owns the frontend stores and sections (terminal protocol mocks, projection stores, diff parsing, git status rendering, localization completeness). cargo test owns the new host commands (containment, caps, git parsing) against fixture workspaces. The existing desktop/runtime integration suites and the crash-reconnect regression continue to run in the public CI checks job; the manual acceptance list in this document's parent milestone is the final gate before the M4 close.
