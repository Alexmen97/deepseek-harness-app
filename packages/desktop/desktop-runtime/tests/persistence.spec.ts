import { afterEach, describe, expect, it } from 'vitest'
import type { LaunchedRuntime } from './launch.ts'
import { launchRuntime } from './launch.ts'

/** Run one complete turn so the checkpoint policy persists the session log. */
async function createAndRunTurn(runtime: LaunchedRuntime): Promise<void> {
  runtime.client.request('desktop.initialize', { cwd: runtime.workspace }, 'init')
  await runtime.client.waitResponse('init')
  runtime.client.request('workspace.create', { rpcId: 'w1', payload: { path: runtime.workspace } }, 'ws')
  const workspace = await runtime.client.waitResponse('ws')
  const workspaceId = (workspace.result as { result: { value: { workspace: { workspaceId: string } } } }).result.value.workspace.workspaceId
  runtime.client.request('session.create', { rpcId: 'sc1', payload: { workspaceId, sessionId: 'persist-1' } }, 'sc')
  await runtime.client.waitResponse('sc')
  runtime.client.request('session.prompt', {
    rpcId: 'p1',
    payload: { sessionId: 'persist-1', mode: 'queue', content: [{ type: 'text', text: 'Reply only with READY' }] },
  }, 'sp')
  await runtime.client.waitResponse('sp')
  const approval = await runtime.client.waitMuxFrame('approval/requested')
  const params = approval.line.params as { rpcId: string }
  runtime.client.request('respond', {
    type: 'client-response',
    rpcId: params.rpcId,
    result: {
      ok: true,
      value: { sessionId: 'persist-1', approvalId: approval.payload.approvalId, outcome: 'allowed-once' },
    },
  }, 'rs1')
  await runtime.client.waitResponse('rs1')
  await runtime.client.waitSessionEvent('turn/end')
}

describe('desktop runtime persistence across generations', () => {
  let runtime: LaunchedRuntime | undefined

  afterEach(async () => {
    if (runtime !== undefined) {
      await runtime.close()
      runtime.cleanup()
    }
    runtime = undefined
  })

  it('reopens persisted sessions after a clean restart and receives no stale events', async () => {
    const first = launchRuntime()
    await createAndRunTurn(first)
    const reuse = { home: first.home, sessionsRoot: first.sessionsRoot, workspace: first.workspace }
    await first.close()

    const second = launchRuntime({ reuse })
    runtime = second
    second.client.request('desktop.initialize', { cwd: second.workspace }, 'init')
    await second.client.waitResponse('init')
    second.client.request('session.list', { rpcId: 'l1', payload: {} }, 'sl')
    const listed = await second.client.waitResponse('sl')
    const value = (listed.result as { result: { value: { items: { sessionId: string }[] } } }).result.value
    expect(value.items.some(item => item.sessionId === 'persist-1')).toBe(true)
  }, 90_000)
})
