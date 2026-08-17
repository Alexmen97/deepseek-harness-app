import { afterEach, describe, expect, it } from 'vitest'
import { initializeHarness } from './harness-helpers.ts'
import { makeServerHarness, stubApiProxy, type ServerHarness } from './harness.ts'

describe('desktop transport lifecycle', () => {
  let harness: ServerHarness | undefined

  afterEach(async () => {
    await harness?.dispose()
    harness = undefined
  })

  it('keeps stdout to protocol frames only', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    harness.request('no.such.method', {})
    await harness.waitLine()
    const frames = harness.allLines
    expect(frames.length).toBeGreaterThan(0)
    for (const frame of frames) {
      expect((frame as { jsonrpc?: unknown }).jsonrpc).toBe('2.0')
    }
  })

  it('ignores malformed input lines and keeps serving', async () => {
    harness = await makeServerHarness()
    harness.write('this is not json')
    harness.write('{"jsonrpc":"2.0","method":"unexpected"}')
    await initializeHarness(harness)
  })

  it('shuts down gracefully: stopping status, response, exit 0', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    harness.request('desktop.shutdown', {})
    const status = await harness.waitLine()
    expect(status.method).toBe('desktop.status')
    expect(status.params).toEqual({ state: 'stopping' })
    const shutdown = await harness.waitLine()
    expect(shutdown.result).toEqual({})
    await new Promise<void>((resolve) => { setTimeout(resolve, 25) })
    expect(harness.exits).toEqual([0])
  })

  it('bridges the mux stream into notifications without conversion', async () => {
    async function * mux(): AsyncIterable<unknown> {
      yield { rpcId: { toString: () => 'f1' }, payload: { type: 'session/event', sessionId: 's1', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 1 } } } }
    }
    harness = await makeServerHarness({ api: stubApiProxy({ mux: mux as never }) })
    const frame = await harness.waitLine()
    expect(frame.method).toBe('events.mux')
    expect(frame.params).toMatchObject({ rpcId: 'f1', payload: { type: 'session/event', sessionId: 's1' } })
  })

  it('stops delivering and closes the transport when disposed', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    await harness.dispose()
    harness = undefined
  })
})
