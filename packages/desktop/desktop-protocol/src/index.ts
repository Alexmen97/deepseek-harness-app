/**
 * Shared wire protocol for the DeepSeek Harness desktop runtime: the named
 * request, result, and notification types both wire ends speak, plus the
 * protocol version and the negotiated-capability vocabulary. The server
 * plugin (@deepseek-ai/dsh-desktop-jsonrpc-server) serves this protocol over
 * newline-delimited JSON-RPC on the runtime's stdio; desktop clients and test
 * clients drive it.
 *
 * @module @deepseek-ai/dsh-desktop-protocol
 */

export {
  DESKTOP_PROTOCOL_VERSION,
  DESKTOP_SERVER_NAME,
  DESKTOP_HOST_REQUEST_METHODS,
} from './types.ts'
export type {
  DesktopCapabilities,
  DesktopCredentialBridge,
  DesktopHostRequestMap,
  DesktopInitializeParams,
  DesktopInitializeResult,
  DesktopNotificationMap,
  DesktopRequestEnvelope,
  DesktopRequestMap,
  DesktopResponseEnvelope,
  DesktopRuntimeDescription,
  DesktopRuntimeState,
  DesktopShutdownParams,
  DesktopStatusNotification,
} from './types.ts'
