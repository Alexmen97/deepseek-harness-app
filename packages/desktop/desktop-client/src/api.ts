/**
 * DesktopApiClient: the Tauri IPC carrier implementing the upstream
 * AbstractApiClient contract. Every protocol invariant — rpcId minting, the
 * four-quadrant envelopes, zod parsing, timeouts, respond receipts — stays in
 * the upstream base; only the transport aspects (doFetch and the two stream
 * openers) are desktop-specific.
 *
 * @module @deepseek-ai/dsh-desktop-client/api
 */

import type { ClientRequest, ClientResponse, HostFrame, MuxFrame, RpcRequest } from '@deepseek-ai/dsh-host-apiproxy'
import { AbstractApiClient } from '@deepseek-ai/dsh-host-apiproxy/client'
import { hostFrameSchema, muxFrameSchema } from '@deepseek-ai/dsh-host-apiproxy/api/events.schema'
import type { z } from 'zod'
import { desktopBindings, type DesktopRuntimeFrame, type DesktopTransport } from './transport.ts'

/** Reject on abort so upstream timeout and caller signals ride the IPC round trip. */
function raceSignal<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) return promise
  if (signal.aborted) {
    const reason: Error = signal.reason instanceof Error ? signal.reason : new Error('aborted')
    return Promise.reject(reason)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      const reason: Error = signal.reason instanceof Error ? signal.reason : new Error('aborted')
      reject(reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value) },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/**
 * Desktop carrier over one generic typed transport. Frames carry the runtime
 * generation and are dropped unless they belong to the current generation; a
 * generation transition ends every open stream so the upstream connection
 * controller reconnects against the replacement runtime.
 */
export class DesktopApiClient extends AbstractApiClient {
  /** The generation this instance serves; updated by state subscriptions. */
  private generation = 0
  /** Active frame handlers, one per open stream plus the shared filter. */
  private readonly frameHandlers = new Set<(frame: DesktopRuntimeFrame) => void>()
  private readonly streamControllers = new Set<AbortController>()
  private readonly unsubscribeState: () => void
  private readonly unsubscribeFrames: () => void
  private initPromise: Promise<void> | undefined
  private workspaceDir: string | undefined

  constructor(private readonly transport: DesktopTransport, timeoutMs?: number) {
    super(timeoutMs)
    this.unsubscribeState = transport.subscribeState((state) => {
      if (state.generation !== this.generation) {
        this.generation = state.generation
        // A replacement runtime needs a fresh initialize before any route.
        this.initPromise = undefined
        for (const controller of this.streamControllers) controller.abort(new Error('runtime generation changed'))
        this.streamControllers.clear()
      }
    })
    this.unsubscribeFrames = transport.subscribeFrames((frame) => {
      if (frame.generation !== this.generation) return
      for (const handler of this.frameHandlers) handler(frame)
    })
  }

  /** Detach subscriptions; pending requests still settle through the transport. */
  dispose(): void {
    this.unsubscribeState()
    this.unsubscribeFrames()
    this.frameHandlers.clear()
    for (const controller of this.streamControllers) controller.abort(new Error('client disposed'))
    this.streamControllers.clear()
  }

  /** The runtime refuses apiproxy routes until desktop.initialize completes. */
  private ensureInitialized(): Promise<void> {
    this.initPromise ??= (async () => {
      let workspace: string | null | undefined
      try {
        workspace = await desktopBindings().host.prefsGet('workspace')
      } catch {
        // No bindings installed (host-equivalent tests): initialize with the
        // runtime's own launch cwd; the route table still admits requests.
        workspace = undefined
      }
      this.workspaceDir = workspace
      await this.transport.request({
        method: 'desktop.initialize',
        rpcId: '',
        payload: workspace == null || workspace === '' ? {} : { cwd: workspace },
        generation: this.generation,
      })
    })().catch((error: unknown) => {
      this.initPromise = undefined
      throw error
    })
    return this.initPromise
  }

