# Agent Note: Safe hunk-level Git operations (M5D)

Status: implemented

English | [中文](2026-08-20-desktop-m5d-hunk-git-actions.zh.md)

## Problem

The Changes panel could stage, unstage, or discard a whole file but not a single hunk, so one file with several independent edits forced an all-or-nothing mutation. The blocker was safety: applying a frontend-supplied patch or a stale hunk could mutate the wrong lines or leak out of the workspace.

## Decision

Hunk actions are server-derived and token-guarded. The frontend sends only the path, the diff side (cached boolean), the hunk identity, and the diff token of the diff it rendered; it never sends patch text. The Rust host re-reads the current diff, verifies the diff token, re-identifies the hunk by its content-derived identity, rebuilds the patch from the fresh server-side diff, and applies it with a fixed argv through stdin:

- Stage Hunk: git apply --cached --recount -
- Unstage Hunk: git apply --cached --reverse --recount -
- Discard Hunk: git apply --reverse --recount -

Semantics were proven on disposable real Git fixtures before implementation: staged middle of three hunks, unstaged middle back, discarded one of the rest, same file staged+unstaged, paths with spaces, Unicode and leading dash, and workspace below the repo root. The frontend blocks Discard Hunk while the editor buffer is dirty and blocks hunk actions for untracked, binary, conflicted, rename, delete-only, and too-large diffs; staged-new files are excluded because partial unstage of a new file is not robust in git.

## Verification

Rust fixture tests cover stage/unstage/discard of the middle of three hunks, same-file staged+unstaged, stale token, missing hunk, binary/untracked rejection, weird filenames, and sub-workspace roots. Frontend tests cover routing, dirty-editor blocking, pending state, and per-hunk controls.

## Alternatives considered

**Let the frontend build and send the patch.** Rejected: patch injection and stale-context risk; the host re-derives the patch.

**Reuse hunk array index.** Rejected: indices shift after any apply; content-identity plus diff token is deterministic.

## Consequences

- Per-hunk Stage/Unstage/Discard are safe and type-typed; stale or injected requests fail closed.
- Existing file-level operations, FsVersion safety, and the fixed git surface are unchanged.

<!-- agent-note-format: alternatives-recorded -->
