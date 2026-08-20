import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installDesktopBindings, type DesktopBindings, type DesktopHost, type DesktopTransport } from '@deepseek-ai/dsh-desktop-client'
import { cancelQuit, discardAndQuit, getQuitGuardState, installQuitGuard, resetQuitGuardForTest, saveAllAndQuit } from '../src/inspector/quit-guard.ts'
import { openFile, resetEditorStore, setBufferContent } from '../src/inspector/editorStore.ts'

vi.mock('../src/inspector/store.ts', () => ({
  getInspectorState: () => ({ activeSessionId: 'sess-1' }),
  terminalRequest: async (method: string) => {
    if (method === 'desktop.fs.stat') return { kind: 'present', version: 'v1', type: 'file', size: 3 }
    if (method === 'desktop.fs.read') return { ok: true, version: 'v1', content: 'one' }
    return { ok: false, code: 'FS_STALE_VERSION' }
  },
}))

function fakeHost(): DesktopHost & { calls: string[]; quitGuardListeners: Array<(generation: number) => void> } {
  const calls: string[] = []
  const quitGuardListeners: Array<(generation: number) => void> = []
  const noop = async (): Promise<unknown> => undefined
  return {
    calls,
    quitGuardListeners,
    pickWorkspace: noop as DesktopHost['pickWorkspace'],
    credentialStatus: noop as DesktopHost['credentialStatus'],
    credentialSet: noop as DesktopHost['credentialSet'],
    credentialDelete: noop as DesktopHost['credentialDelete'],
    fsList: noop as DesktopHost['fsList'],
    fsReadText: noop as DesktopHost['fsReadText'],
    revealInPath: noop as DesktopHost['revealInPath'],
    gitStatus: noop as DesktopHost['gitStatus'],
    gitDiff: noop as DesktopHost['gitDiff'],
    openLogs: noop as DesktopHost['openLogs'],
    openExternal: noop as DesktopHost['openExternal'],
    prefsGet: noop as DesktopHost['prefsGet'],
    prefsSet: noop as DesktopHost['prefsSet'],
    restartRuntime: noop as DesktopHost['restartRuntime'],
    stopRuntime: noop as DesktopHost['stopRuntime'],
    diagnostics: noop as DesktopHost['diagnostics'],
    setMenuLanguage: noop as DesktopHost['setMenuLanguage'],
    notify: noop as DesktopHost['notify'],
    subscribeFocus: () => () => {},
    pickAttachments: noop as DesktopHost['pickAttachments'],
    runtimeStatus: noop as DesktopHost['runtimeStatus'],
    subscribeWorkspaceChanged: () => () => {},
    quitGuardArm: async (armed) => { calls.push('arm:' + String(armed)) },
    subscribeQuitGuard: (listener) => {
      quitGuardListeners.push(listener)
      return () => {}
    },
    quitNow: async () => { calls.push('quit-now') },
    workspaceFiles: noop as DesktopHost['workspaceFiles'],
  }
}

function installFakes(): { host: ReturnType<typeof fakeHost>; transport: DesktopTransport } {
  const host = fakeHost()
  const transport: DesktopTransport = {
    request: async () => ({}),
    subscribeFrames: () => () => {},
    subscribeState: () => () => {},
  }
  installDesktopBindings({ transport, host } satisfies DesktopBindings)
  return { host, transport }
}

describe('M5B unsaved-changes quit guard', () => {
  beforeEach(() => {
    resetQuitGuardForTest()
    resetEditorStore()
    vi.restoreAllMocks()
  })

  it('arms the native guard on the first dirty buffer', async () => {
    const { host } = installFakes()
    installQuitGuard()
    expect(host.calls).toEqual([])
    await openFile('a.txt')
    setBufferContent('a.txt', 'draft')
    expect(host.calls).toContain('arm:true')
  })

  it('surfaces a paused quit request and cancel keeps everything alive', () => {
    const { host } = installFakes()
    installQuitGuard()
    expect(getQuitGuardState().requested).toBe(false)
    host.quitGuardListeners.forEach((listener) => { listener(3) })
    expect(getQuitGuardState().requested).toBe(true)
    cancelQuit()
    expect(getQuitGuardState().requested).toBe(false)
    expect(host.calls).toEqual([])
  })

  it('discard and quit disarms then exits (normal Exit path stops the runtime)', async () => {
    const { host } = installFakes()
    installQuitGuard()
    await discardAndQuit()
    expect(host.calls).toEqual(['arm:false', 'quit-now'])
  })

  it('save all and quit quits only when every save succeeds', async () => {
    const { host } = installFakes()
    installQuitGuard()
    await openFile('a.txt')
    setBufferContent('a.txt', 'draft')
    // The mock write answers FS_STALE_VERSION: Save All must not quit.
    await saveAllAndQuit()
    expect(getQuitGuardState().saveFailed).toBe(true)
    expect(host.calls).not.toContain('quit-now')
    // A stale save preserves the draft in conflict state, so it remains
    // protected while the user chooses Reload or Keep Editing.
    expect(host.calls).toEqual(['arm:true'])
  })
})
