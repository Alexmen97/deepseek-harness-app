# Agent Note: Terminal output preserves SGR color sequences

Status: implemented

English | [中文](2026-08-20-terminal-sgr-color-output.zh.md)

## Problem

The persistent bash terminal sanitizes PTY output before it reaches the desktop terminal canvas. It removed every CSI sequence, including Select Graphic Rendition (SGR) sequences such as `\x1b[31m` and reset `\x1b[0m`. Commands completed and their printable text arrived, but ANSI color and style could never render in xterm, leaving the terminal short of its interactive output contract.

## Decision

`TerminalSanitizer` preserves complete CSI sequences whose final byte is `m` and continues to remove every other CSI sequence, OSC sequence, short escape, and BEL. SGR changes text appearance without cursor movement or terminal mode changes, so the existing xterm canvas renders the color/style while the line-oriented transport still filters cursor positioning, screen clearing, hyperlinks, clipboard controls, and private prompt control markers.

## Alternatives considered

**Pass all CSI sequences through.** Rejected: cursor motion, erasing, mode changes, and private controls do not have safe line-oriented semantics and could make the projected terminal state misleading.

**Keep stripping SGR and document plain-text output.** Rejected: the desktop terminal is an xterm surface and interactive QA requires ANSI color. Plain-text-only output would make ordinary compiler, test, and git output materially less usable.

**Reimplement full terminal emulation in the runtime.** Rejected: xterm already owns terminal emulation in the renderer. The runtime only needs to preserve the safe presentation sequence category it forwards.

## Testing

`packages/terminal/terminal-bash/tests/sanitize.spec.ts` now feeds a split red SGR sequence and reset through the real sanitizer, proving that both reach the output while the owned OSC prompt marker remains removed. The focused sanitizer suite passes 6/6. A bundled-runtime stdio QA command reproduces an SGR payload and verifies that the terminal notification carries it for the desktop canvas.

## Consequences

- ANSI SGR colors and styles render in the integrated terminal.
- Non-SGR terminal-control sequences remain filtered; this is not a general terminal-control passthrough.
- Split sequences retain the existing bounded carry behavior before their final byte identifies the category.
