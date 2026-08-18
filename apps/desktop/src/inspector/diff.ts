/** Unified-diff parsing for the M4 Changes surface (rendering data only). */

export type DiffLineKind = 'header' | 'context' | 'add' | 'del'

export interface DiffLine {
  kind: DiffLineKind
  text: string
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface DiffFile {
  path: string
  header: string
  hunks: DiffHunk[]
  added: number
  removed: number
}

export interface ParsedDiff {
  files: DiffFile[]
  added: number
  removed: number
}

/** Parse one git unified diff into files, hunks, and +/- counts. */
export function parseDiff(text: string): ParsedDiff {
  const files: DiffFile[] = []
  let current: DiffFile | undefined
  let hunk: DiffHunk | undefined
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const path = line.split(' b/')[1] ?? ''
      current = { path, header: line, hunks: [], added: 0, removed: 0 }
      files.push(current)
      hunk = undefined
      continue
    }
    if (line.startsWith('@@')) {
      if (current === undefined) continue
      hunk = { header: line, lines: [] }
      current.hunks.push(hunk)
      continue
    }
    if (current === undefined) continue
    if (hunk === undefined) {
      if (!line.startsWith('+') && !line.startsWith('-')) continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.added += 1
      hunk?.lines.push({ kind: 'add', text: line.slice(1) })
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      current.removed += 1
      hunk?.lines.push({ kind: 'del', text: line.slice(1) })
    } else if (hunk !== undefined) {
      hunk.lines.push({ kind: 'context', text: line.startsWith(' ') ? line.slice(1) : line })
    }
  }
  const added = files.reduce((sum, file) => sum + file.added, 0)
  const removed = files.reduce((sum, file) => sum + file.removed, 0)
  return { files, added, removed }
}

/** Map one git porcelain status code pair to a user-facing category. */
export function statusCategory(code: string): 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' {
  if (code.includes('??')) return 'untracked'
  if (code.includes('A')) return 'added'
  if (code.includes('D')) return 'deleted'
  if (code.includes('R')) return 'renamed'
  return 'modified'
}
