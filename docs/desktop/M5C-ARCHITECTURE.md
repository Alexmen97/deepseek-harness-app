# M5C architecture spike — Git change management & advanced diff

Design record only; M5C is NOT implemented. Every proposal is DESKTOP-ONLY over the existing narrow host Git capability; no upstream package changes.

## Scope

IN: staged vs unstaged state, stage file, unstage file, discard/revert file, staged diff, unstaged diff, improved diff navigation, optional hunk operations only if provably safe.

OUT (explicitly): commit, push, pull, fetch, branch create/delete, checkout/switch, merge, rebase, reset --hard, remote credentials, automatic staging.

## Git authority

Upstream has no Git service; M4 introduced the desktop-host Git capability (git_status, git_diff) and M5B adds workspace_files. M5C extends the same host with fixed-argv allowlisted commands. Never exposed: generic git(args[]) with caller-supplied argv, shell command strings, arbitrary process execution. Every command is invoked with a fixed argv template, joined workspace-validated paths, and -- before pathspecs.

## Repository-root security model

The workspace may be the repo root, a subdirectory of a repo, or a non-git directory. Rule: the desktop UI may only mutate paths inside the selected workspace, even when the git repository root is above it. The host resolves the repo root read-only (git rev-parse --show-toplevel) for status/diff, but every mutating pathspec is validated against the workspace root with the existing contained_path() canonical-containment check (no .., no absolute paths, no symlink escape) before it is joined into the fixed-argv command. Non-git workspaces and git-missing hosts render read-only states with the existing reason codes (git-not-found / no-repository).

## Staged / unstaged state model

One state model derived from git status --porcelain=v2 -z (NUL-delimited, no whitespace splitting). Verified on this host: entries 1 <XY> ... <path> (tracked), 2 <XY> ... <path> <origPath> (rename), u <XY> ... <path> (conflict), ? <path> (untracked). The model per path: path, originalPath (rename), index status X and worktree status Y from XY, untracked, conflicted (u entries) if present.

The model is computed once per refresh in the Rust host and serialized to the frontend; there is no second competing Git state store (the M4 porcelain-v1 git_status surface is replaced by the v2 model for M5C, and the M5B watcher remains the only invalidation source).

## Stage / unstage / discard: exact argv and verified semantics

Verified on this host with a fixture matrix (git 2.x):

| Operation | Command (fixed argv) | Verified behavior |
|---|---|---|
| Stage | git add -- <path> | Tracked modified, untracked, added, and deleted paths (stages the deletion); rename sides staged with the same command. |
| Unstage | git restore --staged -- <path> | Tracked modified; added file (back to untracked); staged rename; staged deletion (index entry restored). |
| Unstage (unborn repo, no HEAD) | git rm --cached -- <path> | Verified: git restore --staged fails with fatal: could not resolve HEAD (exit 128); git rm --cached succeeds for added files. |
| Discard unstaged | git restore --worktree -- <path> | Tracked modified; deleted file (recreated from the index); worktree side of a staged rename. |
| Untracked file | (no command) | git restore refuses (pathspec did not match any file(s) known to git); deletion requires git clean, which is EXCLUDED from M5C. See untracked policy. |

Special cases handled in the host: dash-prefixed filenames (verified: git add/restore/rm -- <dash-path> work; the -- separator is mandatory and always present); conflicted entries render read-only with a conflict badge (no resolution actions in M5C); deleted files stage/unstage the index deletion and discard restores the worktree file (the tab reappears via the existing watcher); renames are tracked as path + originalPath and operations act on the new path (git resolves the pair; no rename heuristics in the UI).

## Untracked-file policy

Discarding an untracked file deletes user data. M5C ships NO untracked deletion: the discard action is offered only for tracked paths; untracked paths render read-only. A later milestone may add deletion with an explicit two-step confirmation naming the path and the consequence, only if the UX and implementation are clearly safe (not in M5C).

## Dirty-editor interaction

Rule: a destructive Git action on a path with a dirty editor buffer is BLOCKED; the UI resolves the editor state first. Dirty buffer + discard: the action is disabled with an explicit message; the user must save, reload, or close the tab first — no silent discard of an unsaved draft. Dirty buffer + stage/unstage: staging acts on DISK content only (a dirty CodeMirror buffer is not on disk); the UI shows an informational indicator (for example Stages the saved version) and never silently saves before staging. No automatic staging. Clean buffer + any Git operation: the operation runs, the M5B watcher invalidates, ctx.fs revalidates, and the editor adopts the new state via the existing reconcile path (clean reload / deleted state) — no app reload.

## Staged / unstaged diff modes

