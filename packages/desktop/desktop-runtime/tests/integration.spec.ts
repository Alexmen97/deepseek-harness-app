import { afterEach, describe, expect, it } from 'vitest'
import type { LaunchedRuntime } from './launch.ts'
import { launchRuntime } from './launch.ts'

/** Complete the handshake and create a session on the runtime workspace. */
async function initializeAndCreateSession(runtime: LaunchedRuntime): Promise<{ workspaceId: string; sessionId: string }> {
  runtime.client.request('desktop.initialize', { cwd: runtime.workspace }, 'init')
  const init = await runtime.client.waitResponse('init')
  expect((init.result as { capabilities: Record<string, unknown> }).capabilities).toMatchObject({
    sessions: true,
    workspaces: true,
    events: true,
    models: true,
    approvals: true,
    questions: true,
    terminal: true,
    keychain: true,
  })
  runtime.client.request('workspace.create', { rpcId: 'w1', payload: { path: runtime.workspace } }, 'ws')
  const created = await runtime.client.waitResponse('ws')
  const value = (created.result as { result: { value: { workspace: { workspaceId: string } } } }).result.value
  const workspaceId = value.workspace.workspaceId
  const sessionId = 'sess-1'
  runtime.client.request('session.create', { rpcId: 'sc1', payload: { workspaceId, sessionId } }, 'sc')
  const session = await runtime.client.waitResponse('sc')
  expect((session.result as { result: { ok: boolean } }).result.ok).toBe(true)
  return { workspaceId, sessionId }
}

