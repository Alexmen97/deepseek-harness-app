# Agent Note: Desktop terminal submits typed lines

Status: implemented

English | [中文](2026-08-20-desktop-terminal-input-buffer.zh.md)

## Problem

The desktop terminal rendered each typed xterm character locally but discarded it before the terminal request. Enter always sent an empty string, so a live PTY received no command despite the user seeing their input. Separately, deriving a fresh desktop palette during each inspector render changed the terminal initialization effect dependency. Xterm was disposed and recreated during unrelated state updates, clearing its viewport and replacing its input handler.

## Decision

`TerminalTab` keeps the pending line in a ref, renders each key locally, and sends the exact buffered line only when Enter submits it. Ctrl+C, session replacement, and terminal close clear the pending line. The xterm instance is owned by the selected appearance rather than a newly allocated palette; session and terminal values used by resize and input handlers come from refs.

## Alternatives considered

**Send one RPC per keystroke.** Rejected: `desktop.terminal.send` is a serialized line operation, so per-key requests would not represent interactive shell input and would complicate command ordering.

**Add a raw terminal-input protocol.** Rejected: the desktop protocol intentionally exposes line-oriented terminal requests. A second transport would broaden the native surface without serving this command-entry requirement.

**Replace xterm entry with an HTML input.** Rejected: it would duplicate terminal presentation and remove normal terminal editing feedback instead of preserving the existing canvas interaction.

## Testing

`apps/desktop/tests/terminal-tab.spec.ts` asserts that Enter reads the buffered line, forwards it with `submit: true`, never substitutes an empty string, and keeps the xterm initialization effect independent from inspector state. The focused terminal, store, and sanitizer suites pass 18/18. The manual QA finding used a live packaged PTY: typing `echo hello` and pressing Enter produced no output before this correction.

## Consequences

- Terminal commands typed in xterm reach the live PTY as complete lines.
- Inspector state updates do not recreate the xterm viewport or its input handler.
- Terminal transport and PTY ownership remain line-oriented and unchanged.
