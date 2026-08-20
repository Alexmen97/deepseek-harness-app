# Agent Note: Desktop terminal submits and renders typed lines

Status: implemented

English | [中文](2026-08-20-desktop-terminal-input-buffer.zh.md)

## Problem

The desktop terminal rendered each typed xterm character locally but discarded it before the terminal request. Enter therefore sent an empty string, so a live PTY received no command despite the user seeing their input. Once complete lines reached the PTY, a second manual run exposed three presentation defects: normalized PTY newlines moved xterm vertically without returning to column zero, the spawn response and its output notification rendered the initial prompt twice, and the terminal driver echoed the same submitted line that xterm had already displayed locally.

## Decision

`TerminalTab` keeps the pending line in a ref, renders each key locally, and sends the exact buffered line only when Enter submits it. Ctrl+C, session replacement, and terminal close clear the pending line. Xterm converts normalized newlines into carriage-return/newline pairs. The initial prompt is rendered only from the terminal output notification. After each submission, a stateful prefix consumes only the matching PTY echo; any mismatch is rendered unchanged. The xterm instance is owned by the selected appearance rather than a newly allocated palette; session and terminal values used by resize and input handlers come from refs.

## Alternatives considered

**Send one RPC per keystroke.** Rejected: `desktop.terminal.send` is a serialized line operation, so per-key requests would not represent interactive shell input and would complicate command ordering.

**Wait for the PTY echo instead of rendering local input.** Rejected: the line-oriented transport adds visible latency to normal typing and removes immediate terminal feedback.

**Change the sanitizer to preserve carriage returns.** Rejected: its output is deliberately line-normalized. Xterm has a supported setting for that representation, which avoids changing the runtime stream shared by other clients.

**Disable terminal-driver echo.** Rejected: it would change the PTY behavior for every terminal consumer. The desktop canvas can remove only its own immediately preceding local echo.

## Testing

`apps/desktop/tests/terminal-core.spec.ts` proves complete, split, and mismatched local-echo handling. `apps/desktop/tests/terminal-tab.spec.ts` pins line conversion, one initial-prompt projection, buffered submission, and stable xterm ownership. The focused terminal, store, and sanitizer suites pass 22/22. Manual packaged-app QA first showed an empty command submission, then showed duplicated and indented `echo hello` output after delivery; both findings are covered by this implementation and require the same live command to be rechecked.

## Consequences

- Terminal commands typed in xterm reach the live PTY as complete lines and appear once.
- Normalized PTY output begins each new line at column zero, including the returned prompt.
- Inspector state updates do not recreate the xterm viewport or its input handler.
- Terminal transport and PTY ownership remain line-oriented and unchanged.
