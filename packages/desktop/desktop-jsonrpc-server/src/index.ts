/**
 * Desktop-facing JSON-RPC server plugin over newline-delimited stdio. It is a
 * physical carrier over ctx.apiProxy, exactly like the web fetch handler:
 * apiproxy surface methods dispatch through the same ApiProxy domain methods
 * and the same payload schemas, the mux/host event streams bridge into
 * JSON-RPC notifications with their frame payloads unchanged, and answerable
 * approval/question frames resolve through the unary 'respond' request.
 * Stdout is reserved for protocol frames; the tree must not load a stdout
 * logger. The composing app bin owns EOF and signal exits; this plugin owns
 * only its own subscriptions and the graceful 'desktop.shutdown' exchange.
 *
 * @module @deepseek-ai/dsh-desktop-jsonrpc-server
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Readable, Writable } from 'node:stream'
import type { z } from 'zod'
import Schema from '@deepseek-ai/schemastery'
import {
  JsonRpcLineTransport,
  JsonRpcResponseError,
} from '@deepseek-ai/dsh-sdk-protocol'
import {
  DESKTOP_PROTOCOL_VERSION,
  DESKTOP_SERVER_NAME,
} from '@deepseek-ai/dsh-desktop-protocol'
import type {
  DesktopCapabilities,
  DesktopCredentialBridge,
  DesktopInitializeParams,
  DesktopInitializeResult,
  DesktopRuntimeDescription,
  DesktopRuntimeState,
} from '@deepseek-ai/dsh-desktop-protocol'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy'
import type {
  ApiProxy,
  HostFrame,
  MuxFrame,
  RequestPayload,
  ResponseValue,
  RpcRequest,
  RpcResponse,
} from '@deepseek-ai/dsh-host-apiproxy'
import { clientResponseSchema } from '@deepseek-ai/dsh-host-apiproxy/api/rpc.schema'
import type { Wire } from '@deepseek-ai/dsh-host-apiproxy/api/rpc.schema'
import {
  sessionCancelRequestSchema,
  sessionCreateRequestSchema,
  sessionHistoryRequestSchema,
  sessionListRequestSchema,
  sessionModelsRequestSchema,
  sessionPromptRequestSchema,
  sessionSelectModelRequestSchema,
} from '@deepseek-ai/dsh-host-apiproxy/api/sessions.schema'
import {
  workspaceCreateRequestSchema,
  workspaceListRequestSchema,
} from '@deepseek-ai/dsh-host-apiproxy/api/workspace.schema'
import {
  llmModelsRequestSchema,
  llmProvidersRequestSchema,
} from '@deepseek-ai/dsh-host-apiproxy/api/llm.schema'
import {
  settingsDescribeRequestSchema,
  settingsMutateRequestSchema,
  settingsReplaceRequestSchema,
  settingsUpdateRequestSchema,
} from '@deepseek-ai/dsh-host-apiproxy/api/settings.schema'
import * as LlmDeepSeek from '@deepseek-ai/dsh-llm-deepseek'
import type {} from '@deepseek-ai/dsh-user-approval'
import type {} from '@deepseek-ai/dsh-user-questions'

/** Runtime identity values provided by the composing app bin. */
export interface DesktopRuntimeInfo {
  /** The DeepSeek Harness engine release this runtime embeds. */
  harnessVersion: string
  /** The desktop runtime package version. */
  runtimeVersion: string
  /** The desktop protocol version this runtime serves. */
  protocolVersion: number
}

export const name = 'desktop-jsonrpc-server'
/** Only the gateway face and the identity provider are required; capability flags read optional seams. */
export const inject = ['apiProxy', 'desktopRuntimeInfo']

/** JSON-RPC deployment config plus runtime-only test hooks. */
export interface JsonRpcConfig {
  /** Transport input override; production uses process.stdin. */
  input?: Readable
  /** Transport output override; production uses process.stdout. */
  output?: Writable
  /** Process-exit override; production uses process.exit. */
  exit?: (code: number) => void
  /**
   * Whether the desktop host answers credential requests over this
   * transport: enables the keychain capability flag and provides the
   * credential bridge service. Defaults to false for generic peers.
   */
  keychain?: boolean
}

