# Agent Note: Desktop M5B live sync, external-change handling, and Quick Open

Status: implemented

English | [中文](2026-08-19-desktop-m5b-live-sync-and-quick-open.zh.md)

## Problem

The M5A editor opened buffers through ctx.fs with FsVersion-guarded saves, but nothing told the UI when a file changed underneath it: external editors, Finder, the integrated terminal, or the harness agent itself could rewrite a file while an open buffer stayed stale, Files and Changes kept manual refresh buttons, and a quit with dirty tabs stopped the runtime unconditionally.

## Decision

M5B adds one native, non-authoritative change source: a Rust workspace watcher (notify crate) owned by the runtime manager, scoped to the current workspace, started with each runtime generation and stopped with it. It emits path-only invalidation batches (never content or versions) through the `workspace://changed` Tauri event, coalesced at 100 ms with a 512-path flood cap; a cap-truncated batch is flagged `full` and invalidates every surface. The frontend coalesces again at 150 ms, drops stale generations, and fans out to Files, Changes, the editor, and Quick Open. The editor reconciles per buffer: clean buffers auto-reload and stay clean; dirty buffers keep the draft and surface an external-change conflict with Review/Reload and Keep my changes; deleted files keep the tab with a deleted state and are never recreated; transient absence (no active session yet) never marks deletion. After a runtime reconnect, open buffers survive in UI memory and reconcile once a session is live again. FsVersion stays the only data authority: the watcher never decides content or version.

Quick Open (Cmd+P) is an in-memory path-only index: inside a git repository the host builds it from `git ls-files --cached --others --exclude-standard` (NUL-separated, honors .gitignore, fixed argv); outside git it is a bounded walk that skips .git/.DS_Store and never descends symlinked directories, capped at 200,000 files. The build runs on the blocking pool and stale results are discarded.

The unsaved-changes quit guard is fail-closed: the frontend arms the native guard while any buffer is dirty; a quit attempt (Cmd+Q or window close) is prevented by Rust before any runtime teardown and surfaced to the dialog with Cancel, Discard and Quit, and Save All and Quit (Save All only quits when every FsVersion-guarded save succeeds).

Upstream `fs/observed` is verified but not forwarded: it fires only when harness tool operations pass through ctx.fs, so it cannot see Finder, terminal, or external editors, and its payload would be stale by the time the UI used it. The native watcher sees the same writes on the same filesystem, so there is one event source and one state model.

## Alternatives considered

### Why not forward fs/observed instead of adding a watcher?

fs/observed is an observation record for the write/edit intent waterfalls, emitted only by ctx.fs tool operations; it is not a filesystem watcher and misses every external writer. Forwarding it would also require a runtime plugin, a runtime-closure rebuild, and a new protocol notification for less coverage than the native watcher. It stays the harness-internal write-observation authority.

### Why not watch inside the runtime (chokidar) and push over JSON-RPC?

Upstream already uses chokidar for skill roots, but the desktop runtime is a single-executable closure; adding a watcher there means a runtime rebuild and a protocol addition for every change. A native watcher in the Rust host keeps the runtime untouched, starts/stops with the manager lifecycle, and carries generation scoping for free.

### Why not polling?

The spec prefers a real filesystem watcher when available; notify uses FSEvents on macOS and the manager degrades to manual refresh if watching fails.

## Consequences

- One non-authoritative invalidation pipeline; ctx.fs + FsVersion remain the only data authority.
- The runtime single-executable and the desktop protocol stay untouched (no protocol version change).
- Rust owns the watcher lifecycle and generation scope; the frontend filters stale generations as defense in depth.
- 19 new desktop strings ship in all seven locales; the coverage gate is unchanged.
- Rename is handled as delete + create (no fragile content heuristics); a renamed file is not auto-followed.
- Editor drafts survive runtime restarts; no pending save is ever auto-replayed.
- The quit guard pauses before any runtime teardown, preserving the no-orphan guarantee.
