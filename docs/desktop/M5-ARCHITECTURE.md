# M5 architecture spike — Editor & Change Management

Design record only; M5 is not implemented. Every proposal classifies as REUSE, ADAPTER, DESKTOP-ONLY, or UPSTREAM PATCH, and no upstream file changes during this spike.

## Upstream filesystem findings

Upstream already exposes the exact primitive a user-initiated editor needs: the root-level FileSystem service (ctx.fs, packages/fs/fs) with readText/streamText/readBytes/listDir/stat/lstat/resolve and, critically, writeText and editText mutations that run through the fs/write-intent and fs/edit-intent waterfall events and return opaque FsVersion tokens. FsInfo.version is the backend-derived freshness token (high-resolution stat identity), present observations authorize guarded replacement, and the backend performs atomic publication. tool-str-replace-editor resolves the session sandbox policy and delegates enforcement to this seam, so agent and user edits can share one policy layer.

This answers the critical question: a desktop editor can write files through the Harness filesystem primitive with workspace containment, permission policy, version guards, and atomic saves — no generic writeFile IPC is needed. What is missing is only a wire surface: the desktop JSON-RPC server cannot yet reach ctx.fs from the WebView.

## Recommended write architecture

ADAPTER + DESKTOP-ONLY, additive protocol v1:

1. desktop.fs.stat { sessionId, path } → { version, size, isFile } (resolve+stat through ctx.fs).
2. desktop.fs.read { sessionId, path } → bounded text (reuse the existing host read for the viewer; the editor uses this for open).
3. desktop.fs.edit { sessionId, path, content or edit request, expectedVersion } → calls ctx.fs.editText with expected { version } → returns { version } or a typed stale/conflict error.
4. desktop.fs.write { sessionId, path, content, expectedVersion? } → writeText with replaceIfVersion guard when expectedVersion is present.

The server resolves the live agent for sessionId and calls ctx.fs directly, so every save inherits the workspace containment, sandbox mode, permission waterfall, and atomic temporary-file+rename semantics already tested upstream. Version conflicts surface as explicit error codes the editor maps to UX. File version/mtime/hash: FsVersion is the supported token; no separate hash is required, and the opaque token must never be parsed client-side.

## Editor comparison

| | CodeMirror 6 | Monaco | Upstream components |
|---|---|---|---|
| Bundle size | ~300 KB core, grammars on demand | 2-5 MB plus workers | ReadBlock/CodeBlock exist but are viewers only |
| React integration | small wrapper or direct view API | react wrapper plus worker/service setup | native |
| Syntax highlighting | Lezer grammars; shiki path can be shared with upstream highlight.ts | Monarch + language services | shiki already used by upstream ReadBlock |
| Search/replace, line numbers, Cmd+S, dirty state | built-in or trivial | built-in | absent |
| Accessibility | strong | moderate | N/A |
| CSP | no eval, no workers required | workers via blob URLs; loader needs CSP review | shiki WASM already proven in the desktop shell |
| Localization | locale strings stay in the 7-locale desktop dict | same | same |

Recommendation: CodeMirror 6. It fits the existing Vite bundle, needs no worker/blob/eval expansion of the desktop CSP, integrates with the shiki-based highlighting already shipped upstream, and its transactions map cleanly onto whole-file saves with the ctx.fs version guard. Monaco is rejected despite VS Code heritage: its worker architecture and size are unjustified for a workspace editor whose language services Harness does not use.

## Quick Open architecture

DESKTOP-ONLY (SHIPPED in M5B). An in-memory path-only index over 'git ls-files --cached --others --exclude-standard' (NUL-separated, honors .gitignore, fixed argv) with a bounded directory walk outside git repositories (skips .git/.DS_Store, never descends symlinked directories, 200,000-file cap). The host builds it on the blocking pool; the frontend discards stale results and rebuilds lazily on watcher invalidations. Cmd+P fuzzy-filters the index (basename prefix above path subsequence, capped at 50 results); opening a result reuses the Files/Editor open path and activates an existing tab. No second durable index exists upstream and none is created: the agent's content search keeps using the Harness tool-fs-search ripgrep pipeline.

