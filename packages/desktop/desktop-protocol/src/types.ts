/**
 * Named wire types for the DeepSeek Harness desktop runtime protocol: the
 * request/result pairs and server-to-client notification payloads exchanged
 * over newline-delimited JSON-RPC on the runtime's stdio. The desktop runtime
 * server plugin (@deepseek-ai/dsh-desktop-jsonrpc-server) serves this
 * protocol; desktop clients (the Tauri frontend, test clients) drive it.
 *
 * Method names follow the web API proxy convention (dot-separated): apiproxy
 * surface methods reuse their RpcMethodMap keys verbatim
 * ('session.list', 'session.create', 'workspace.list', 'respond'), and
 * desktop-only methods use a 'desktop.' prefix. Notification names use the
 * apiproxy stream domain names ('events.mux', 'events.host') plus
 * 'desktop.status'.
 *
 * @module @deepseek-ai/dsh-desktop-protocol/types
 */

import type {
  ClientResponse,
  HostFrame,
  MuxFrame,
  RequestPayload,
  ResponseValue,
  RpcReceipt,
  RpcRequest,
} from '@deepseek-ai/dsh-host-apiproxy'

/**
 * The desktop wire protocol version. Bumped only on breaking wire changes;
 * the desktop app rejects a runtime whose reported protocolVersion differs
 * from the version it was built against.
 */
export const DESKTOP_PROTOCOL_VERSION = 1 as const

/** Wire-stable runtime identity. */
export const DESKTOP_SERVER_NAME = 'deepseek-harness-desktop-runtime' as const

/**
 * Negotiated runtime capabilities. Computed by the server from the composed
 * services at initialize time; clients must branch on these values, never on
 * version numbers.
 */
export interface DesktopCapabilities {
  /** Session create/list/history/prompt/cancel are served. */
  sessions: boolean
  /** Workspace list/create are served. */
  workspaces: boolean
  /** The events.mux and events.host streams are served. */
  events: boolean
  /** Approval request frames are served and answerable through respond. */
  approvals: boolean
  /** Question request frames are served and answerable through respond. */
  questions: boolean
  /** Model catalog methods (llm.providers, llm.models) are served. */
  models: boolean
  /** Image attachments are served (attachment store mounted). */
  attachments: boolean
  /** Interactive terminal sessions; false until the desktop terminal domain lands. */
  terminal: false
  /** Whether the desktop host answers credential requests from the macOS Keychain. */
  keychain: boolean
}

/** Parameters for the process-wide desktop handshake. */
export interface DesktopInitializeParams {
  /**
   * Workspace root recorded on every desktop-created session header. Must
   * equal the runtime process launch cwd: one sidecar serves one workspace
   * (M1A), and the sandbox policy pins the same root at boot.
   */
  cwd: string
  /** Provider route every desktop-created agent runs on. */
  provider?: string
  /** Model name every desktop-created agent runs on. */
  model?: string
  /** Optional positive output-token cap inherited by desktop-created agents. */
  maxTokens?: number
}

/** Handshake result: identity, versions, and negotiated capabilities. */
export interface DesktopInitializeResult {
  /** The protocol version this runtime serves (DESKTOP_PROTOCOL_VERSION). */
  protocolVersion: number
  /** The DeepSeek Harness engine release this runtime embeds. */
  harnessVersion: string
  /** The desktop runtime package version. */
  runtimeVersion: string
  /** Wire-stable server identity. */
  serverInfo: {
    name: typeof DESKTOP_SERVER_NAME
    version: string
  }
  /** Capabilities negotiated from the composed services. */
  capabilities: DesktopCapabilities
}

/** Parameters for the graceful shutdown request. */
export type DesktopShutdownParams = Record<string, never>

/** Runtime lifecycle states reported through desktop.status. */
export type DesktopRuntimeState = 'initializing' | 'ready' | 'stopping'

/** Server-to-client lifecycle notification payload. */
export interface DesktopStatusNotification {
  /** The runtime state after the transition. */
  state: DesktopRuntimeState
}

/**
 * Requests the runtime may send to the trusted desktop host (server-initiated
 * JSON-RPC with an id the host must answer). The M1B host implements all
 * three over the macOS Keychain; other peers answer method-not-found and the
 * runtime falls back to its environment layer.
 */
export interface DesktopHostRequestMap {
  'desktop/credential-resolve': { params: { ref: string }; result: { value?: string } }
  'desktop/credential-store': { params: { ref: string; value: string }; result: Record<string, never> }
  'desktop/credential-delete': { params: { ref: string }; result: Record<string, never> }
}

