import { afterEach, describe, expect, it, vi } from 'vitest'
import { initializeHarness } from './harness-helpers.ts'
import { makeServerHarness, stubApiProxy, type ServerHarness } from './harness.ts'

describe('served route dispatch', () => {
  let harness: ServerHarness | undefined

  afterEach(async () => {
    await harness?.dispose()
    harness = undefined
  })

  it('routes session.list through the ApiProxy and echoes the client rpcId', async () => {
    const list = vi.fn(async (request: { rpcId: unknown; payload: unknown }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: { items: [] } },
    }))
    harness = await makeServerHarness({ api: stubApiProxy({ sessions: { list } as never }) })
    await initializeHarness(harness)
    harness.request('session.list', { rpcId: 'r1', payload: {} })
    const line = await harness.waitLine()
    expect(list).toHaveBeenCalledTimes(1)
    const [request] = list.mock.calls[0] as [{ rpcId: unknown; payload: unknown }]
    expect(request.payload).toEqual({})
    expect(typeof request.rpcId).toBe('string')
    expect(line.result).toMatchObject({ rpcId: 'r1', result: { ok: true, value: { items: [] } } })
  })

  it('routes subagent.list through the ApiProxy for the shared subagent catalog', async () => {
    const list = vi.fn(async (request: { rpcId: unknown; payload: unknown }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: { entries: [], parentAvailable: true } },
    }))
    harness = await makeServerHarness({ api: stubApiProxy({ subagents: { list } as never }) })
    await initializeHarness(harness)

    harness.request('subagent.list', { rpcId: 'subagents', payload: { parentSessionId: 's-1' } }, 'subagent-list-request')
    const line = await harness.waitResponse('subagent-list-request')
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ payload: { parentSessionId: 's-1' } }))
    expect(line.result).toMatchObject({
      rpcId: 'subagents',
      result: { ok: true, value: { entries: [], parentAvailable: true } },
    })
  })

  it('routes skill.list through the ApiProxy for the shared skill menu', async () => {
    const list = vi.fn(async (request: { rpcId: unknown; payload: unknown }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: { skills: [{ name: 'review', description: 'Review code', modelInvocable: true }] } },
    }))
    harness = await makeServerHarness({ api: stubApiProxy({ skills: { list } as never }) })
    await initializeHarness(harness)

    harness.request('skill.list', { rpcId: 'skills', payload: { sessionId: 's-1' } }, 'skill-list-request')
    const line = await harness.waitResponse('skill-list-request')
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ payload: { sessionId: 's-1' } }))
    expect(line.result).toMatchObject({
      rpcId: 'skills',
      result: { ok: true, value: { skills: [{ name: 'review', modelInvocable: true }] } },
    })
  })

  it('routes standard credential methods through the ApiProxy', async () => {
    const describe = vi.fn(async (request: { rpcId: unknown; payload: unknown }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: { credentials: { DEEPSEEK_API_KEY: { configured: false, writable: true } } } },
    }))
    const set = vi.fn(async (request: { rpcId: unknown; payload: unknown }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: {} },
    }))
    const unset = vi.fn(async (request: { rpcId: unknown; payload: unknown }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: {} },
    }))
    harness = await makeServerHarness({ api: stubApiProxy({ credentials: { describe, set, unset } as never }) })
    await initializeHarness(harness)

    harness.request('credentials.describe', { rpcId: 'describe', payload: { refs: ['DEEPSEEK_API_KEY'] } })
    expect((await harness.waitResponse('req-1')).result).toMatchObject({
      rpcId: 'describe',
      result: { ok: true, value: { credentials: { DEEPSEEK_API_KEY: { configured: false, writable: true } } } },
    })
    expect(describe).toHaveBeenCalledWith(expect.objectContaining({ payload: { refs: ['DEEPSEEK_API_KEY'] } }))

    harness.request('credentials.set', { rpcId: 'set', payload: { ref: 'DEEPSEEK_API_KEY', value: 'test-write-only-value' } }, 'set-request')
    expect((await harness.waitResponse('set-request')).result).toMatchObject({ rpcId: 'set', result: { ok: true, value: {} } })
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      payload: { ref: 'DEEPSEEK_API_KEY', value: 'test-write-only-value' },
    }))

    harness.request('credentials.unset', { rpcId: 'unset', payload: { ref: 'DEEPSEEK_API_KEY' } }, 'unset-request')
    expect((await harness.waitResponse('unset-request')).result).toMatchObject({ rpcId: 'unset', result: { ok: true, value: {} } })
    expect(unset).toHaveBeenCalledWith(expect.objectContaining({ payload: { ref: 'DEEPSEEK_API_KEY' } }))
  })

  it('refuses to serve apiproxy methods before initialize', async () => {
    harness = await makeServerHarness()
    harness.request('session.list', { rpcId: 'r1', payload: {} })
    const line = await harness.waitLine()
    expect(String(line.error?.message)).toContain('initialize must complete')
  })

  it('rejects a payload that fails the apiproxy schema', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    harness.request('session.list', { rpcId: 'r1', payload: { cursor: 42 } })
    const line = await harness.waitLine()
    const result = line.result as { rpcId: string; result: { ok: boolean; error: { code: string; message: string } } }
    expect(result.rpcId).toBe('r1')
    expect(result.result.ok).toBe(false)
    expect(result.result.error.code).toBe('bad-request')
    expect(result.result.error.message).toContain('invalid payload for session.list')
  })

  it('rejects a missing rpcId with the invalid-request sentinel', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    harness.request('session.list', { payload: {} })
    const line = await harness.waitLine()
    expect(line.result).toMatchObject({
      rpcId: 'invalid-request',
      result: { ok: false, error: { code: 'bad-request' } },
    })
  })

  it('reports unknown methods as method-not-found failures', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    harness.request('no.such.method', {})
    const line = await harness.waitLine()
    expect(line.error).toMatchObject({ message: 'method not found: no.such.method' })
  })

  it('accepts terminal cleanup after a runtime generation lost its live agent', async () => {
    harness = await makeServerHarness({ agents: { get: () => undefined } })
    await initializeHarness(harness)
    harness.request('desktop.terminal.kill', { sessionId: 'stale-session', terminalId: 'stale-pty' }, 'stale-terminal-kill')
    expect((await harness.waitResponse('stale-terminal-kill')).result).toEqual({ killed: false })
  })

  it('forwards respond to the ApiProxy and returns its receipt', async () => {
    const respond = vi.fn(async () => ({ accepted: false as const, reason: 'not-pending' as const }))
    harness = await makeServerHarness({ api: stubApiProxy({ respond }) })
    await initializeHarness(harness)
    harness.request('respond', { type: 'client-response', rpcId: 'r9', result: { ok: true, value: {} } })
    const line = await harness.waitLine()
    expect(respond).toHaveBeenCalledWith({ type: 'client-response', rpcId: 'r9', result: { ok: true, value: {} } })
    expect(line.result).toEqual({ accepted: false, reason: 'not-pending' })
  })
})