## File synchronization architecture (SHIPPED in M5B)

One non-authoritative change source feeds every surface: a Rust workspace watcher (notify crate) owned by the runtime manager, scoped to the current workspace and generation, emitting path-only invalidation batches over the workspace://changed Tauri event (100 ms coalescing, 512-path flood cap, full flag when truncated). The frontend coalesces at 150 ms, drops stale generations, and invalidates Files, Changes, Git status/diff, open editor buffers, and the Quick Open index. Buffers reconcile per path: clean buffers auto-reload and stay clean (cursor/scroll preserved), dirty buffers keep the draft and surface an external-change conflict (Review/Reload vs Keep my changes), deleted files keep the tab in a deleted state and are never recreated, and transient absence during reconnect never marks deletion. After a runtime restart, buffers survive in UI memory and reconcile once a session is live again. FsVersion stays the only data authority; the watcher never decides content or version. Upstream fs/observed remains the harness-internal write-observation record and is deliberately NOT forwarded (it only fires for ctx.fs tool operations and cannot see Finder/terminal/external editors).

## Conflict detection strategy

Optimistic concurrency on FsVersion: every save carries expectedVersion; a mismatch is a typed conflict error. External modifications are now detected proactively by the watcher (M5B): clean buffers auto-reload, dirty buffers enter an external-change conflict with Review/Reload and Keep my changes, and a later save with the stale version is still rejected by the guard — never a silent overwrite. Unsaved local changes are kept in memory only; a quit with dirty tabs pauses before any runtime teardown (Cancel / Discard and Quit / Save All and Quit).

## Git primitives found upstream

None. The repository has no git package, and the Harness has no Git service or tool; the M4 git_status/git_diff host capability is the only Git surface. M5 therefore extends it DESKTOP-ONLY with narrowly allowlisted commands, never arbitrary git argv.

## Stage/unstage/revert architecture

Fixed-argument host commands: git_stage_file(paths), git_unstage_file(paths), git_restore_file(paths) (unstaged discard), git_restore_staged_file(paths) (unstage+discard). The Rust host joins validated workspace-relative paths into one git invocation each with no shell. Destructive discard/revert always opens an explicit confirmation dialog naming the file and the operation; there is no commit, push, pull, fetch, branch, checkout, merge, rebase, or credential surface in M5.

## Hunk operations feasibility

Feasible but the last phase: stage/unstage/revert a hunk requires generating a patch and applying it with git apply --cached/--reverse over fixed templates. Pathspec and context-drift handling make this the riskiest surface; it is proposed only as M5D and only with the existing diff parser extended to emit apply-safe hunks.

## Diff architecture

Extend the M4 parser: unified view first, an optional side-by-side render built from the same hunk model if time allows; staged/unstaged selector driven by git_diff --cached vs the working tree; additions/deletions summary already exists. Rendering stays inert text with the token highlighter (or shared shiki for the editor); no raw HTML from repository content. File navigation uses the status list.

## Terminal persistence recommendation

DEFER. PTY sessions are runtime-generation-owned by design; persisting terminals across a runtime restart conflicts with the no-orphan guarantee and crash recovery semantics and buys little while scrollback is bounded. If requested later, the compatible form is per-session reopen with a recorded command echo, not process resurrection. Keep the M4 lifetime semantics.

## Desktop protocol impact

