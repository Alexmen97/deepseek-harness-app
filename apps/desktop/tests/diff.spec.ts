import { describe, expect, it } from 'vitest'
import { parseDiff, statusCategory } from '../src/inspector/diff.ts'

const SAMPLE = [
  'diff --git a/a.txt b/a.txt',
  'index 7898192..2e65efe 100644',
  '--- a/a.txt',
  '+++ b/a.txt',
  '@@ -1,3 +1,3 @@',
  ' context',
  '-removed line',
  '+added line',
  ' tail',
].join('\n')

describe('M4 diff parsing', () => {
  it('extracts files, hunks, and addition/deletion counts', () => {
    const parsed = parseDiff(SAMPLE)
    expect(parsed.files).toHaveLength(1)
    expect(parsed.files[0]?.path).toBe('a.txt')
    expect(parsed.files[0]?.added).toBe(1)
    expect(parsed.files[0]?.removed).toBe(1)
    expect(parsed.added).toBe(1)
    expect(parsed.removed).toBe(1)
    expect(parsed.files[0]?.hunks[0]?.lines.map(line => line.kind)).toEqual(['context', 'del', 'add', 'context'])
  })

  it('ignores +++/--- markers in counts', () => {
    const parsed = parseDiff(SAMPLE)
    expect(parsed.files[0]?.added).toBe(1)
    expect(parsed.files[0]?.removed).toBe(1)
  })

  it('maps porcelain status pairs to user-facing categories', () => {
    expect(statusCategory('M ')).toBe('modified')
    expect(statusCategory('A ')).toBe('added')
    expect(statusCategory(' D')).toBe('deleted')
    expect(statusCategory('R  old -> new')).toBe('renamed')
    expect(statusCategory('??')).toBe('untracked')
  })
})
