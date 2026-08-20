# Agent Note: Desktop terminal keeps the settled viewport

Status: implemented

English | [中文](2026-08-20-desktop-terminal-settled-viewport.zh.md)

## Problem

The integrated terminal displays streamed `delta` output through the inspector store. A short command can finish before the JSON-RPC server polling pump observes a delta. Its unread output is then carried by the terminal operation’s `settled` notification as the final viewport. The store recorded that notification’s status but discarded its text, so the command ran in the live PTY but its output and prompt were absent from the terminal surface.

## Decision

`applyInspectorFrame()` appends the `text` from both `delta` and `settled` terminal notifications before it records terminal status. The final viewport is part of the same output stream, not status metadata. This preserves output that arrives during normal polling and adds the unread tail once, because the terminal operation consumes each earlier delta before building its final viewport.

## Alternatives considered

**Change the JSON-RPC server to emit an extra final delta.** Rejected: the protocol already carries the unread viewport on the `settled` notification. Projecting that existing field at the frontend is narrower and avoids a redundant notification.

**Replace the terminal buffer with the settled viewport.** Rejected: a settled viewport contains only output not previously consumed by the polling pump. Replacement would erase earlier streamed content.

**Leave fast commands without UI output.** Rejected: terminal send success is not sufficient when the coding surface cannot display the command’s result or a usable prompt.

## Testing

`apps/desktop/tests/store-core.spec.ts` combines a terminal delta with a settled viewport and proves that both appear in order while terminal status remains available. The focused inspector-store suite passes 7/7. Manual app QA reproduced the pre-fix condition with a live bash PTY: the send RPC settled but the terminal canvas showed no command result.

## Consequences

- Fast and long terminal commands share one ordered output projection, including the final prompt.
- The terminal wire format and server polling behavior remain unchanged.
- The UI can display terminal output received in a settlement notification without treating it as a second command result.
