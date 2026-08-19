# M5B testing record — live sync, external-change handling, Quick Open, quit guard

Scope: the M5B feature surface. Regression status and the full gate list live in the M5B final report; this file records what each surface is pinned by.

## Rust (apps/desktop/src-tauri, cargo test)

- `workspace_watcher::tests` — path-only classification (nested files, .git/.DS_Store filtering, outside/root drop, symlink containment), burst coalescing and the 512-path flood cap, and a real FSEvents delivery test on a temp workspace.
- `manager::tests::workspace_watcher_*` — generation-scoped events, watcher stopped with the runtime, watcher restarted with a new generation after runtime restart.
- `manager::tests::quit_guard_*` — arm/disarm, quit-guard request emission, request_quit disarms before exiting.
- `commands::tests::workspace_files_*` — git index honors .gitignore, bounded walk skips .git/.DS_Store and symlinked directories.

## Vitest (apps/desktop/tests)

- `editor-reconcile.spec.ts` — clean+external modify (auto reload), dirty+external modify (conflict, draft kept), dirty+unchanged (stays dirty), keep-changes then stale save rejected, reload adopts disk, clean/dirty delete (tab stays, never recreated), deleted+reappear, reconnect reconcileAll (clean adopts / dirty-unchanged keeps / dirty-changed conflicts), transient absence never marks deletion, saveAll conflict reporting, dirtyPaths ordering.
- `filesync.spec.ts` — burst coalescing into one delivery, stale-generation drops, reset semantics, flood-cap invalidate-all, post-full batches still deliver.
- `quick-open-core.spec.ts` — index metadata, subsequence matching, basename-prefix ranking, same filename in different dirs, empty query ordering, result cap, malicious filenames.
- `quit-guard.spec.ts` — guard armed on first dirty buffer, quit request surfaced and cancel keeps everything alive, discard disarms then exits, Save All quits only when every save succeeds.
- Existing suites stay green: editor-core, store-core, diff, boot-guard, eval-sites, versions, release-workflow, desktop-ci-resources.

## Manual QA record

Interactive QA was not performed in the M5B implementation session (no GUI session was driven); the surfaces above are pinned by the automated suites. The next interactive QA pass should walk: external-edit banner on a dirty buffer, clean-buffer auto reload, Finder delete keeping the tab, Cmd+P navigation, the Cmd+Q dialog paths, and buffer reconciliation after a runtime restart (steps mirror the Vitest/Rust cases above). The desktop app targets macOS arm64; Windows is out of scope for the watcher verification (notify platform backends).