/** The server-initiated host request methods the desktop transport answers. */
export const DESKTOP_HOST_REQUEST_METHODS: readonly (keyof DesktopHostRequestMap)[] = [
  'desktop/credential-resolve',
  'desktop/credential-store',
  'desktop/credential-delete',
] as const

/**
 * The credential bridge the runtime credential provider consumes: each
 * operation crosses the stdio transport as one server-initiated request and
 * returns only what the desktop host answered. Implemented by the desktop
 * JSON-RPC server; consumed by the keychain credential provider.
 */
export interface DesktopCredentialBridge {
  /** Resolve one reference against the desktop host's Keychain. */
  resolve(ref: string): Promise<string | undefined>
  /** Store one reference in the desktop host's Keychain. */
  store(ref: string, value: string): Promise<void>
  /** Delete one reference from the desktop host's Keychain. */
  delete(ref: string): Promise<void>
}

/** Runtime description served by desktop.describe. */
export interface DesktopRuntimeDescription {
  /** The runtime state at answer time. */
  state: DesktopRuntimeState
  /** The protocol version this runtime serves. */
  protocolVersion: number
  /** The DeepSeek Harness engine release this runtime embeds. */
  harnessVersion: string
  /** The desktop runtime package version. */
  runtimeVersion: string
  /** Process id of the runtime, when the deployment knows it. */
  pid?: number
  /** Milliseconds since the runtime booted. */
  uptimeMs: number
}

/**
 * Unary request params on the desktop wire: the client mints rpcId and the
 * server echoes it in the result, preserving the four-quadrant message model
 * of the web API proxy over the JSON-RPC carrier.
 */
export interface DesktopRequestEnvelope<P> {
  rpcId: string
  payload: P
}

/**
 * Unary result on the desktop wire: the web API proxy RpcResponse shape with
 * an unbranded rpcId (the wire carries plain strings; the server brands it
 * before invoking the ApiProxy method).
 */
export interface DesktopResponseEnvelope<T> {
  rpcId: string
  result: { ok: true; value: T } | { ok: false; error: unknown }
}

/** Client-to-server request methods with their param and result shapes. */
export interface DesktopRequestMap {
  'desktop.initialize': { params: DesktopInitializeParams; result: DesktopInitializeResult }
  'desktop.shutdown': { params: DesktopShutdownParams; result: Record<string, never> }
  'desktop.describe': { params: Record<string, never>; result: DesktopRuntimeDescription }
  'session.list': { params: DesktopRequestEnvelope<RequestPayload<'session.list'>>; result: DesktopResponseEnvelope<ResponseValue<'session.list'>> }
  'session.create': { params: DesktopRequestEnvelope<RequestPayload<'session.create'>>; result: DesktopResponseEnvelope<ResponseValue<'session.create'>> }
  'session.history': { params: DesktopRequestEnvelope<RequestPayload<'session.history'>>; result: DesktopResponseEnvelope<ResponseValue<'session.history'>> }
  'session.prompt': { params: DesktopRequestEnvelope<RequestPayload<'session.prompt'>>; result: DesktopResponseEnvelope<ResponseValue<'session.prompt'>> }
  'session.cancel': { params: DesktopRequestEnvelope<RequestPayload<'session.cancel'>>; result: DesktopResponseEnvelope<ResponseValue<'session.cancel'>> }
  'workspace.list': { params: DesktopRequestEnvelope<RequestPayload<'workspace.list'>>; result: DesktopResponseEnvelope<ResponseValue<'workspace.list'>> }
  'workspace.create': { params: DesktopRequestEnvelope<RequestPayload<'workspace.create'>>; result: DesktopResponseEnvelope<ResponseValue<'workspace.create'>> }
  'llm.providers': { params: DesktopRequestEnvelope<RequestPayload<'llm.providers'>>; result: DesktopResponseEnvelope<ResponseValue<'llm.providers'>> }
  'llm.models': { params: DesktopRequestEnvelope<RequestPayload<'llm.models'>>; result: DesktopResponseEnvelope<ResponseValue<'llm.models'>> }
  'respond': { params: ClientResponse; result: RpcReceipt }
}

/** Server-to-client notification payloads by JSON-RPC method name. */
export interface DesktopNotificationMap {
  'events.mux': RpcRequest<MuxFrame>
  'events.host': RpcRequest<HostFrame>
  'desktop.status': DesktopStatusNotification
}