  protected override doFetch(input: URL, init?: RequestInit): Promise<Response> {
    const path = input.pathname
    if (path === '/api/respond') {
      const message = JSON.parse(init?.body as string) as ClientResponse
      // The respond receipt is the server's payload directly, never wrapped.
      return this.send({ method: 'respond', rpcId: message.rpcId, payload: message }, init)
        .then(result => new Response(JSON.stringify(result), { status: 200 }))
    }
    if (!path.startsWith('/api/')) return Promise.reject(new Error('desktop transport does not serve ' + path))
    const method = path.slice('/api/'.length)
    const message = JSON.parse(init?.body as string) as ClientRequest
    // The upstream handshake method maps onto the desktop protocol's describe.
    const wireMethod = method === 'host.describe' ? 'desktop.describe' : method
    return this.ensureInitialized()
      .then(() => this.send({ method: wireMethod, rpcId: message.rpcId, payload: message.payload }, init))
      .then((result) => {
        if (wireMethod === 'desktop.describe') {
          // The desktop describe returns the runtime description directly;
          // translate it into the upstream host.describe value shape.
          const description = result as { harnessVersion?: unknown; runtimeVersion?: unknown }
          return new Response(JSON.stringify({
            type: 'server-response',
            rpcId: message.rpcId,
            result: {
              ok: true,
              value: {
                version: typeof description.harnessVersion === 'string' ? description.harnessVersion : '0.1.0-rc.7',
                cwd: this.workspaceDir ?? '',
                attachedSessions: 0,
                canOpenPath: false,
              },
            },
          }), { status: 200 })
        }
        // The runtime answers with the unary payload { rpcId, result }; the
        // upstream carrier parses the four-quadrant wire message, so attach
        // the missing discriminant without re-wrapping an existing message.
        const body = result !== null && typeof result === 'object' && !('type' in result)
          ? { type: 'server-response', rpcId: (result as { rpcId?: unknown }).rpcId, result: (result as { result?: unknown }).result }
          : result
        return new Response(JSON.stringify(body), { status: 200 })
      })
  }

  /** One unary round trip: send the typed request over the IPC transport. */
  private async send(
    request: { method: string; rpcId: string; payload: unknown },
    init: RequestInit | undefined,
  ): Promise<unknown> {
    return raceSignal(
      this.transport.request({ ...request, generation: this.generation }),
      init?.signal ?? undefined,
    )
  }

  protected override openMux(_payload: unknown, signal: AbortSignal, onOpen?: () => void): AsyncIterable<RpcRequest<MuxFrame>> {
    return this.openStream<MuxFrame>('mux', signal, muxFrameSchema, onOpen)
  }

  protected override openHost(_payload: unknown, signal: AbortSignal, onOpen?: () => void): AsyncIterable<RpcRequest<HostFrame>> {
    return this.openStream<HostFrame>('host', signal, hostFrameSchema, onOpen)
  }

  /** One generation-scoped frame stream; onOpen fires once the subscription exists. */
  private openStream<F extends { type: string }>(
    stream: 'mux' | 'host',
    signal: AbortSignal,
    schema: z.ZodType<F>,
    onOpen?: () => void,
  ): AsyncIterable<RpcRequest<F>> {
    const buffer: DesktopRuntimeFrame[] = []
    let wake: (() => void) | undefined
    const handler = (frame: DesktopRuntimeFrame): void => {
      if (frame.stream !== stream) return
      buffer.push(frame)
      wake?.()
      wake = undefined
    }
    const controller = new AbortController()
    this.streamControllers.add(controller)
    this.frameHandlers.add(handler)
    onOpen?.()
    // The setup above runs eagerly so frames arriving between subscription
    // and the first pull are buffered instead of dropped; the generator body
    // only drains the buffer and waits.
    const streamControllers = this.streamControllers
    const frameHandlers = this.frameHandlers
    const generator = (async function * (): AsyncGenerator<RpcRequest<F>> {
      try {
        while (true) {
          if (signal.aborted || controller.signal.aborted) return
          while (buffer.length > 0) {
            const frame = buffer.shift() as DesktopRuntimeFrame
            let payload: F
            try {
              payload = schema.parse(frame.payload)
            } catch (error) {
              console.error('[desktop] dropping malformed ' + stream + ' frame:', error)
              continue
            }
            yield { rpcId: frame.rpcId as never, payload }
          }
          await new Promise<void>((resolve) => { wake = resolve })
        }
      } finally {
        streamControllers.delete(controller)
        frameHandlers.delete(handler)
      }
    })()
    return generator
  }
}
