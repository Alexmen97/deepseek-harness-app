import { describe, expect, it } from 'vitest'
import { createEditorCore, type EditorIo } from '../src/inspector/editor-core.ts'

function fakeIo(files: Record<string, { content: string; version: number }>): EditorIo {
  return {
    stat: async (path) => {
      const entry = files[path]
      return entry === undefined ? { kind: 'absent' } : { kind: 'present', type: 'file', size: entry.content.length }
    },
    read: async (path) => {
      const entry = files[path]
      return entry === undefined ? { ok: false, code: 'FS_NOT_FOUND' } : { ok: true, version: 'v' + String(entry.version), content: entry.content }
    },
    write: async (path, content, expectedVersion) => {
      const entry = files[path]
      const current = entry?.version ?? 0
      if (expectedVersion !== undefined && expectedVersion !== 'v' + String(current)) return { ok: false, code: 'FS_STALE_VERSION' }
      files[path] = { content, version: current + 1 }
      return { ok: true, version: 'v' + String(current + 1) }
    },
  }
}

describe('M5A editor core state machine', () => {
  it('opens a file with content and version and marks it clean', async () => {
    const core = createEditorCore(fakeIo({ 'src/a.ts': { content: 'const a = 1', version: 3 } }), 512 * 1024)
    expect(await core.openFile('src/a.ts')).toBe(true)
    expect(core.getState().visible).toBe(true)
    expect(core.getState().activePath).toBe('src/a.ts')
    expect(core.getState().buffers['src/a.ts']).toMatchObject({ content: 'const a = 1', version: 'v3', status: 'clean' })
  })

  it('saves with the observed version and adopts the returned version', async () => {
    const core = createEditorCore(fakeIo({ 'src/a.ts': { content: 'one', version: 1 } }), 512 * 1024)
    await core.openFile('src/a.ts')
    core.setContent('src/a.ts', 'two')
    expect(core.getState().buffers['src/a.ts']?.status).toBe('dirty')
    await core.save('src/a.ts')
    expect(core.getState().buffers['src/a.ts']).toMatchObject({ content: 'two', status: 'clean', version: 'v2' })
  })

  it('rejects a stale save, keeps the conflict state, and reload adopts disk content', async () => {
    const files = { 'src/a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('src/a.ts')
    files['src/a.ts'] = { content: 'newer', version: 2 }
    core.setContent('src/a.ts', 'my draft')
    await core.save('src/a.ts')
    expect(core.getState().buffers['src/a.ts']?.status).toBe('conflict')
    await core.reload('src/a.ts')
    expect(core.getState().buffers['src/a.ts']?.content).toBe('newer')
  })

  it('refuses files over the editable cap and keeps them out of the buffers', async () => {
    const core = createEditorCore(fakeIo({ 'big.txt': { content: '12345', version: 1 } }), 4)
    expect(await core.openFile('big.txt')).toBe(false)
    expect(core.getState().buffers['big.txt']).toBeUndefined()
  })

  it('closes one buffer without mutating others and activates the remaining tab', async () => {
    const core = createEditorCore(fakeIo({ 'a.txt': { content: 'a', version: 1 }, 'b.txt': { content: 'b', version: 1 } }), 512 * 1024)
    await core.openFile('a.txt')
    await core.openFile('b.txt')
    core.close('a.txt')
    expect(core.getState().order).toEqual(['b.txt'])
    expect(core.getState().activePath).toBe('b.txt')
  })
})