describe('desktop runtime integration', () => {
  let runtime: LaunchedRuntime | undefined

  afterEach(async () => {
    if (runtime !== undefined) {
      await runtime.close()
      runtime.cleanup()
    }
    runtime = undefined
  })

  it('runs a full turn: prompt, approval request, approve, agent continues, durable events', async () => {
    runtime = launchRuntime({ fixture: 'm1a-approve' })
    const { sessionId } = await initializeAndCreateSession(runtime)

    runtime.client.request('session.prompt', {
      rpcId: 'p1',
      payload: { sessionId, mode: 'queue', content: [{ type: 'text', text: 'Reply only with READY' }] },
    }, 'sp')
    const prompt = await runtime.client.waitResponse('sp')
    expect((prompt.result as { result: { ok: boolean } }).result.ok).toBe(true)

    const approval = await runtime.client.waitMuxFrame('approval/requested')
    const params = approval.line.params as { rpcId: string }
    expect(approval.payload).toMatchObject({ sessionId, toolName: 'bash' })
    expect(String(approval.payload.reason)).toContain('approval')

    runtime.client.request('respond', {
      type: 'client-response',
      rpcId: params.rpcId,
      result: {
        ok: true,
        value: { sessionId, approvalId: approval.payload.approvalId, outcome: 'allowed-once' },
      },
    }, 'rs1')
    // The resolved frame is broadcast before the respond receipt arrives.
    const resolved = await runtime.client.waitMuxFrame('approval/resolved')
    expect(resolved.payload).toMatchObject({ sessionId, outcome: 'allowed-once' })
    const receipt = await runtime.client.waitResponse('rs1')
    expect(receipt.result).toEqual({ accepted: true })

    const toolResult = await runtime.client.waitSessionEvent('tool/result')
    expect((toolResult.data as { message: { content: { isError?: boolean }[] } }).message.content[0]?.isError).not.toBe(true)

    const message = await runtime.client.waitSessionEvent('assistant/message')
    expect(JSON.stringify(message)).toContain('READY')

    const turnEnd = await runtime.client.waitSessionEvent('turn/end')
    expect(turnEnd.data).toMatchObject({ turn: 1 })

    runtime.client.request('session.list', { rpcId: 'l1', payload: {} }, 'sl')
    const listed = await runtime.client.waitResponse('sl')
    const items = (listed.result as { result: { value: { items: { sessionId: string }[] } } }).result.value.items
    expect(items.some(item => item.sessionId === sessionId)).toBe(true)
  }, 60_000)

  it('rejects an approval: the agent observes the rejection and continues', async () => {
    runtime = launchRuntime({ fixture: 'm1a-reject' })
    const { sessionId } = await initializeAndCreateSession(runtime)

    runtime.client.request('session.prompt', {
      rpcId: 'p1',
      payload: { sessionId, mode: 'queue', content: [{ type: 'text', text: 'Run it' }] },
    }, 'sp')
    await runtime.client.waitResponse('sp')

    const approval = await runtime.client.waitMuxFrame('approval/requested')
    const params = approval.line.params as { rpcId: string }
    runtime.client.request('respond', {
      type: 'client-response',
      rpcId: params.rpcId,
      result: {
        ok: true,
        value: { sessionId, approvalId: approval.payload.approvalId, outcome: 'rejected' },
      },
    }, 'rs1')
    const resolved = await runtime.client.waitMuxFrame('approval/resolved')
    expect(resolved.payload).toMatchObject({ sessionId, outcome: 'rejected' })
    const receipt = await runtime.client.waitResponse('rs1')
    expect(receipt.result).toEqual({ accepted: true })

    const message = await runtime.client.waitSessionEvent('assistant/message')
    expect(JSON.stringify(message)).toContain('ESCALATION REJECTED')
    await runtime.client.waitSessionEvent('turn/end')
  }, 60_000)

  it('serves ask_user_question frames and resolves a user answer', async () => {
    runtime = launchRuntime({ fixture: 'm1a-question' })
    const { sessionId } = await initializeAndCreateSession(runtime)

    runtime.client.request('session.prompt', {
      rpcId: 'p1',
      payload: { sessionId, mode: 'queue', content: [{ type: 'text', text: 'Ask me' }] },
    }, 'sp')
    await runtime.client.waitResponse('sp')

    const question = await runtime.client.waitMuxFrame('question/requested')
    const params = question.line.params as { rpcId: string }
    expect(question.payload).toMatchObject({ sessionId })
    const questions = question.payload.questions as { id: string }[]
    expect(questions[0]?.id).toBe('q1')

    runtime.client.request('respond', {
      type: 'client-response',
      rpcId: params.rpcId,
      result: {
        ok: true,
        value: { sessionId, answer: { answers: [{ id: 'q1', selected: ['Yes'] }] } },
      },
    }, 'rq1')
    const resolved = await runtime.client.waitMuxFrame('question/resolved')
    expect(resolved.payload).toMatchObject({ sessionId, outcome: 'answered' })
    const receipt = await runtime.client.waitResponse('rq1')
    expect(receipt.result).toEqual({ accepted: true })

    const message = await runtime.client.waitSessionEvent('assistant/message')
    expect(JSON.stringify(message)).toContain('THANKS')
    await runtime.client.waitSessionEvent('turn/end')
  }, 60_000)

  it('shuts down through the desktop.shutdown request and exits 0', async () => {
    runtime = launchRuntime()
    runtime.client.request('desktop.initialize', { cwd: runtime.workspace }, 'init')
    await runtime.client.waitResponse('init')
    runtime.client.request('desktop.shutdown', {}, 'sd')
    const shutdown = await runtime.client.waitResponse('sd')
    expect(shutdown.result).toEqual({})
    expect(await runtime.exited).toBe(0)
    runtime = undefined
  }, 60_000)

  it('never writes a credential-shaped value into stdout or stderr', async () => {
    const marker = 'DESKTOP_TEST_SECRET_MARKER_VALUE'
    runtime = launchRuntime({ env: { DEEPSEEK_API_KEY: marker } })
    await initializeAndCreateSession(runtime)
    runtime.client.request('desktop.describe', {}, 'dd')
    await runtime.client.waitResponse('dd')
    const output = await Promise.race([
      runtime.exited.then(() => 'exited'),
      new Promise<string>((resolvePromise) => { setTimeout(() => { resolvePromise('') }, 3000) }),
    ])
    expect(runtime.client.stderr).not.toContain(marker)
    expect(output).not.toContain(marker)
  }, 60_000)
})
