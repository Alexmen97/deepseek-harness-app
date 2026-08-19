# Agent Note: Desktop M5C.2 per-file Stage and Unstage

Status: implemented

English | [中文](2026-08-19-desktop-m5c2-stage-unstage.zh.md)

## Problem

M5C.1 made the Changes panel read-only: it rendered the porcelain-v2 model with a Staged/Changes split, but there was no way to move a file between the worktree and the index. Stage/Unstage had to be narrow, typed, and safe: fixed-argv git commands only, no shell, no generic exec, workspace containment enforced even when the repository root sits above the workspace, and dirty editor buffers never silently saved.

## Decision

The host adds two Tauri commands, `git_stage_file` and `git_unstage_file`, both taking one repository-relative path (the v2 model's native form). Stage runs `git add -A -- <path>`; the `-A` variant is required because plain `git add -- <path>` refuses a deleted worktree file, and for every other state it is identical. Unstage checks for HEAD with `git rev-parse --verify --quiet HEAD` (exit 1 in an unborn repository, never inferred from stderr text) and then runs `git restore --staged -- <path>` (git >= 2.23) or, in an unborn repo, `git rm -q --cached -- <path>`. All argv is fixed; the `--` separator is always present; git resolves the pathspec against the working directory, so the argv carries the workspace-relative path while `contained_git_path` (a containment variant that tolerates missing paths, for staging deletions) validates canonical containment.

Path conversion is one explicit layer: `workspace_rel_for` converts the repository-relative model path to the workspace-visible relative path by stripping the repo-root prefix (both sides canonicalized; git's --show-toplevel resolves symlinks like /var -> /private/var on macOS), and rejects paths outside the workspace with PATH_OUTSIDE_WORKSPACE before any git mutation. The v2 status response now carries `workspacePrefix`, and the frontend derives each row's workspace-visible path and insideWorkspace flag from it. Conflicted (`u`) rows reject both commands with UNSUPPORTED_GIT_STATE, because `git add` on a conflicted path would stage a resolution.

The frontend gains a pure operations core (`changes-core.ts`) with per-file pending state (idle/staging/unstaging), typed errors, duplicate-click blocking, and a server-confirmed refresh of status+diff after each successful operation; the workspace watcher is not treated as the authority for index changes. The Changes tab renders compact Stage/Unstage buttons derived only from the porcelain state (`actionsFor`), a localized dirty-buffer warning on Stage when the editor holds unsaved changes (never Save+Stage; Unstage never touches the editor), and localized error rows. Git version compatibility: `git restore --staged` requires git >= 2.23; the current macOS target ships 2.50.1.

## Alternatives considered

### Why `git add -A -- <path>` instead of `git add -- <path>`?

The brief specified `git add -- <path>`, but fixture evidence showed it fails on deleted worktree files ("pathspec did not match any files"), while M5C.2 explicitly requires staging deletions. `-A` with an explicit pathspec is identical for every other state and stays a fixed argv with the mandatory `--`.

### Why not unstage with `git reset -- <path>` for older git?

`git reset` has broader semantics than unstage (it can move HEAD) and would need careful justification; `git restore --staged` is the narrow index-only operation, and the brief forbids introducing reset merely for compatibility. The macOS target's git (2.50.1) supports restore; a too-old git fails loud with GIT_OPERATION_FAILED rather than silently falling back.

### Why not convert paths in the frontend?

The host already owns git and containment; a single Rust conversion layer keeps the repository-root prefix logic in one tested place and prevents a second competing path model in the UI. The frontend only derives the display/containment flags from `workspacePrefix`.

## Consequences

- Two narrow Tauri commands; no generic git/exec/shell surface exists. All git state is refreshed directly after an operation (never via fake watcher events).
- Deleted files stage their deletion and unstage back without ever being recreated; rename unstage follows git's own semantics (staged deletion of the original plus the new path back to untracked), documented and fixture-tested.
- Untracked files stage to A. and unstage back to ??; no deletion action exists in M5C.2.
- Unborn repositories unstage via `git rm -q --cached -- <path>` with the HEAD check as the explicit discriminator.
- Typed error categories (GIT_NOT_FOUND, NOT_GIT_REPOSITORY, PATH_OUTSIDE_WORKSPACE, PATH_NOT_FOUND, UNSUPPORTED_GIT_STATE, GIT_OPERATION_FAILED, WORKSPACE_UNAVAILABLE) travel as serialized structs; raw stderr appears only as a sanitized, capped technical detail.
- 7 new desktop strings ship in all seven locales (844 keys x 7, 100% coverage).
- The runtime single-executable and the desktop protocol stay untouched; only the Tauri invoke surface grows.
