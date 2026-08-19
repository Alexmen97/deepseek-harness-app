# Agent Note: Desktop M5C.3 tracked-worktree Discard

Status: implemented

English | [中文](2026-08-19-desktop-m5c3-discard.zh.md)

## Problem

M5C.2 could move files between the worktree and the index, but nothing could undo a tracked worktree change. Discard is destructive, so the milestone had to define exact eligibility from the porcelain-v2 state, block it for dirty editor buffers, revalidate the current state immediately before the mutation, and never touch untracked files or conflict resolution.

## Decision

The host adds `git_discard_file`, which runs `git restore --worktree -- <path>` (fixed argv, mandatory `--`, workspace containment first, then fresh porcelain-v2 revalidation). Fixture evidence on git 2.50.1 fixed the eligibility model: discard restores the worktree to the INDEX version, not necessarily HEAD - staged+unstaged (MM) becomes M. with the staged change intact, MD recreates the file from the index, AM restores the index blob. Y = M or D with X in {., M, A} is eligible; staged-only (Y = .), staged deletions (X = D, where restore fails because the index holds no worktree blob), rename/copy entries (X = R/C, where one-command semantics are ambiguous and no multi-command restoration is invented), untracked (??), and conflicted (u) are all UNSUPPORTED_GIT_STATE. The worktree is the only thing mutated; the index and HEAD stay intact.

The frontend shows a Discard Changes button (destructive visual, explicit label, accessibility label) only for eligible rows, derived from the same eligibility rules in `git-model.ts`. Clicking opens a confirmation dialog with the localized title, the relative path, a state-accurate consequence (with a staged-side variant: 'restores the worktree file to the staged version; staged changes remain staged'), and Cancel / Discard Changes. A dirty CodeMirror buffer blocks the action with a localized explanation: the guard lives in the operations core (`isDirty` option) and never invokes the host - it is a UI data-loss guard, not a filesystem security boundary, and the host still validates git/path state independently (documented in the code). After success the existing M5B watcher invalidates, ctx.fs revalidates, clean buffers reload, and the core refreshes the porcelain-v2 model and diff immediately; no content is injected from Rust.

## Alternatives considered

### Why revalidate in the host instead of trusting the clicked row?

Discard is destructive; the row may be stale (another tool, terminal, or watcher changed the state). The host re-reads porcelain v2 for the path immediately before `git restore`, so a stale UI row is refused with UNSUPPORTED_GIT_STATE or GIT_STATE_CHANGED and the UI refreshes - no destructive action under stale assumptions. A git-state token was considered and rejected: immediate revalidation is simpler and sufficient.

### Why not enable discard for staged deletions or renames?

Fixture evidence showed `git restore --worktree` fails on a staged deletion (the index records the deletion, so there is no blob to restore) and is a no-op on a staged rename (the worktree already matches the index). The brief prefers safety over completeness: those states are UNSUPPORTED rather than guessed.

### Why is the dirty-editor block frontend-only?

The Rust host has no CodeMirror knowledge, and the brief's trust boundary says a frontend-only block is a UI data-loss guard, not a filesystem security boundary. The host validates git and path state independently; the core refuses to call the host for a dirty path (DIRTY_EDITOR_BLOCK typed error, no host invocation).

## Consequences

- One narrow Tauri command; no generic git/exec/shell; `--` always present; containment (workspace below repo root, ../, absolute, symlink escape) enforced before any git state read.
- Untracked files have no discard/delete UI and the host refuses them; no git clean, no stash, no hidden backup files, no undo promise.
- Conflicts are never touched: `git restore` is never used as accidental conflict resolution.
- 9 new desktop strings in all seven locales (853 keys x 7, 100% coverage).
- The runtime single-executable and the desktop protocol stay untouched; only the Tauri invoke surface grows.
