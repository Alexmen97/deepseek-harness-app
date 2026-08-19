# Agent Note: Desktop M5C.1 porcelain-v2 git status model

Status: implemented

English | [中文](2026-08-19-desktop-m5c-v2-status-model.zh.md)

## Problem

The M4 Changes panel read the working tree through porcelain v1 (`git status --porcelain=v1`) and a single unified diff, so it could not tell staged from unstaged state, renames carried no original path, conflicts were invisible, and there was no structural basis for the M5C stage/unstage/discard commands.

## Decision

M5C.1 replaces the status read with a porcelain v2 model. The Rust host runs `git status --porcelain=v2 -z` (fixed argv, no shell) and parses the NUL-terminated records with a fixed header-token count per record kind: 7 tokens before the path for `1`, 8 plus the rename score for `2`, 9 for `u`, and the untracked path as the whole remainder of the `?` record. The `-z` contract never C-quotes paths, so a path is the verbatim remainder and may contain spaces, tabs, newlines, or non-ASCII bytes; rename entries emit the original path as its own NUL-delimited chunk, which the parse consumes on the next iteration. `u` (conflicted) entries are flagged `conflicted: true` in the JSON so the frontend never infers conflicts from XY codes. The host still runs git from the workspace root; porcelain v2 reports repository-root-relative paths even from a subdirectory, and the mutation layer (M5C.2+) re-validates every pathspec against the workspace root with `contained_path()` before any fixed-argv command.

The frontend projects the host JSON through a pure model (`inspector/git-model.ts`): staged (index side X of XY), unstaged (worktree side Y plus untracked), a separate untracked path list for the read-only policy, and conflicted rows that appear only in the conflicted set with a badge. The Changes panel renders Staged Changes and Changes sections from that single projection; the diff pane stays read-only until M5C.4 adds the staged/unstaged selector. Four new strings ship in all seven locales.

## Alternatives considered

### Why not keep parsing porcelain v1 and infer the split?

v1 line format has no rename original path, no conflict record, and ambiguous space-separated fields for paths with spaces; a split inferred from v1 codes would be lossy and would need rework for every M5C mutation command. The v2 -z model is the documented, lossless basis the architecture spike already specified.

### Why not parse porcelain v2 in the frontend?

The host owns git and already owns the narrow allowlisted command surface; parsing on the host keeps the wire minimal (structured JSON), keeps quoting and NUL semantics in one tested place, and matches the M5C security model where paths are validated in Rust before any mutation command.

## Consequences

- `git_status_v2` is the only status source for the Changes panel; the M4 `git_status` (v1) command stays for compatibility but the panel no longer calls it.
- The runtime single-executable and the desktop protocol stay untouched: the v2 command rides the existing Tauri invoke surface.
- Paths with spaces, newlines, tabs, and non-ASCII bytes round-trip verbatim (NUL-delimited, never quoted).
- Conflicted files render read-only with a badge; M5C ships no conflict-resolution actions.
- Rust fixtures pin rename originalPath, conflict rows, subdirectory workspaces, and weird filenames; Vitest pins the frontend split; the seven-locale i18n gate covers the new strings.
