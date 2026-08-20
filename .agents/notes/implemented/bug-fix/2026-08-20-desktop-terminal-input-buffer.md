# Agent Note: Desktop terminal submits and renders typed lines

Status: implemented

English | [中文](2026-08-20-desktop-terminal-input-buffer.zh.md)

## Problem

The desktop terminal rendered each typed xterm character locally but discarded it before the terminal request. Enter therefore sent an empty string, so a live PTY received no command despite the user seeing their input. Once complete lines reached the PTY, a second manual run exposed three presentation defects: normalized PTY newlines moved xterm vertically without returning to column zero, the spawn response and its output notification rendered the initial prompt twice, and the terminal driver echoed the same submitted line that xterm had already displayed locally. A later Ctrl+C run terminated the foreground process without restoring Bash’s prompt: process-directed SIGINT skipped the terminal control path that Bash uses to redraw after an interrupt. Closing and reopening a terminal also retained the prior PTY output because the inspector projection keyed it only by session. In the packaged app, xterm emitted Ctrl+C but the synchronous Tauri RPC command remained blocked in the long-running terminal-send request, so the interrupt request reached the runtime only after the command settled. The local line renderer also displayed Backspace as a control character instead of erasing the pending character.

## Decision

`TerminalTab` keeps the pending line in a ref, renders each key locally, and sends the exact buffered line only when Enter submits it. Ctrl+C, session replacement, and terminal close clear the pending line. The Tauri RPC command awaits the runtime response on a blocking worker, so a long-running terminal send never occupies the IPC executor and the xterm Ctrl+C signal reaches the runtime immediately. Backspace codes erase the pending character with a local backspace-space-backspace render. Xterm converts normalized newlines into carriage-return/newline pairs. The initial prompt is rendered only from the terminal output notification. After each submission, a stateful prefix consumes only the matching PTY echo; any mismatch is rendered unchanged. The xterm instance is owned by the selected appearance rather than a newly allocated palette; session and terminal values used by resize and input handlers come from refs. For Ctrl+C, the PTY backend verifies the foreground process group and writes the terminal control byte, so the terminal line discipline delivers the interrupt and Bash redraws its prompt. Other signals retain direct foreground-group delivery. The frontend does not draw a local `^C`; it renders the terminal’s real echo once. A changed terminal id replaces that session’s inspector output, and an explicit close releases both frontend PTY references before the inspector unmounts.

## Alternatives considered

**Send one RPC per keystroke.** Rejected: `desktop.terminal.send` is a serialized line operation, so per-key requests would not represent interactive shell input and would complicate command ordering.

**Wait for the PTY echo instead of rendering local input.** Rejected: the line-oriented transport adds visible latency to normal typing and removes immediate terminal feedback.

**Change the sanitizer to preserve carriage returns.** Rejected: its output is deliberately line-normalized. Xterm has a supported setting for that representation, which avoids changing the runtime stream shared by other clients.

**Disable terminal-driver echo.** Rejected: it would change the PTY behavior for every terminal consumer. The desktop canvas can remove only its own immediately preceding local echo.

## Testing

`apps/desktop/tests/terminal-core.spec.ts` proves complete, split, and mismatched local-echo handling. `apps/desktop/tests/terminal-tab.spec.ts` pins line conversion, one initial-prompt projection, buffered submission, and stable xterm ownership. The focused terminal and inspector suites pass. Manual packaged-app QA first showed an empty command submission, then showed duplicated and indented `echo hello` output after delivery, then showed a missing returned prompt after Ctrl+C, and finally showed a Ctrl+C signal queued behind the active terminal send plus visible Backspace control input. The PTY Ctrl+C regression test uses the same terminal control byte and confirms the active send settles at the returned prompt; the runtime-manager regression test proves an interrupt request settles while a prior request remains active, and the terminal-tab test pins local Backspace rendering. The physical key path requires a live recheck.

## Consequences

- Terminal commands typed in xterm reach the live PTY as complete lines and appear once.
- Normalized PTY output begins each new line at column zero, including the returned prompt.
- Inspector state updates do not recreate the xterm viewport or its input handler.
- Ctrl+C reaches the TTY line discipline without waiting for the active terminal-send response, so Bash echoes the interrupt and redraws its prompt.
- Backspace erases one unsubmitted local character instead of rendering a control character.
- Reopening a terminal begins with the new PTY output and does not report a second close of the old PTY.
- Cleanup from a previous runtime generation is an idempotent no-op when its live agent and PTY no longer exist.
- Terminal transport and PTY ownership remain line-oriented and unchanged.