export const Config: Schema<JsonRpcConfig> = Schema.object({
  keychain: Schema.boolean().default(false),
})

/**
 * Transport overrides provided by the composing app bin before entries mount
 * (the in-process test hook and the future non-stdio carriers); production
 * leaves it absent and the plugin uses the process streams.
 */
export interface DesktopRuntimeLaunch {
  /** Transport input override; production uses process.stdin. */
  input?: Readable
  /** Transport output override; production uses process.stdout. */
  output?: Writable
  /** Process-exit override; production uses process.exit. */
  exit?: (code: number) => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Optional transport overrides provided by the composing app bin before entries mount. */
    desktopRuntimeLaunch?: DesktopRuntimeLaunch
    /** Runtime identity values provided by the composing app bin (the desktop-runtime info provider). */
    desktopRuntimeInfo: DesktopRuntimeInfo
    /** The credential bridge the keychain credential provider consumes. */
    desktopCredentialBridge: DesktopCredentialBridge
  }
}

/** The apiproxy surface methods this carrier serves, in RpcMethodMap order. */
type ServedMethod =
  | 'session.list'
  | 'session.create'
  | 'session.history'
  | 'session.models'
  | 'session.prompt'
  | 'session.selectModel'
  | 'session.cancel'
  | 'workspace.list'
  | 'workspace.create'
  | 'llm.providers'
  | 'llm.models'
  | 'settings.describe'
  | 'settings.update'
  | 'settings.replace'
  | 'settings.mutate'

/**
 * One served apiproxy route: the same payload schema the web fetch carrier
 * validates, and an invoke that forwards the branded rpcId and validated
 * payload to the ApiProxy domain method.
 */
interface ServedRoute<K extends ServedMethod> {
  schema: z.ZodType<Wire<RequestPayload<K>>>
  invoke(api: ApiProxy, rpcId: RpcRequest<unknown>['rpcId'], payload: RequestPayload<K>): Promise<RpcResponse<ResponseValue<K>>>
}

/**
 * Compiler-locked dispatch table: every served method has one row pairing
 * its apiproxy schema with its ApiProxy invoke, so a schema pasted onto the
 * wrong row is a type error rather than a runtime surprise. The one cast per
 * row collapses the Wire widening back to the exact payload, matching the
 * web fetch carrier's documented boundary.
 */
const SERVED_ROUTES: { [K in ServedMethod]: ServedRoute<K> } = {
  'session.list': {
    schema: sessionListRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.list({ rpcId, payload }),
  },
  'session.create': {
    schema: sessionCreateRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.create({ rpcId, payload }),
  },
  'session.history': {
    schema: sessionHistoryRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.history({ rpcId, payload }),
  },
  'session.prompt': {
    schema: sessionPromptRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.prompt({ rpcId, payload }),
  },
  'session.models': {
    schema: sessionModelsRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.models({ rpcId, payload }),
  },
  'session.selectModel': {
    schema: sessionSelectModelRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.selectModel({ rpcId, payload }),
  },
  'session.cancel': {
    schema: sessionCancelRequestSchema,
    invoke: (api, rpcId, payload) => api.sessions.cancel({ rpcId, payload }),
  },
  'workspace.list': {
    schema: workspaceListRequestSchema,
    invoke: (api, rpcId, payload) => api.workspace.list({ rpcId, payload }),
  },
  'workspace.create': {
    schema: workspaceCreateRequestSchema,
    invoke: (api, rpcId, payload) => api.workspace.create({ rpcId, payload }),
  },
  'llm.providers': {
    schema: llmProvidersRequestSchema,
    invoke: (api, rpcId, payload) => api.llm.providers({ rpcId, payload }),
  },
  'llm.models': {
    schema: llmModelsRequestSchema,
    invoke: (api, rpcId, payload) => api.llm.models({ rpcId, payload }),
  },
  'settings.describe': {
    schema: settingsDescribeRequestSchema,
    invoke: (api, rpcId, payload) => api.settings.describe({ rpcId, payload }),
  },
  'settings.update': {
    schema: settingsUpdateRequestSchema,
    invoke: (api, rpcId, payload) => api.settings.update({ rpcId, payload }),
  },
  'settings.replace': {
    schema: settingsReplaceRequestSchema,
    invoke: (api, rpcId, payload) => api.settings.replace({ rpcId, payload }),
  },
  'settings.mutate': {
    schema: settingsMutateRequestSchema,
    invoke: (api, rpcId, payload) => api.settings.mutate({ rpcId, payload }),
  },
}

