/** Conservative token highlighter: React text spans only, never HTML. */

import type { ReactElement, ReactNode } from 'react'

const TOKEN = new RegExp(
  '(\/\/.*|#.*|\/\*[\s\S]*?\*\/'
  + '|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\''
  + '|\b(?:const|let|var|function|return|if|else|for|while|import|export|from|class|interface|type|async|await|new|true|false|null|undefined)\b'
  + '|\b\d+(?:\.\d+)?\b)',
  'g',
)

function color(token: string): string {
  if (token.startsWith('//') || token.startsWith('#') || token.startsWith('/*')) return '#6a737d'
  if (token.startsWith('"') || token.startsWith("'")) return '#0a7a3d'
  if (/^[A-Za-z]/.test(token) && !token.startsWith('true') && !token.startsWith('false')) return '#8250df'
  if (/^\d/.test(token)) return '#0550ae'
  return '#181a20'
}

/** Render one source line with token colors, escaping everything by construction. */
export function HighlightedLine({ text }: { text: string }): ReactElement {
  const nodes: ReactNode[] = []
  let index = 0
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index
    if (at > index) nodes.push(text.slice(index, at))
    nodes.push(<span key={at} style={{ color: color(match[0]) }}>{match[0]}</span>)
    index = at + match[0].length
  }
  if (index < text.length) nodes.push(text.slice(index))
  return <>{nodes}</>
}
