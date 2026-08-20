# Agent Note: Desktop M5C.4 staged/unstaged diff viewer

Status: implemented

English | [中文](2026-08-19-desktop-m5c4-diff-viewer.zh.md)

## Problem

M5C.1-M5C.3 could stage, unstage, and discard, but the Changes panel showed only a single global diff: a file with both staged and unstaged changes was ambiguous, and the user could not answer 'what will be committed?' versus 'what is still only in my worktree?'. The M5C.4 milestone adds per-file staged/unstaged diff inspection with exact Git semantics.

## Decision

The host adds `git_diff_file(path, cached)`, a narrow command running `git diff -- <path>` or `git diff --cached -- <path>` (fixed argv, mandatory `--`, containment first). The result carries the diff text plus `tooLarge` (the existing 512 KiB cap is reported, never silently truncated) and `binary` flags (detected from the `Binary files ... differ` / `GIT binary patch` markers; binary payload is never rendered). Fixture evidence on git 2.50.1 pinned the semantics: for index B / worktree C, `--cached` shows A->B and plain shows B->C (never A->C); a staged new file renders the full addition; untracked paths return an empty diff (the UI shows 'Untracked file - no Git diff available', no fake patch); deletions render without the worktree file; a per-path rename diff shows as new-file because git diff does not emit rename metadata per path - the porcelain v2 originalPath stays the rename metadata source, documented as a limitation.

The frontend core holds the session-only selection: `select(path, from)` defaults the mode from the clicked section (Staged Changes -> staged, Changes -> unstaged), `setMode` switches the selector, and a per-mode diff cache dedupes requests within one Git snapshot. Every refresh invalidates that cache and rejects results from an older generation, so external worktree or index changes cannot leave a selected mode showing a stale patch. After every git operation the refresh keeps the same logical file when it still exists in another section (switching the mode when needed) and drops the selection when the file disappears - no dead blank panel. The diff pane renders through the existing unified parser extended with old/new line numbers derived from hunk headers (`@@ -a,b +c,d @@`), a compact Staged|Unstaged selector when both sides exist, previous/next navigation over unique changed paths, an Open File action (disabled for unstaged deletions), localized empty states (no staged/unstaged changes, too large, binary, conflict read-only), and a rename-only state. Diff content stays untrusted text rendered through React text nodes; nothing affects the CSP.

## Alternatives considered

### Why a per-path host command instead of reusing the global diff?

The global diff cannot separate the staged and unstaged sides of one file and would need client-side re-slicing; a narrow `git diff --cached -- <path>` command is the exact Git primitive with containment, fixed argv, and the cap/binary flags in one tested place.

### Why keep 512 KiB as the cap instead of raising it?

The M4 cap remains appropriate: oversized diffs are reported as too-large with a localized message rather than freezing the UI or truncating silently. The parser runs once per selection and is memoized by the mode cache; no virtualization or new dependency was justified for the measured sizes.

### Why is rename metadata taken from porcelain v2 rather than the diff?

git diff with a single path does not emit rename metadata (it shows the new file mode); reconstructing similarity from porcelain alone would duplicate logic and could disagree with git. The UI shows the originalPath badge from the model and the rename-only state when the diff has no hunks, and the limitation is documented.

## Consequences

- One narrow Tauri command; no generic git/exec/shell; per-path containment enforced; index-only diffs never consult the watcher (direct refresh after operations).
- Selection continuity after Stage/Unstage/Discard: the same logical file follows across sections; deterministic empty state otherwise.
- Untracked files show no fake diff; conflicts render read-only with no resolution shortcuts; binary payloads are never rendered.
- 14 new desktop strings in all seven locales (867 keys x 7, 100% coverage).
- The runtime single-executable and the desktop protocol stay untouched; only the Tauri invoke surface grows.
