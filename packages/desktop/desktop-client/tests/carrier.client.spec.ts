import { afterEach, describe, expect, it } from 'vitest'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy'
import type { ClientResponse } from '@deepseek-ai/dsh-host-apiproxy'
import { installDesktopBindings } from '../src/transport.ts'
import type { DesktopBindings, DesktopRuntimeFrame, DesktopRuntimeLifecycle } from '../src/transport.ts'
import { DesktopApiClient } from '../src/api.ts'

/** Scripted transport: captures requests and lets the test push frames/state. */
function fakeTransport() {
  const requests: { method: string; rpcId: string; payload: unknown; generation: number }[] = []
  const frameHandlers = new Set<(frame: DesktopRuntimeFrame) => void>()
  const stateHandlers = new Set<(state: DesktopRuntimeLifecycle) => void>()
  let respond: (request: { method: string; rpcId: string; payload: unknown; generation: number }) => Promise<unknown> = async () => ({})
  return {
    requests,
    setRespond(next: typeof respond) { respond = next },
    pushFrame(frame: DesktopRuntimeFrame) { for (const handler of frameHandlers) handler(frame) },
    pushState(state: DesktopRuntimeLifecycle) { for (const handler of stateHandlers) handler(state) },
    bindings: {
      transport: {
        request: (request) => { requests.push(request); return respond(request) },
        subscribeFrames: (handler) => { frameHandlers.add(handler); return () => { frameHandlers.delete(handler) } },
        subscribeState: (handler) => { stateHandlers.add(handler); return () => { stateHandlers.delete(handler) } },
      },
      host: {
        pickWorkspace: async () => null,
        credentialStatus: async () => ({ configured: false }),
        credentialSet: async () => {},
        credentialDelete: async () => {},
        fsList: async () => [],
        fsReadText: async () => '',
        revealInPath: async () => {},
        gitStatus: async () => ({ repository: false }),
        gitDiff: async () => ({ repository: false }),
        openLogs: async () => {},
        openExternal: async () => {},
        prefsGet: async () => undefined,
        prefsSet: async () => {},
        restartRuntime: async () => {},
        stopRuntime: async () => {},
        diagnostics: async () => ({}),
        setMenuLanguage: async () => {},
        notify: async () => {},
        subscribeFocus: () => () => {},
        pickAttachments: async () => [],
        runtimeStatus: async () => ({ state: 'stopped', generation: 0 }),
      },
    } satisfies DesktopBindings,
  }
}

describe('DesktopApiClient carrier', () => {
  afterEach(() => {
    installDesktopBindings({ transport: fakeTransport().bindings.transport, host: fakeTransport().bindings.host })
  })

  it('routes a unary request with the client rpcId and parses the result', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    fake.pushState({ state: 'running', generation: 1 })
    fake.setRespond(async request => ({
      rpcId: request.rpcId,
      result: { ok: true, value: { items: [] } },
    }))
    const response = await api.sessions.list({})
    expect(response.result.ok).toBe(true)
    // The carrier initializes the runtime before the first business route.
    expect(fake.requests).toHaveLength(2)
    expect(fake.requests[0]).toMatchObject({ method: 'desktop.initialize', generation: 1 })
    expect(fake.requests[1]).toMatchObject({ method: 'session.list', payload: {}, generation: 1 })
    expect(typeof fake.requests[1]?.rpcId).toBe('string')
    api.dispose()
  })

  it('passes respond through the full ClientResponse payload', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    fake.setRespond(async () => ({ accepted: true }))
    const message: ClientResponse = { type: 'client-response', rpcId: RpcId('r9'), result: { ok: true, value: {} } }
    await expect(api.respond(message)).resolves.toEqual({ accepted: true })
    expect(fake.requests[0]).toMatchObject({ method: 'respond', rpcId: 'r9', payload: message })
    api.dispose()
  })

  it('streams mux frames and fires onOpen once', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    let opened = 0
    const events = api.events.mux({}, new AbortController().signal, () => { opened += 1 })
    const iterator = events[Symbol.asyncIterator]()
    fake.pushFrame({
      generation: 0,
      stream: 'mux',
      rpcId: 'f1',
      payload: { type: 'session/event', sessionId: 's1', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 1 } } },
    })
    const first = await iterator.next()
    expect(first.done).toBe(false)
    expect((first.value as { payload: { type: string } }).payload.type).toBe('session/event')
    expect(opened).toBe(1)
    void iterator.return?.(undefined)
    api.dispose()
  })

  it('rejects transport failures', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    fake.pushState({ state: 'running', generation: 1 })
    fake.setRespond(async () => { throw new Error('runtime gone') })
    await expect(api.sessions.list({})).rejects.toThrow('runtime gone')
    api.dispose()
  })

  it('rejects a hung request at the carrier timeout', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport, 50)
    fake.pushState({ state: 'running', generation: 1 })
    fake.setRespond(async (request) => {
      if (request.method === 'desktop.initialize') return { rpcId: request.rpcId, result: { ok: true, value: {} } }
      return new Promise<never>(() => {})
    })
    await expect(api.sessions.list({})).rejects.toThrow()
    api.dispose()
  })

  it('tags requests with the new generation and drops stale frames', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    fake.setRespond(async request => ({ type: 'server-response', rpcId: request.rpcId, result: { ok: true, value: { items: [] } } }))
    fake.pushState({ state: 'running', generation: 2 })
    await api.sessions.list({})
    expect(fake.requests[0]?.generation).toBe(2)

    const events = api.events.mux({}, new AbortController().signal)
    const iterator = events[Symbol.asyncIterator]()
    fake.pushFrame({ generation: 1, stream: 'mux', rpcId: 'old', payload: { type: 'session/event', sessionId: 's1', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 1 } } } })
    fake.pushFrame({ generation: 2, stream: 'mux', rpcId: 'new', payload: { type: 'session/event', sessionId: 's1', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 1 } } } })
    const first = await iterator.next()
    expect((first.value as { rpcId: string }).rpcId).toBe('new')
    void iterator.return?.(undefined)
    api.dispose()
  })

  it('ends open streams when the generation changes', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    const events = api.events.mux({}, new AbortController().signal)
    const iterator = events[Symbol.asyncIterator]()
    fake.pushState({ state: 'running', generation: 3 })
    await expect(iterator.next()).resolves.toMatchObject({ done: true })
    api.dispose()
  })

  it('skips malformed frames and keeps streaming', async () => {
    const fake = fakeTransport()
    installDesktopBindings(fake.bindings)
    const api = new DesktopApiClient(fake.bindings.transport)
    const events = api.events.mux({}, new AbortController().signal)
    const iterator = events[Symbol.asyncIterator]()
    fake.pushFrame({ generation: 0, stream: 'mux', rpcId: 'bad', payload: { type: 'not-a-frame' } })
    fake.pushFrame({ generation: 0, stream: 'mux', rpcId: 'ok', payload: { type: 'session/event', sessionId: 's1', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 1 } } } })
    const first = await iterator.next()
    expect((first.value as { rpcId: string }).rpcId).toBe('ok')
    void iterator.return?.(undefined)
    api.dispose()
  })
})
