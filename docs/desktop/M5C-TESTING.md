# M5C testing record — staged/unstaged git change management

Scope: the M5C feature surface (docs/desktop/M5C-ARCHITECTURE.md). This file records what each shipped phase is pinned by; the interactive QA record will extend it at M5C.5.

## M5C.1 — porcelain-v2 status model and the Staged/Changes split (read-only)

### Rust (apps/desktop/src-tauri, cargo test)

- `commands::tests::git_status_v2_*` — porcelain v2 -z parsing over real fixtures: staged + unstaged pairs (MM), staged rename with a space in both names (path + originalPath from the NUL-delimited chunk), staged deletion, untracked, conflict entries (u/UU, conflicted flag), repository-root-relative paths when the workspace is a repo subdirectory, dash-prefixed and non-ASCII filenames, and non-git workspaces reporting repository: false.

### Vitest (apps/desktop/tests)

- `git-model.spec.ts` — the Staged Changes / Changes / untracked / conflicted split, rename originalPath passthrough, conflicts kept out of the staged and unstaged sets, missing and non-repository status, clean-repository sections, and stable sort without input mutation.

### Localization

- Four new keys (`changes.staged`, `changes.stagedEmpty`, `changes.changes`, `changes.conflicted`) ship in all seven locales; `desktop:i18n:check` passes at 837 keys x 7 locales.

### Manual QA record

M5C.1 is read-only (no stage/unstage/discard actions yet): the interactive pass for the destructive flows belongs to M5C.5 on a real repository. The v2 model and split are pinned by the automated suites above.