/** Resolve a plain string rpcId into a branded id, or undefined for an invalid wire value. */
function brandRpcId(value: unknown): RpcRequest<unknown>['rpcId'] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return RpcId(value)
}

/**
 * Serve the desktop protocol over the configured streams. Effect disposal
 * closes the transport and aborts both event-stream subscriptions; the
 * graceful 'desktop.shutdown' request disposes the complete root runtime and
 * exits 0 after the response is flushed.
 */
export function apply(ctx: Context, config: JsonRpcConfig = {}): void {
  const info: DesktopRuntimeInfo = ctx.desktopRuntimeInfo
  if (info.protocolVersion !== DESKTOP_PROTOCOL_VERSION) {
    throw new Error('desktop runtime info protocol version ' + String(info.protocolVersion) + ' does not match this server, which serves version ' + String(DESKTOP_PROTOCOL_VERSION))
  }
  const launch = ctx.get('desktopRuntimeLaunch')
  const input = launch?.input ?? config.input ?? process.stdin
  const output = launch?.output ?? config.output ?? process.stdout
  const exit = launch?.exit ?? config.exit ?? ((code: number): void => { process.exit(code) })
  const bootedAt = Date.now()

  const transport = new JsonRpcLineTransport(input, output)
  transport.start()

  const bridge: DesktopCredentialBridge = {
    resolve: async (ref) => {
      try {
        const result = await transport.request('desktop/credential-resolve', { ref }) as { value?: string }
        return typeof result.value === 'string' && result.value !== '' ? result.value : undefined
      } catch (error) {
        if (error instanceof JsonRpcResponseError) return undefined
        throw error
      }
    },
    store: async (ref, value) => {
      await transport.request('desktop/credential-store', { ref, value })
    },
    delete: async (ref) => {
      await transport.request('desktop/credential-delete', { ref })
    },
  }
  ctx.provide('desktopCredentialBridge', bridge)

  let state: DesktopRuntimeState = 'initializing'
  let initialized: DesktopInitializeParams | undefined
  let llmFiber: { dispose(): Promise<void> } | undefined
  let shuttingDown = false

  const notifyStatus = (): void => {
    transport.notify('desktop.status', { state })
  }

  const capabilities = (): DesktopCapabilities => ({
    sessions: true,
    workspaces: true,
    events: true,
    models: true,
    approvals: ctx.get('approval') !== undefined,
    questions: ctx.get('userQuestions') !== undefined,
    attachments: ctx.get('attachments') !== undefined,
    terminal: false,
    keychain: config.keychain === true,
  })

  /** True when a mounted LLM adapter serves the provider route. */
  const adapterServes = (provider: string): boolean =>
    ctx.get('llm')?.listProviders().some(entry => entry.id === provider) ?? false

  const initialize = async (params: DesktopInitializeParams): Promise<DesktopInitializeResult> => {
    if (params.cwd.trim() === '') throw new TypeError('initialize cwd must be a non-empty directory path')
    if (params.maxTokens !== undefined
      && (!Number.isSafeInteger(params.maxTokens) || params.maxTokens <= 0)) {
      throw new TypeError('initialize maxTokens must be a positive safe integer')
    }
    const provider = params.provider ?? 'deepseek-official'
    const model = params.model ?? 'deepseek-v4-flash'
    if (initialized !== undefined) {
      const same = initialized.cwd === params.cwd
        && (initialized.provider ?? 'deepseek-official') === provider
        && (initialized.model ?? 'deepseek-v4-flash') === model
        && initialized.maxTokens === params.maxTokens
      if (!same) throw new Error('desktop.initialize was already completed with different parameters')
    } else {
      if (!adapterServes(provider)) {
        if (provider !== 'deepseek-official') throw new Error('no adapter registered for provider ' + JSON.stringify(provider))
        llmFiber = await ctx.plugin(LlmDeepSeek, {})
      }
      initialized = { cwd: params.cwd.trim(), provider, model, ...(params.maxTokens === undefined ? {} : { maxTokens: params.maxTokens }) }
      state = 'ready'
      notifyStatus()
    }
    return {
      protocolVersion: info.protocolVersion,
      harnessVersion: info.harnessVersion,
      runtimeVersion: info.runtimeVersion,
      serverInfo: { name: DESKTOP_SERVER_NAME, version: info.runtimeVersion },
      capabilities: capabilities(),
    }
  }

  const describe = (): DesktopRuntimeDescription => ({
    state,
    protocolVersion: info.protocolVersion,
    harnessVersion: info.harnessVersion,
    runtimeVersion: info.runtimeVersion,
    pid: process.pid,
    uptimeMs: Date.now() - bootedAt,
  })

  transport.onRequest(async (method, rawParams) => {
    if (shuttingDown) throw new Error('desktop runtime is shutting down')
    switch (method) {
      // The wire cannot carry types; initialize validates the fields it consumes.
      case 'desktop.initialize': return initialize(rawParams as unknown as DesktopInitializeParams)
      case 'desktop.describe': return describe()
      case 'desktop.shutdown': {
        if (state !== 'stopping') {
          state = 'stopping'
          notifyStatus()
        }
        void (async (): Promise<void> => {
          await transport.flush()
          await ctx.root.fiber.dispose()
          exit(0)
        })().catch(() => { exit(1) })
        return {}
      }
      case 'respond': {
        const parsed = clientResponseSchema.safeParse(rawParams)
        if (!parsed.success) return { accepted: false, reason: 'bad-response' }
        return ctx.apiProxy.respond(parsed.data)
      }
      default: {
        // The shared transport reports every handler failure as -32603; the
        // message keeps the method-not-found semantics the client renders.
        if (!(method in SERVED_ROUTES)) throw new Error('method not found: ' + method)
        if (initialized === undefined) throw new Error('desktop.initialize must complete before ' + method)
        const route = SERVED_ROUTES[method as ServedMethod]
        const envelope = rawParams as { rpcId?: unknown; payload?: unknown }
        const rpcId = brandRpcId(envelope.rpcId)
        if (rpcId === undefined) {
          return { rpcId: 'invalid-request', result: { ok: false, error: { code: 'bad-request', message: 'invalid client-request message: rpcId must be a non-empty string', details: { issues: [] } } } }
        }
        const parsed = route.schema.safeParse(envelope.payload)
        if (!parsed.success) {
          return { rpcId: String(rpcId), result: { ok: false, error: { code: 'bad-request', message: 'invalid payload for ' + method, details: { issues: parsed.error.issues } } } }
        }
        // One cast point: each route row is compiler-locked to its method's
        // payload and result, so the validated wire value dispatches safely.
        const applied = await (route.invoke as (api: ApiProxy, rpcId: RpcRequest<unknown>['rpcId'], payload: unknown) => Promise<RpcResponse<unknown>>)(
          ctx.apiProxy, rpcId, parsed.data,
        )
        return { rpcId: String(applied.rpcId), result: applied.result }
      }
    }
  })

  const abort = new AbortController()
  const streamInto = async (
    frames: AsyncIterable<RpcRequest<MuxFrame> | RpcRequest<HostFrame>>,
    notification: 'events.mux' | 'events.host',
  ): Promise<void> => {
    for await (const frame of frames) {
      transport.notify(notification, { rpcId: String(frame.rpcId), payload: frame.payload })
    }
  }

  const muxTask = streamInto(
    ctx.apiProxy.events.mux({ rpcId: RpcId(crypto.randomUUID()), payload: {} }, abort.signal),
    'events.mux',
  ).catch(() => {})
  const hostTask = streamInto(
    ctx.apiProxy.events.host({ rpcId: RpcId(crypto.randomUUID()), payload: {} }, abort.signal),
    'events.host',
  ).catch(() => {})

  ctx.effect(() => () => {
    shuttingDown = true
    abort.abort()
    transport.close()
    void muxTask
    void hostTask
    if (llmFiber !== undefined) void llmFiber.dispose()
  }, 'desktop-jsonrpc-server: transport')
}
