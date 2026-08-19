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

## M5C.2 — per-file Stage / Unstage

### Rust (apps/desktop/src-tauri, cargo test)

- `commands::tests::git_stage_and_unstage_*` — real fixture repos: tracked modified (M. then .M), untracked (A. then ??), deleted (D. via `git add -A --`, .D via `git restore --staged --`, file never recreated), rename staged as R. with originalPath and unstaged into git's own split (staged deletion of the original + untracked new name), dash-leading/space/Unicode/nested filenames.
- `commands::tests::git_mutations_enforce_workspace_containment_below_repo_root` — workspace below the repository root: mutation inside the workspace allowed, same-repository outside-workspace path rejected (PATH_OUTSIDE_WORKSPACE), `../` and absolute inputs rejected, symlink escape rejected.
- `commands::tests::git_unstage_unborn_repository_uses_rm_cached` — unborn repo (no HEAD): stage via `git add -A --`, unstage via `git rm -q --cached --` returns the file to untracked.
- `commands::tests::git_mutations_reject_conflicted_paths` — a porcelain `u` path rejects both stage and unstage with UNSUPPORTED_GIT_STATE (git add would stage a resolution).
- `commands::tests::contained_git_path_*` — containment variant that tolerates missing paths (staging deletions) while rejecting escapes.
- `commands::tests::git_status_v2_reports_workspace_prefix_for_subdirectory_workspaces` — workspacePrefix when the workspace is below the repo root.

### Vitest (apps/desktop/tests)

- `changes-core.spec.ts` — refresh on demand; stage/unstage call the host then refresh status+diff (server-confirmed); duplicate clicks while pending are no-ops; typed errors surface and keep the model unchanged; a later success clears a previous error; subscribers notified.
- `git-model.spec.ts` — toWorkspacePath mapping (repo-relative to workspace-visible, outside rows undefined), insideWorkspace flags, actionsFor derived from the porcelain state (untracked Stage, staged Unstage, staged+unstaged both, conflicted none, outside none), stageDirtyWarning only for dirty buffers inside the workspace.
- Localization: 7 new keys (Stage, Unstage, Staging…, Unstaging…, dirty-buffer warning, operation-failed, outside-workspace badge) in all seven locales; `desktop:i18n:check` at 844 keys x 7 locales.

### Manual QA record

The interactive pass of the full flow list (M5C.2 items 1-22 in the milestone brief) is scheduled for M5C.5 on a disposable git fixture. The mutation semantics (stage/unstage round trips, containment, dirty-buffer warning, per-file pending/error states) are pinned by the automated suites above.

## CI fix (M5C.2)

- `scripts/prepare-desktop-rust-tests.mjs` now stages the `dsh-desktop-runtime-spawn-helper` placeholder alongside the runtime placeholder, closing the CI Desktop failure (M5B.2/M5C.1) where tauri.conf.json declared the spawn-helper bundle resource but the deterministic staging script did not create it; `check-desktop-rust-resources.mjs` now passes in a clean checkout.
