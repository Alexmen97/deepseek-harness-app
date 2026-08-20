/** Unified-diff parsing for the M4 Changes surface (rendering data only). */

export type DiffLineKind = 'header' | 'context' | 'add' | 'del'

export interface DiffLine {
  kind: DiffLineKind
  text: string
  /** Old-side (HEAD/index) line number; undefined for additions and metadata. */
  oldLine?: number
  /** New-side (index/worktree) line number; undefined for deletions and metadata. */
  newLine?: number
  /** The raw unified-diff line (with its leading +/-/space marker). */
  raw: string
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
  /** Old-side start line parsed from the hunk header. */
  oldStart: number
  /** New-side start line parsed from the hunk header. */
  newStart: number
  /** FNV-1a identity of header + raw body, matching the Rust host. */
  hunkId: string
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

/** Parse one unified-diff hunk header: `@@ -a,b +c,d @@` -> starts. */
export function parseHunkHeader(header: string): { oldStart: number; newStart: number } {
  const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header)
  if (match === null) return { oldStart: 1, newStart: 1 }
  return { oldStart: Number(match[1]), newStart: Number(match[2]) }
}

/** FNV-1a 64-bit hash rendered as a 16-hex token; the Rust host uses the
 * same algorithm for diff tokens and hunk identities (M5D). */
export function fnv1a(text: string): string {
  const OFFSET = 0xcbf29ce484222325n
  const PRIME = 0x100000001b3n
  const MASK = 0xffffffffffffffffn
  let hash = OFFSET
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte)
    hash = (hash * PRIME) & MASK
  }
  return hash.toString(16).padStart(16, '0')
}

/** Parse one git unified diff into files, hunks, and +/- counts. */
export function parseDiff(text: string): ParsedDiff {
  const files: DiffFile[] = []
  let current: DiffFile | undefined
  let hunk: DiffHunk | undefined
  let oldLine = 0
  let newLine = 0
  const pushLine = (kind: DiffLineKind, text: string, raw: string): void => {
    if (hunk === undefined) return
    const line: DiffLine = { kind, text, raw }
    if (kind === 'context') {
      line.oldLine = oldLine
      line.newLine = newLine
      oldLine += 1
      newLine += 1
    } else if (kind === 'add') {
      line.newLine = newLine
      newLine += 1
    } else {
      line.oldLine = oldLine
      oldLine += 1
    }
    hunk.lines.push(line)
  }
  // Rust's str::lines() drops the trailing empty element produced by the
  // diff's final newline; keep parsed bodies aligned with the host so hunk
  // identities match for the last hunk of a diff (M5D).
  for (const line of text.split('\n').filter((line, index, lines) => line !== '' || index !== lines.length - 1)) {
    if (line.startsWith('diff --git ')) {
      const path = line.split(' b/')[1] ?? ''
      current = { path, header: line, hunks: [], added: 0, removed: 0 }
      files.push(current)
      hunk = undefined
      continue
    }
    if (line.startsWith('@@')) {
      if (current === undefined) continue
      if (hunk !== undefined) hunk.hunkId = fnv1a(hunk.header + '\n' + hunk.lines.map(l => l.raw).join('\n'))
      const ranges = parseHunkHeader(line)
      hunk = { header: line, lines: [], oldStart: ranges.oldStart, newStart: ranges.newStart, hunkId: '' }
      oldLine = ranges.oldStart
      newLine = ranges.newStart
      current.hunks.push(hunk)
      continue
    }
    if (current === undefined) continue
    if (hunk === undefined) {
      if (!line.startsWith('+') && !line.startsWith('-')) continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.added += 1
      pushLine('add', line.slice(1), line)
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      current.removed += 1
      pushLine('del', line.slice(1), line)
    } else if (hunk !== undefined) {
      pushLine('context', line.startsWith(' ') ? line.slice(1) : line, line)
    }
  }
  if (hunk !== undefined) hunk.hunkId = fnv1a(hunk.header + '\n' + hunk.lines.map(l => l.raw).join('\n'))
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
