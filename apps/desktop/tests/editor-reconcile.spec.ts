import { describe, expect, it } from 'vitest'
import { createEditorCore, type EditorIo } from '../src/inspector/editor-core.ts'

interface FakeFile {
  content: string
  version: number
  type?: string
}

/** Stat returns the version like the real desktop.fs.stat surface. */
function fakeIo(files: Record<string, FakeFile | undefined>, sessionActive = true): EditorIo {
  return {
    stat: async (path) => {
      if (!sessionActive) return { kind: 'absent', transient: true }
      const entry = files[path]
      return entry === undefined ? { kind: 'absent' } : { kind: 'present', type: entry.type ?? 'file', size: entry.content.length, version: 'v' + String(entry.version) }
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

describe('M5B editor reconcile semantics', () => {
  it('clean file + external modify → auto reload, clean, version adopted', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    files['a.ts'] = { content: 'two', version: 2 }
    await core.reconcile('a.ts')
    const buffer = core.getState().buffers['a.ts']
    expect(buffer).toMatchObject({ content: 'two', version: 'v2', status: 'clean', message: undefined })
  })

  it('dirty file + external modify → conflict with draft preserved', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    core.setContent('a.ts', 'my draft')
    files['a.ts'] = { content: 'two', version: 2 }
    await core.reconcile('a.ts')
    const buffer = core.getState().buffers['a.ts']
    expect(buffer?.status).toBe('conflict')
    expect(buffer?.content).toBe('my draft')
    expect(buffer?.message).toBe('FS_EXTERNAL_CHANGE')
  })

  it('dirty file + unchanged version → stays dirty, no conflict', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    core.setContent('a.ts', 'draft')
    await core.reconcile('a.ts')
    expect(core.getState().buffers['a.ts']?.status).toBe('dirty')
  })

  it('keep changes dismisses the conflict but the next save is still stale-rejected', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    core.setContent('a.ts', 'draft')
    files['a.ts'] = { content: 'two', version: 2 }
    await core.reconcile('a.ts')
    core.keepChanges('a.ts')
    expect(core.getState().buffers['a.ts']).toMatchObject({ status: 'dirty', content: 'draft' })
    await core.save('a.ts')
    expect(core.getState().buffers['a.ts']?.status).toBe('conflict')
    expect(files['a.ts'].content).toBe('two')
  })

  it('reload adopts the external content and drops the draft', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    core.setContent('a.ts', 'draft')
    files['a.ts'] = { content: 'two', version: 2 }
    await core.reconcile('a.ts')
    await core.reload('a.ts')
    expect(core.getState().buffers['a.ts']).toMatchObject({ content: 'two', version: 'v2', status: 'clean' })
  })

  it('clean delete → tab stays with deleted state and no auto-recreate', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    delete files['a.ts']
    await core.reconcile('a.ts')
    const buffer = core.getState().buffers['a.ts']
    expect(buffer?.status).toBe('deleted')
    expect(buffer?.content).toBe('one')
    await core.save('a.ts')
    // Save is disabled in the UI; the core must not recreate anything either.
    expect(files['a.ts']).toBeUndefined()
    expect(core.getState().buffers['a.ts']?.status).toBe('deleted')
  })

  it('dirty delete → draft kept, deleted state, file not recreated', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    core.setContent('a.ts', 'draft')
    delete files['a.ts']
    await core.reconcile('a.ts')
    const buffer = core.getState().buffers['a.ts']
    expect(buffer?.status).toBe('deleted')
    expect(buffer?.content).toBe('draft')
  })

  it('deleted buffer + file reappears → clean adoption of the new content', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    delete files['a.ts']
    await core.reconcile('a.ts')
    files['a.ts'] = { content: 'reborn', version: 4 }
    await core.reconcile('a.ts')
    expect(core.getState().buffers['a.ts']).toMatchObject({ content: 'reborn', version: 'v4', status: 'clean' })
  })

  it('reconcileAll on reconnect: clean adopts, dirty-unchanged keeps editing, dirty-changed conflicts', async () => {
    const files = {
      'clean.ts': { content: 'one', version: 1 },
      'same.ts': { content: 'same', version: 1 },
      'changed.ts': { content: 'base', version: 1 },
    }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('clean.ts')
    await core.openFile('same.ts')
    await core.openFile('changed.ts')
    core.setContent('same.ts', 'same draft')
    core.setContent('changed.ts', 'changed draft')
    // The runtime restarted: versions stay identical for unmodified files,
    // and bump for files written elsewhere in the new generation.
    files['clean.ts'] = { content: 'new clean', version: 2 }
    files['changed.ts'] = { content: 'new base', version: 2 }
    await core.reconcileAll()
    expect(core.getState().buffers['clean.ts']).toMatchObject({ content: 'new clean', status: 'clean' })
    expect(core.getState().buffers['same.ts']).toMatchObject({ content: 'same draft', status: 'dirty' })
    expect(core.getState().buffers['changed.ts']).toMatchObject({ content: 'changed draft', status: 'conflict' })
  })

  it('transient absence (no active session yet) does not mark buffers deleted', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 } }
    let sessionActive = true
    const io = fakeIo(files)
    const gated: EditorIo = {
      stat: async path => sessionActive ? io.stat(path) : { kind: 'absent', transient: true },
      read: async path => io.read(path),
      write: async (path, content, expectedVersion) => io.write(path, content, expectedVersion),
    }
    const core = createEditorCore(gated, 512 * 1024)
    await core.openFile('a.ts')
    // The runtime is restarting: no session yet, stat reports transient.
    sessionActive = false
    await core.reconcile('a.ts')
    expect(core.getState().buffers['a.ts']?.status).toBe('clean')
    // Once the session is back, a real deletion is still detected.
    sessionActive = true
    delete files['a.ts']
    await core.reconcile('a.ts')
    expect(core.getState().buffers['a.ts']?.status).toBe('deleted')
  })

  it('saveAll saves every dirty buffer and reports conflicts', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 }, 'b.ts': { content: 'bee', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    await core.openFile('b.ts')
    core.setContent('a.ts', 'a draft')
    core.setContent('b.ts', 'b draft')
    files['b.ts'] = { content: 'b external', version: 2 }
    const result = await core.saveAll()
    expect(result.ok).toBe(false)
    expect(result.conflicted).toEqual(['b.ts'])
    expect(core.getState().buffers['a.ts']?.status).toBe('clean')
    expect(core.getState().buffers['b.ts']?.status).toBe('conflict')
  })

  it('dirtyPaths and hasDirtyBuffers follow tab order', async () => {
    const files: Record<string, FakeFile | undefined> = { 'a.ts': { content: 'one', version: 1 }, 'b.ts': { content: 'bee', version: 1 } }
    const core = createEditorCore(fakeIo(files), 512 * 1024)
    await core.openFile('a.ts')
    await core.openFile('b.ts')
    expect(core.hasDirtyBuffers()).toBe(false)
    core.setContent('b.ts', 'draft')
    expect(core.hasDirtyBuffers()).toBe(true)
    expect(core.dirtyPaths()).toEqual(['b.ts'])
  })
})
