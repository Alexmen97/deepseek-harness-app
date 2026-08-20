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

## M5C.3 - tracked-worktree Discard

### Rust (apps/desktop/src-tauri, cargo test)

- `commands::tests::discard_modified_tracked_restores_head_content` - .M discard restores HEAD content and leaves the worktree clean.
- `commands::tests::discard_staged_and_unstaged_restores_index_not_head` - mandatory case: index B + worktree C, discard -> worktree B, status M. (staged remains, unstaged disappears).
- `commands::tests::discard_staged_modified_worktree_deleted_recreates_from_index` - MD recreates the file from the index.
- `commands::tests::discard_deleted_tracked_restores_the_file` - .D restores the deleted file.
- `commands::tests::discard_rejects_staged_deletion` - D. is UNSUPPORTED (git restore --worktree fails when the index holds the deletion).
- `commands::tests::discard_rejects_staged_only_and_untracked_and_rename_and_conflict` - M. / ?? / R. / u all refuse with UNSUPPORTED_GIT_STATE; untracked files stay untouched.
- `commands::tests::discard_revalidates_state_and_rejects_stale_or_missing_paths` - fresh-state revalidation before the destructive mutation; missing paths report GIT_STATE_CHANGED.
- `commands::tests::discard_enforces_workspace_containment` - workspace subdirectory: inside allowed, outside/../absolute rejected with PATH_OUTSIDE_WORKSPACE.

### Vitest (apps/desktop/tests)

- `git-model.spec.ts` - isDiscardEligible matrix (Y=M/D with X in {., M, A}; M., D., ??, R., conflict, outside all false), hasStagedSide for the confirmation copy, discardBlockedReason (dirty editor inside workspace blocks; clean and outside never), actionsFor now returns changes as an array including 'discard'.
- `changes-core.spec.ts` - discard success refreshes and clears errors; dirty editor blocks WITHOUT invoking the host (DIRTY_EDITOR_BLOCK typed error); discarding pending state and duplicate-click prevention; typed GIT_STATE_CHANGED error keeps the model unchanged.
- Localization: 9 new keys (discard, discardTitle, discardConsequence, discardConsequenceStaged, discardBlockedDirty, discarding, stateChanged, cannotDiscard, cancel) in all seven locales; desktop:i18n:check at 853 keys x 7 locales.

### Manual QA record

The interactive QA record lives in docs/desktop/M5C-MANUAL-QA.md.

The interactive discard flows (tracked modified, staged+unstaged, dirty block, deleted restore, cancel/confirm, dash file, subdir containment, no crash, Cmd+Q, no orphan) are scheduled for M5C.5 on a disposable fixture; the semantics are pinned by the automated suites above (honest label: automated only).

## M5C.4 - advanced staged/unstaged diff UX

### Rust (apps/desktop/src-tauri, cargo test)

- `commands::tests::git_diff_file_staged_and_unstaged_sides_of_the_same_file` - mandatory case: HEAD A / index B / worktree C; staged diff shows A->B, unstaged shows B->C (never A->C on either side).
- `commands::tests::git_diff_file_new_staged_and_untracked_and_deletions` - staged new file renders the full addition (`new file mode`); untracked returns an empty diff (no fake patch); unstaged and staged deletions render the removal without needing the worktree file.
- `commands::tests::git_diff_file_detects_binary_without_payload` - binary diff detected via the `Binary files ... differ` marker; the payload is flagged and never rendered.
- `commands::tests::git_diff_file_enforces_workspace_containment` - per-path diff rejects outside-workspace, `../`, and absolute inputs before any git read.

### Vitest (apps/desktop/tests)

