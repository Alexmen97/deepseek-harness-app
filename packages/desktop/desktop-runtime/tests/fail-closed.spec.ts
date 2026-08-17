import { afterEach, describe, expect, it } from 'vitest'
import { CallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { RuntimeHarness } from './boot.ts'
import { bootRuntime } from './boot.ts'

describe('desktop approval fail-closed semantics', () => {
  let harness: RuntimeHarness | undefined

  afterEach(async () => {
    await harness?.dispose()
    harness = undefined
  })

  it('resolves a pending approval as cancelled when the connection disappears', async () => {
    harness = await bootRuntime({ fixture: 'm1a-approve' })
    harness.request('desktop.initialize', { cwd: harness.workspace }, 'init')
    await harness.waitResponse('init')
    harness.request('workspace.create', { rpcId: 'w1', payload: { path: harness.workspace } }, 'ws')
    await harness.waitResponse('ws')
    harness.request('session.create', { rpcId: 'sc1', payload: { sessionId: 'sess-1' } }, 'sc')
    await harness.waitResponse('sc')

    const agent = harness.ctx.agents.get(SessionId('sess-1'))
    expect(agent).toBeDefined()
    // The approval audit pair must be turn-enclosed (upstream invariant).
    agent!.session.append('turn/start', { turn: 1 })
    const outcome = harness.ctx.approval.request({
      agent: agent!,
      toolName: 'bash',
      callId: CallId('fail-close'),
      reason: 'fail-closed fixture',
    })

    await harness.waitLineWhere((line) => {
      const params = line.params as { payload?: { type?: string } } | undefined
      return line.method === 'events.mux' && params?.payload?.type === 'approval/requested'
    })

    await harness.dispose()
    harness = undefined
    await expect(outcome).resolves.toBe('cancelled')
  }, 180_000)
})
