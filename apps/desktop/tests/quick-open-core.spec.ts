import { describe, expect, it } from 'vitest'
import { buildIndex, filterIndex, subsequenceIndex, QUICK_OPEN_LIMIT } from '../src/inspector/quick-open-core.ts'

const PATHS = [
  'src/editor.ts',
  'src/filesync.ts',
  'apps/desktop/src/inspector/editorStore.ts',
  'README.md',
  'node_modules/x/index.js',
  'docs/architecture.md',
  'src/Editor.tsx',
]

describe('M5B Quick Open index and ranking', () => {
  it('builds an index of path metadata only', () => {
    const index = buildIndex(PATHS)
    expect(index.find(entry => entry.path === 'src/editor.ts')).toMatchObject({ path: 'src/editor.ts', name: 'editor.ts' })
    expect(index).toHaveLength(PATHS.length)
  })

  it('subsequence matching is case-insensitive and gap-aware', () => {
    expect(subsequenceIndex('Editor.ts', 'edt')).toBeGreaterThanOrEqual(0)
    expect(subsequenceIndex('editor.ts', 'xyz')).toBe(-1)
    expect(subsequenceIndex('editor.ts', '')).toBe(0)
  })

  it('ranks basename prefix above path subsequence', () => {
    const index = buildIndex(PATHS)
    const matches = filterIndex(index, 'editor')
    expect(matches[0]?.entry.path).toBe('src/editor.ts')
  })

  it('same filename in different directories stays distinguishable', () => {
    const index = buildIndex(['a/README.md', 'b/README.md'])
    const matches = filterIndex(index, 'README')
    expect(matches.map(match => match.entry.path).sort()).toEqual(['a/README.md', 'b/README.md'])
    expect(matches[0]?.entry.name).toBe('README.md')
  })

  it('empty query returns entries sorted by path', () => {
    const index = buildIndex(['b.txt', 'a.txt'])
    const matches = filterIndex(index, '')
    expect(matches.map(match => match.entry.path)).toEqual(['a.txt', 'b.txt'])
  })

  it('caps results at the palette limit', () => {
    const paths = Array.from({ length: QUICK_OPEN_LIMIT + 20 }, (_, index) => 'file-' + String(index) + '.ts')
    const index = buildIndex(paths)
    const matches = filterIndex(index, 'file-')
    expect(matches.length).toBe(QUICK_OPEN_LIMIT)
  })

  it('malicious filenames rank as plain metadata without breaking the query', () => {
    const newline = String.fromCharCode(10)
    const quote = String.fromCharCode(34)
    const index = buildIndex([
      'a' + newline + 'b.ts',
      'x' + quote + 'quote.ts',
      '../escape.ts',
      'x<tag>.ts',
    ])
    const matches = filterIndex(index, 'b.ts')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0]?.entry.path).toBe('a' + newline + 'b.ts')
  })
})
