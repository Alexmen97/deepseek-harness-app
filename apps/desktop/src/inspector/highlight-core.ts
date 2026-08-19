/**
 * Conservative token highlighter core: token regex and classification only.
 * Host-safe (no JSX, no react); the renderer stays in highlight.tsx.
 */

export const TOKEN = new RegExp(
  // String fragments, never a regex literal: a literal slash needs no
  // escape here, and backslash-slash would collapse to / in the string
  // value and turn /* into a quantifier-on-nothing (invalid regex).
  '(//.*|#.*|/\\*[\\s\\S]*?\\*/'
  + '|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\''
  + '|\\b(?:const|let|var|function|return|if|else|for|while|import|export|from|class|interface|type|async|await|new|true|false|null|undefined)\\b'
  + '|\\b\\d+(?:\\.\\d+)?\\b)',
  'g',
)

export function tokenize(text: string): string[] {
  return [...text.matchAll(TOKEN)].map(match => match[0])
}
