/** Terminal presentation helpers for the line-oriented desktop transport. */

/**
 * Consume the PTY echo of a line xterm already rendered while it was typed.
 * @param text - Newly streamed, line-normalized PTY output.
 * @param pendingEcho - Prefix expected from the terminal driver after submission.
 * @returns Remaining visible output and the unconsumed echo prefix.
 */
export function consumeLocalTerminalEcho(text: string, pendingEcho: string): { text: string; pendingEcho: string } {
  if (pendingEcho.length === 0) return { text, pendingEcho }
  const length = Math.min(text.length, pendingEcho.length)
  if (text.slice(0, length) !== pendingEcho.slice(0, length)) return { text, pendingEcho: '' }
  return { text: text.slice(length), pendingEcho: pendingEcho.slice(length) }
}
