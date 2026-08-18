import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installDesktopBindings, type DesktopRuntimeFrame, type DesktopRuntimeLifecycle, type DesktopTransportRequest } from '../src/transport.ts'
import { installInspectorStore, resetInspectorStoreForTest } from '../../../../apps/desktop/src/inspector/store.ts'
import {
  closeBuffer,
  getEditorState,
  openFile,
  reloadBuffer,
  resetEditorStore,
  saveBuffer,
  setBufferContent,
} from '../../../../apps/desktop/src/inspector/editorStore.ts'

function fakeTransport(files: Record<string, { content: string; version: number }>) {
  const frameHandlers = new Set<(frame: DesktopRuntimeFrame) => void>()
  const stateHandlers = new Set<(state: DesktopRuntimeLifecycle) => void>()
  const request = async (request: DesktopTransportRequest): Promise<unknown> => {
    const payload = request.payload as { path: string; content?: string; expectedVersion?: string }
    if (request.method === 'desktop.fs.stat') {
      const entry = files[payload.path]
      return entry === undefined ? { kind: 'absent' } : { kind: 'present', type: 'file', size: entry.content.length, version: 'v' + String(entry.version) }
    }
    if (request.method === 'desktop.fs.read') {
      const entry = files[payload.path]
      return entry === undefined ? { ok: false, code: 'FS_NOT_FOUND' } : { ok: true, version: 'v' + String(entry.version), content: entry.content }
    }
    if (request.method === 'desktop.fs.write') {
      const entry = files[payload.path]
      const current = entry?.version ?? 0
      if (payload.expectedVersion !== undefined && payload.expectedVersion !== 'v' + String(current)) {
        return { ok: false, code: 'FS_STALE_VERSION' }
      }
      files[payload.path] = { content: payload.content ?? '', version: current + 1 }
      return { ok: true, version: 'v' + String(current + 1), operation: entry === undefined ? 'create' : 'update' }
    }
    return { ok: false, code: 'FS_IO_ERROR' }
  }
  installDesktopBindings({
    transport: {
      request,
      subscribeFrames: (handler) => { frameHandlers.add(handler); return () => { frameHandlers.delete(handler) } },
      subscribeState: (handler) => { stateHandlers.add(handler); return () => { stateHandlers.delete(handler) } },
    },
    host: {
      pickWorkspace: async () => null, credentialStatus: async () => ({ configured: false }), credentialSet: async () => {},
      credentialDelete: async () => {}, fsList: async () => [], fsReadText: async () => '', revealInPath: async () => {},
      gitStatus: async () => ({ repository: false }), gitDiff: async () => ({ repository: false }), openLogs: async () => {},
      openExternal: async () => {}, prefsGet: async () => undefined, prefsSet: async () => {}, restartRuntime: async () => {},
      stopRuntime: async () => {}, diagnostics: async () => ({}), setMenuLanguage: async () => {}, notify: async () => {},
      subscribeFocus: () => () => {}, pickAttachments: async () => [], runtimeStatus: async () => ({ state: 'stopped', generation: 0 }),
    },
  })
  const subscribe = (sessionId: string): void => {
    for (const handler of frameHandlers) handler({ generation: 1, stream: 'mux', rpcId: '', payload: { type: 'session/subscribed', sessionId, lastSeq: 0 } })
  }
  return { subscribe }
}

describe('M5A editor buffer store', () => {
  beforeEach(() => {
    resetEditorStore()
    resetInspectorStoreForTest()
  })

  afterEach(() => {
    resetEditorStore()
  })

  it('opens a file with content and version and marks it clean', async () => {
    const transport = fakeTransport({ 'src/a.ts': { content: 'const a = 1', version: 3 } })
    installInspectorStore()
    transport.subscribe('s-1')
    expect(await openFile('src/a.ts')).toBe(true)
    expect(getEditorState().visible).toBe(true)
    expect(getEditorState().activePath).toBe('src/a.ts')
    expect(getEditorState().buffers['src/a.ts']).toMatchObject({ content: 'const a = 1', version: 'v3', status: 'clean' })
  })

  it('saves with the observed version and adopts the returned version', async () => {
    const transport = fakeTransport({ 'src/a.ts': { content: 'one', version: 1 } })
    installInspectorStore()
    transport.subscribe('s-1')
    await openFile('src/a.ts')
    setBufferContent('src/a.ts', 'two')
    await saveBuffer('src/a.ts')
    expect(getEditorState().buffers['src/a.ts']).toMatchObject({ content: 'two', status: 'clean', version: 'v2' })
  })

  it('rejects a stale save and keeps the conflict state until reload', async () => {
    const files = { 'src/a.ts': { content: 'one', version: 1 } }
    const transport = fakeTransport(files)
    installInspectorStore()
    transport.subscribe('s-1')
    await openFile('src/a.ts')
    files['src/a.ts'] = { content: 'newer', version: 2 }
    setBufferContent('src/a.ts', 'my draft')
    await saveBuffer('src/a.ts')
    expect(getEditorState().buffers['src/a.ts']?.status).toBe('conflict')
    await reloadBuffer('src/a.ts')
    expect(getEditorState().buffers['src/a.ts']?.content).toBe('newer')
  })

  it('closes buffers without mutating others', async () => {
    const transport = fakeTransport({ 'a.txt': { content: 'a', version: 1 }, 'b.txt': { content: 'b', version: 1 } })
    installInspectorStore()
    transport.subscribe('s-1')
    await openFile('a.txt')
    await openFile('b.txt')
    closeBuffer('a.txt')
    expect(getEditorState().order).toEqual(['b.txt'])
    expect(getEditorState().buffers['a.txt']).toBeUndefined()
  })
})
