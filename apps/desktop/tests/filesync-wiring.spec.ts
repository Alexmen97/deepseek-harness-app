import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installDesktopBindings, type DesktopBindings, type DesktopHost, type DesktopTransport } from '@deepseek-ai/dsh-desktop-client'
import { openFile, resetEditorStore, setBufferContent, getEditorState } from '../src/inspector/editorStore.ts'
import { installFilesync, resetFilesyncForTest } from '../src/inspector/filesync.ts'
// The inspector store is mocked below; its reset is not needed.

// The editor io talks to the runtime through the inspector store; the mock
// provides a live session and scripted fs answers (content mutates per read).
let diskContent = 'one'
let diskVersion = 1
vi.mock('../src/inspector/store.ts', () => ({
  getInspectorState: () => ({ activeSessionId: 'sess-1' }),
  terminalRequest: async (method: string) => {
    if (method === 'desktop.fs.stat') return { kind: 'present', version: 'v' + String(diskVersion), type: 'file', size: diskContent.length }
    if (method === 'desktop.fs.read') return { ok: true, version: 'v' + String(diskVersion), content: diskContent }
    return { ok: false, code: 'FS_STALE_VERSION' }
  },
}))

function installFakes() {
  const workspaceListeners: Array<(event: { generation: number; paths: string[]; full?: boolean }) => void> = []
  const stateListeners: Array<(state: { state: string; generation: number }) => void> = []
  const host = {
    runtimeStatus: async () => ({ state: 'running' as const, generation: 1 }),
    subscribeWorkspaceChanged: (listener: (event: { generation: number; paths: string[]; full?: boolean }) => void) => {
      workspaceListeners.push(listener)
      return () => {}
    },
  } as unknown as DesktopHost
  const transport: DesktopTransport = {
    request: async () => ({}),
    subscribeFrames: () => () => {},
    subscribeState: (listener) => { stateListeners.push(listener as never); return () => {} },
  }
  installDesktopBindings({ transport, host } satisfies DesktopBindings)
  return { workspaceListeners, stateListeners }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 250))

describe('M5B.1 live editor synchronization wiring', () => {
  beforeEach(() => {
    resetFilesyncForTest()
    resetEditorStore()
    diskContent = 'one'
    diskVersion = 1
    vi.restoreAllMocks()
  })

  it('reloads a clean open buffer when the watcher reports its path', async () => {
    const { workspaceListeners } = installFakes()
    installFilesync()
    await openFile('a.txt')
    expect(getEditorState().buffers['a.txt']?.content).toBe('one')
    diskContent = 'two'
    diskVersion = 2
    workspaceListeners.forEach((listener) => { listener({ generation: 1, paths: ['a.txt'] }) })
    await flush()
    expect(getEditorState().buffers['a.txt']).toMatchObject({ content: 'two', version: 'v2', status: 'clean' })
  })

  it('keeps a dirty buffer and marks it conflicted on an external change', async () => {
    const { workspaceListeners } = installFakes()
    installFilesync()
    await openFile('a.txt')
    setBufferContent('a.txt', 'my draft')
    diskContent = 'two'
    diskVersion = 2
    workspaceListeners.forEach((listener) => { listener({ generation: 1, paths: ['a.txt'] }) })
    await flush()
    const buffer = getEditorState().buffers['a.txt']
    expect(buffer?.content).toBe('my draft')
    expect(buffer?.status).toBe('conflict')
  })

  it('ignores invalidation from a stale generation', async () => {
    const { workspaceListeners, stateListeners } = installFakes()
    installFilesync()
    stateListeners.forEach((listener) => { listener({ state: 'running', generation: 1 }) })
    await openFile('a.txt')
    diskContent = 'two'
    diskVersion = 2
    workspaceListeners.forEach((listener) => { listener({ generation: 9, paths: ['a.txt'] }) })
    await flush()
    expect(getEditorState().buffers['a.txt']?.content).toBe('one')
  })
})