- `diff.spec.ts` - line numbers derived from hunk headers (context old/new, addition new-only, deletion old-only) and parseHunkHeader.
- `changes-core.spec.ts` - select() defaults the mode from the clicked section and loads the per-mode diff; setMode switches without reloading cached diffs; refresh keeps the selection on the same file when it still exists (mode switches when needed) and drops it when the file disappears.
- Localization: 14 new keys (unstaged, diffMode, noStagedChanges, noUnstagedChanges, binaryChanged, diffTooLarge, prevFile, nextFile, openFile, renameOnly, diffSelectFile, diffLoading, untrackedNoDiff, diffConflictReadOnly) in all seven locales; desktop:i18n:check at 867 keys x 7 locales.

### Manual QA record

The interactive diff flows (row click default modes, selector, prev/next, staged vs unstaged sides, binary, rename, open-file, selection continuity, no stale diff, Cmd+Q, no orphan) are scheduled for M5C.5 on a disposable fixture; the semantics are pinned by the automated suites above (honest label: automated only).

## M5D - safe hunk-level Git operations

### Rust (apps/desktop/src-tauri, cargo test)

- `commands::tests::hunk_stage_unstage_discard_middle_of_three` - the central acceptance fixture: a file with three separated textual hunks; Stage Hunk applies only the middle hunk to the index (staged=1, unstaged=2), Unstage Hunk reverses only it (unstaged=3), Discard Hunk reverts only one worktree hunk (unstaged=2).
- `commands::tests::hunk_same_file_staged_and_unstaged_stay_semantically_separate` - HEAD A / index B / worktree C matrix: staging one hunk then editing a new location keeps the staged and unstaged sides semantically separate, and discarding one unstaged hunk leaves the staged side intact.
- `commands::tests::hunk_stale_token_and_missing_hunk_fail_typed` - a stale diff token returns GIT_DIFF_STALE and an unknown hunk identity returns HUNK_NOT_FOUND; no patch is applied.
- `commands::tests::hunk_rejects_binary_and_untracked_and_non_textual` - binary diffs and untracked files return HUNK_UNSUPPORTED.
- `commands::tests::hunk_supports_weird_filenames_with_spaces` and `hunk_supports_unicode_filenames` - patch headers for spaces, leading dash, and non-ASCII names round-trip through git apply.
- `commands::tests::hunk_works_with_repo_root_above_workspace_subdir` - workspace containment holds when the repository root sits above the workspace; repo-relative paths are used.

### Vitest (apps/desktop/tests)

- `diff.spec.ts` - hunk identity (FNV-1a of header + raw body) is stable and matches the Rust host token format.
- `git-model.spec.ts` - hunkActionsFor returns per-mode actions only for eligible tracked textual rows; staged-new (A.), delete-only (.D), untracked, rename, copy, conflicted, and outside-workspace rows offer no hunk actions.
- `changes-core.spec.ts` - stageHunk/unstageHunk/discardHunk route path+hunkId+diffToken to the host; Discard Hunk is blocked while the editor buffer is dirty (DIRTY_EDITOR_BLOCK); pending state is tracked per hunk and cleared after the host settles.

### Localization

- 9 new keys (stageHunk, unstageHunk, discardHunk, discardHunkTitle, discardHunkConsequence, hunkStale, hunkNotFound, hunkUnsupported, hunkApplyFailed) in all seven locales; desktop:i18n:check at 877 keys x 7 locales.

### Manual QA record

The interactive hunk flows (3-hunk fixture, stage middle, staged diff shows only middle, unstage middle, discard one, dirty-editor block, stale diff token, same file staged+unstaged, filename with spaces, no WebView crash, diff refresh/navigation, quit, no orphan) are scheduled for the preview.3 QA pass on a disposable fixture; the semantics are pinned by the automated suites above (honest label: automated only).

## CI fix (M5C.2)

- `scripts/prepare-desktop-rust-tests.mjs` now stages the `dsh-desktop-runtime-spawn-helper` placeholder alongside the runtime placeholder, closing the CI Desktop failure (M5B.2/M5C.1) where tauri.conf.json declared the spawn-helper bundle resource but the deterministic staging script did not create it; `check-desktop-rust-resources.mjs` now passes in a clean checkout.
