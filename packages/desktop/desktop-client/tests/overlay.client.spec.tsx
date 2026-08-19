// @vitest-environment jsdom
/**
 * Desktop overlay behavior: the first-run onboarding steps, the workspace
 * picker flow, connection-state labels, and the crash-recovery actions, all
 * over a scripted DesktopBindings pair.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { installDesktopBindings } from '../src/transport.ts'
import type { DesktopBindings, DesktopHost, DesktopRuntimeFrame, DesktopRuntimeLifecycle } from '../src/transport.ts'
import { DesktopOverlay } from '../src/ui/overlay.tsx'

afterEach(cleanup)

/** DesktopHost with method signatures widened to function properties, so mock references stay lint-clean. */
type FakeHost = { [K in keyof DesktopHost]: (...args: Parameters<DesktopHost[K]>) => ReturnType<DesktopHost[K]> }

function fakeBindings(options: { workspace?: string; configured?: boolean } = {}): {
  host: FakeHost
  pushState: (state: DesktopRuntimeLifecycle) => void
  pushFrame: (frame: DesktopRuntimeFrame) => void
} {
  const stateHandlers = new Set<(state: DesktopRuntimeLifecycle) => void>()
  const frameHandlers = new Set<(frame: DesktopRuntimeFrame) => void>()
  const host: FakeHost = {
    pickWorkspace: vi.fn(async () => '/Users/example/projects/demo'),
    credentialStatus: vi.fn(async () => ({ configured: options.configured ?? false })),
    credentialSet: vi.fn(async () => {}),
    credentialDelete: vi.fn(async () => {}),
    fsList: vi.fn(async () => []),
    fsReadText: vi.fn(async () => ''),
    revealInPath: vi.fn(async () => {}),
    gitStatus: vi.fn(async () => ({ repository: false })),
    gitStageFile: vi.fn(async () => {}),
    gitDiffFile: async () => ({ diff: '', tooLarge: false, binary: false }),
    gitDiscardFile: vi.fn(async () => {}),
    gitUnstageFile: vi.fn(async () => {}),
    gitStatusV2: vi.fn(async () => ({ repository: false })),
    gitDiff: vi.fn(async () => ({ repository: false })),
    openLogs: vi.fn(async () => {}),
    openExternal: vi.fn(async () => {}),
    prefsGet: vi.fn(async (key: string) => key === 'workspace' ? options.workspace : undefined),
    prefsSet: vi.fn(async () => {}),
    restartRuntime: vi.fn(async () => {}),
    stopRuntime: vi.fn(async () => {}),
    diagnostics: vi.fn(async () => ({})),
    setMenuLanguage: vi.fn(async () => {}),
    notify: vi.fn(async () => {}),
    subscribeFocus: vi.fn(() => () => {}),
    pickAttachments: vi.fn(async () => []),
    runtimeStatus: vi.fn(async () => ({ state: 'stopped' as const, generation: 0 })),
    subscribeWorkspaceChanged: vi.fn(() => () => {}),
    quitGuardArm: vi.fn(async () => {}),
    subscribeQuitGuard: vi.fn(() => () => {}),
    quitNow: vi.fn(async () => {}),
    workspaceFiles: vi.fn(async () => []),
  }
  const bindings: DesktopBindings = {
    host,
    transport: {
      request: vi.fn(async () => ({})),
      subscribeFrames: (handler) => {
        frameHandlers.add(handler)
        return () => { frameHandlers.delete(handler) }
      },
      subscribeState: (handler) => {
        stateHandlers.add(handler)
        return () => { stateHandlers.delete(handler) }
      },
    },
  }
  installDesktopBindings(bindings)
  return {
    host,
    pushState: (state) => { for (const handler of stateHandlers) handler(state) },
    pushFrame: (frame) => { for (const handler of frameHandlers) handler(frame) },
  }
}

describe('DesktopOverlay', () => {
  it('walks the three onboarding steps and saves the key, base URL, and workspace', async () => {
    const { host } = fakeBindings()
    render(<DesktopOverlay />)

    await screen.findByText('Welcome to Harness Desktop')
    fireEvent.click(screen.getByText('Continue'))

    await screen.findByText('Connect DeepSeek')
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'sk-test-secret' } })
    fireEvent.change(screen.getByLabelText('Base URL (optional)'), { target: { value: 'https://api.deepseek.com' } })
    fireEvent.click(screen.getByText('Save to Keychain'))

    await screen.findByText('Choose a project')
    expect(host.credentialSet).toHaveBeenCalledWith('DEEPSEEK_API_KEY', 'sk-test-secret')
    expect(host.prefsSet).toHaveBeenCalledWith('deepseekBaseUrl', 'https://api.deepseek.com')

    fireEvent.click(screen.getByText('Open Folder Picker'))
    await waitFor(() => {
      expect(host.pickWorkspace).toHaveBeenCalled()
      expect(host.prefsSet).toHaveBeenCalledWith('workspace', '/Users/example/projects/demo')
      // Completing onboarding relaunches the runtime with the new workspace.
      expect(host.restartRuntime).toHaveBeenCalled()
    })
    expect(screen.queryByText('Welcome to Harness Desktop')).toBeNull()
  })

  it('skips onboarding when the workspace and credential are already configured', async () => {
    const { pushState } = fakeBindings({ workspace: '/tmp/demo', configured: true })
    render(<DesktopOverlay />)

    await screen.findByText('Harness stopped')
    expect(screen.queryByText('Welcome to Harness Desktop')).toBeNull()

    pushState({ state: 'running', generation: 1 })
    await screen.findByText('Connected')
  })

  it('renders the lifecycle labels for starting and restarting', async () => {
    const { pushState } = fakeBindings({ workspace: '/tmp/demo', configured: true })
    render(<DesktopOverlay />)
    await screen.findByText('Harness stopped')

    pushState({ state: 'starting', generation: 1 })
    await screen.findByText('Starting Harness…')

    pushState({ state: 'restarting', generation: 2 })
    await screen.findByText('Restarting Harness…')
  })

  it('shows crash-recovery actions in the failed state', async () => {
    const { host, pushState } = fakeBindings({ workspace: '/tmp/demo', configured: true })
    render(<DesktopOverlay />)
    await screen.findByText('Harness stopped')

    pushState({ state: 'failed', generation: 3, reason: 'restart budget exhausted' })
    await screen.findByText('Harness unavailable')
    await screen.findByText('Harness stopped unexpectedly.')

    fireEvent.click(screen.getByText('Restart Harness'))
    expect(host.restartRuntime).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Open Logs'))
    expect(host.openLogs).toHaveBeenCalled()
  })

  it('treats a cancelled workspace picker as a non-error', async () => {
    const { host } = fakeBindings()
    host.pickWorkspace = vi.fn(async () => null)
    render(<DesktopOverlay />)

    await screen.findByText('Welcome to Harness Desktop')
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByText('Connect DeepSeek')
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'sk-test-secret' } })
    fireEvent.click(screen.getByText('Save to Keychain'))
    await screen.findByText('Choose a project')

    fireEvent.click(screen.getByText('Open Folder Picker'))
    await waitFor(() => { expect(host.pickWorkspace).toHaveBeenCalled() })
    expect(host.prefsSet).not.toHaveBeenCalledWith('workspace', expect.anything())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Choose a project')).toBeDefined()
  })
})