Unstaged: git diff -- <path> (working tree vs index). Staged: git diff --cached -- <path> (index vs HEAD). New files: diff --cached renders the added content; the unstaged diff is empty for a staged-only addition. Deleted files: the diff renders the removal and the file tree reflects it. Binary files: no diff text; a binary badge (existing binary detection reused). Renames: rendered as the new-path diff with the original path on the row. No diff: empty-state text. Rendering stays inert text (existing diff parser + token highlighter); no raw HTML from repository content.

## Stage / unstage / discard UX

The Changes panel separates Staged Changes and Changes sections from the same v2 model. Row actions: Stage, Unstage, Discard (tracked only). Stage All / Unstage All are optional; include them only if trivially safe (fixed argv with the validated path list, confirmed non-destructive). Discard always opens a confirmation naming the relative path, the operation, and the consequence (reverts the saved version of this file); never icon-only destructive controls.

## Hunk operations

Feasibility: implementable as patch-derived git apply (stdin patch, fixed argv: git apply --cached / --reverse / --recount), but the risk surface is large: context drift, malicious path headers, binary/rename patches, stale diffs between parse and apply, and regenerating the patch from a parsed hunk model. Classification: DEFER TO M5D. M5C ships no hunk actions; the diff parser is extended only to carry hunk boundaries for navigation.

## Git path security audit

Paths beginning -: neutralized by the mandatory -- separator (verified). Newlines/tabs/NUL: porcelain v2 -z and ls-files -z are NUL-delimited; filenames with newlines parse losslessly and render as text. Unicode: pass-through as bytes; no normalization that could change the path. Symlinks and relative escape: every pathspec passes contained_path() (canonical containment within the workspace) before joining. Repo-root containment: see the security model above. Command injection: fixed argv only; paths are separate argv elements, never interpolated into a shell string.

## Refresh / synchronization design

After any Git operation: refresh the v2 status model and the appropriate diff (staged or unstaged for the affected path), preserve the selected change where possible, refresh Files only when the filesystem changed (delete/restore paths), and let the editor adopt through the existing watcher + ctx.fs reconcile. No full application reload. The M5B watcher remains the single invalidation source; Git operations do not create a second refresh path.

## Protocol / Tauri impact

All M5C operations are Rust host commands (stage_file, unstage_file, restore_file, git_diff_at with --cached) over the existing Tauri IPC — no runtime changes, no JSON-RPC protocol additions, no desktop protocol version bump. The status model rides a new host command returning the v2 model; the frontend stores it as the single Git projection.

## Localization

Every new M5C string ships in en, zh, it, es, fr, de, pt-BR with the existing 100% coverage gate (desktop:i18n:check); the destructive-action confirmation strings are in the seven-locale matrix from day one.

## Tests required

Rust (fixture repositories, fixed argv, no shell): stage tracked modified / untracked / deletion / rename pair; unstage tracked / added / staged deletion / unborn repo (rm --cached); discard tracked modified / deleted (restore) / worktree side of a rename; staged + unstaged same file; rename; deleted file; weird filenames (newline, tab, unicode), path beginning -; workspace as repo subdirectory with mutations outside the workspace rejected; non-git workspace; git missing; command-injection resistance (path with shell metacharacters stays one argv element).

Frontend (Vitest): v2 model parsing (rename originalPath, conflict rows, untracked); Changes panel split (Staged vs Changes) and stage/unstage/discard actions; dirty-editor blocking rule and the stage-on-disk indicator; discard confirmation content (path, operation, consequence); watcher-driven refresh after operations; localization completeness for new strings.

## M5C implementation phases

- M5C.1 — v2 status model host command + parser + Changes split, read-only. SHIPPED: see docs/desktop/M5C-TESTING.md.
- M5C.2 — stage/unstage commands + UI (with the dirty-editor rules).
- M5C.3 — discard (tracked only) + confirmations + dirty blocking.
- M5C.4 — staged/unstaged diff selector + diff navigation.
- M5C.5 — regression + interactive QA (extends M5B-MANUAL-QA.md).

## Remaining risks

- Unborn-repo and worktree-edge semantics (git worktrees) need fixture coverage before shipping.
- Porcelain v2 differs across git versions; the parser must tolerate the sub-status fields it does not use.
- Discard of a staged deletion (index vs worktree mismatch) needs explicit fixture tests.
- Interactive QA for destructive flows must run on a real repo (the M5B.1 session showed the built app needs a stable environment for such flows).

## Recommendation for preview.2

Ship preview.2 as M5B ONLY: M5B.1 closed three packaging/rendering bugs and two editor-sync gaps found interactively, but two open blockers remain for the editor/terminal story (the quit-guard dialog + Cmd+Q WebView reload, and the terminal-output WebView crash), and M5C destructive flows need their own QA cycle. Recommend M5B + M5C for a later preview once those blockers and the M5C interactive QA are closed.
