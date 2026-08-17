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
