import { describe, expect, it } from 'vitest'
import type { DesktopGitDiff, DesktopGitError, DesktopGitStatusV2 } from '@deepseek-ai/dsh-desktop-client'
import { createChangesCore, type ChangesHost } from '../src/inspector/changes-core.ts'

const STATUS: DesktopGitStatusV2 = {
  repository: true,
  branch: 'main',
  dirty: true,
  changedFiles: 1,
  files: [{ path: 'a.txt', status: '.M', conflicted: false }],
}
const DIFF: DesktopGitDiff = { repository: true, diff: '', untracked: [] }
const ERROR: DesktopGitError = { code: 'GIT_OPERATION_FAILED', message: 'the git operation failed', detail: 'fatal: pathspec did not match' }

interface FakeHost extends ChangesHost {
  calls: string[]
  statusCalls(): number
  diffCalls(): number
  stageCalls(): number
  failNextStage(): void
  holdNextStage(): (value?: undefined) => void
}

function fakeHost(): FakeHost {
  const calls: string[] = []
  let statusCalls = 0
  let diffCalls = 0
  let stageCalls = 0
  let stageError: DesktopGitError | undefined
  let held: { resolve: (value: undefined) => void } | undefined
  return {
    calls,
    statusCalls: () => statusCalls,
    diffCalls: () => diffCalls,
    stageCalls: () => stageCalls,
    failNextStage: () => { stageError = ERROR },
    holdNextStage: () => {
      const holder = { resolve: (_value: undefined) => {} }
      held = holder
      return (value?: undefined) => { holder.resolve(value) }
    },
    gitStatusV2: async () => { statusCalls += 1; return STATUS },
    gitDiff: async () => { diffCalls += 1; return DIFF },
    gitStageFile: async (path) => {
      stageCalls += 1
      calls.push('stage:' + path)
      if (stageError !== undefined) {
        const error = stageError
        stageError = undefined
        throw error
      }
      if (held !== undefined) {
        const holder = held
        held = undefined
        return new Promise<void>((resolve) => { holder.resolve = resolve })
      }
    },
    gitUnstageFile: async (path) => { calls.push('unstage:' + path) },
  }
}

describe('M5C.2 changes operations core', () => {
  it('refreshes status and diff on demand', async () => {
    const host = fakeHost()
    const core = createChangesCore(host)
    await core.refresh()
    expect(core.getStatus()?.branch).toBe('main')
    expect(core.getDiff()).toBe(DIFF)
    expect(host.statusCalls()).toBe(1)
    expect(host.diffCalls()).toBe(1)
  })

  it('stages, refreshes after success, and clears the error', async () => {
    const host = fakeHost()
    const core = createChangesCore(host)
    await core.refresh()
    await core.stage('a.txt')
    expect(host.calls).toEqual(['stage:a.txt'])
    // Server-confirmed refresh after the operation.
    expect(host.statusCalls()).toBe(2)
    expect(core.getOps().pending['a.txt']).toBeUndefined()
    expect(core.getOps().errors['a.txt']).toBeUndefined()
  })

  it('unstages, leaves the editor out of it, and refreshes', async () => {
    const host = fakeHost()
    const core = createChangesCore(host)
    await core.refresh()
    await core.unstage('a.txt')
    expect(host.calls).toEqual(['unstage:a.txt'])
    expect(host.statusCalls()).toBe(2)
    expect(core.getOps().pending['a.txt']).toBeUndefined()
  })

  it('reports pending state while an operation is in flight and blocks duplicates', async () => {
    const host = fakeHost()
    const core = createChangesCore(host)
    const resolve = host.holdNextStage()
    const first = core.stage('a.txt')
    expect(core.getOps().pending['a.txt']).toBe('staging')
    // A duplicate click while pending must be a no-op.
    await core.stage('a.txt')
    expect(host.stageCalls()).toBe(1)
    resolve(undefined)
    await first
    expect(core.getOps().pending['a.txt']).toBeUndefined()
  })

  it('surfaces typed errors and keeps the model unchanged', async () => {
    const host = fakeHost()
    host.failNextStage()
    const core = createChangesCore(host)
    await core.refresh()
    await core.stage('a.txt')
    expect(core.getOps().errors['a.txt']).toEqual(ERROR)
    expect(core.getOps().pending['a.txt']).toBeUndefined()
    // No refresh after a failed operation: server state did not change.
    expect(host.statusCalls()).toBe(1)
  })

  it('clears a previous error after a later success', async () => {
    const host = fakeHost()
    host.failNextStage()
    const core = createChangesCore(host)
    await core.stage('a.txt')
    expect(core.getOps().errors['a.txt']).toBeDefined()
    await core.stage('a.txt')
    expect(core.getOps().errors['a.txt']).toBeUndefined()
  })

  it('notifies subscribers on state changes', async () => {
    const host = fakeHost()
    const core = createChangesCore(host)
    const seen: string[] = []
    core.subscribe(() => { seen.push('change') })
    await core.stage('a.txt')
    expect(seen.length).toBeGreaterThan(0)
  })
})