No protocol v2, and M5B adds no protocol methods at all: the watcher and quit guard ride the existing Tauri event/command surface (workspace://changed, desktop://quit-guard, and the quit_guard_arm/quit_now/workspace_files host commands), so the runtime single-executable and the JSON-RPC wire stay untouched. M5 adds optional additive v1 methods (desktop.fs.*, desktop.git.*) only where a capability needs the runtime; existing clients negotiate capabilities and ignore unknown methods. A version bump would only be justified by a breaking change to an existing method's semantics, which this design avoids.

## Localization impact

All M5 strings join the desktop strings namespace in en, zh, it, es, fr, de, pt-BR; the 100% coverage gate remains mandatory and the release gate stays unchanged. Editor and conflict dialogs ship all seven locales on day one.

## Security analysis

- Path traversal/symlinks/TOCTOU: containment + canonical resolution stay server-side in ctx.fs and the Rust host; the version guard closes the TOCTOU window at publication time.
- Atomic writes: the backend's temp-file+rename publication is reused unchanged.
- Concurrent agent/user edits: same FsVersion authority; last writer with a stale version fails loudly.
- Malicious filenames/large files/binary/encoding: host and service caps, binary rejection, and lossless text handling already apply; editor marks unsupported files read-only.
- Diff injection/ANSI: inert text rendering only; terminal output stays inside xterm.
- Git pathspec injection: allowlisted fixed argv with joined, validated paths; no user-provided flags.
- Destructive Git: explicit confirmations; no commit/push surface.
- CSP: CodeMirror adds no eval/worker requirement beyond the current self-origin policy.

## Upstream compatibility

| Change | Classification |
|---|---|
| ctx.fs read/stat/edit/write RPC adapter | ADAPTER |
| Editor UI, tabs, dirty/conflict UX | DESKTOP-ONLY |
| Quick Open index | DESKTOP-ONLY |
| git stage/unstage/restore host commands | DESKTOP-ONLY |
| Diff parser extension | DESKTOP-ONLY |
| Protocol desktop.fs.*/desktop.git.* | DESKTOP-ONLY (additive v1) |
| Native workspace watcher + quit guard | DESKTOP-ONLY (Rust host; no runtime/protocol change) |
| Quick Open index via git ls-files / bounded walk | DESKTOP-ONLY |
| fs/observed forwarding | none — REUSE (verified, not forwarded) |
| fs service changes | none — REUSE |
| Expected UPSTREAM PATCH count | 0 |

## Proposed M5 implementation phases

- M5A — editor foundation + safe read/write contract: desktop.fs.stat/read/write, CodeMirror shell, tabs, dirty, Cmd+S, open/close confirmation. SHIPPED: see docs/desktop/M5A-TESTING.md (editText was not needed for M5A; whole-file guarded writes cover the editor contract, and literal edits remain the agent tool's surface).
- M5B — live synchronization + external-change handling + Quick Open: native workspace watcher with generation-scoped path-only invalidation, clean/dirty/delete buffer reconciliation, quit guard with dirty tabs, Cmd+P git-aware index. SHIPPED: see docs/desktop/M5B-TESTING.md and .agents/notes/implemented/architecture/2026-08-19-desktop-m5b-live-sync-and-quick-open.md.
- M5C — staged/unstaged + file actions: git stage/unstage/restore commands with confirmations, staged/unstaged diff selector.
- M5D — hunk actions: only if the apply-safe hunk generator proves simple; otherwise document the limitation.
- M5E — regression/manual QA: extend M4-MANUAL-QA with editor saves, conflicts, and destructive confirmations on a fixture repository.

## Tests required for M5

Rust: stage/unstage/restore against fixture repositories, pathspec injection rejection, destructive confirmation contract. Vitest: editor dirty/save/conflict state machine, version-conflict mapping, tab lifecycle with unsaved confirmation, Cmd+P filtering, diff hunk model extension, localization completeness for all new strings. Integration: a real save through the packaged runtime verifying version bump and fs/observed refresh, plus the existing crash-reconnect and no-orphan regressions.

## Remaining architectural risks

- FsVersion semantics across agent and user writers must be exercised end-to-end (shared-version behavior is the one untested cross-writer assumption).
- Hunk-level git apply is the only surface that may be dropped or deferred.
- Rename is deliberately not followed (delete + create semantics): a renamed file keeps its old tab in deleted state until the user reopens it.
- Watcher flood in pathological trees (millions of files) is bounded by the burst cap and the 200,000-file index cap; the watcher itself stays uncapped by design because it only invalidates.
