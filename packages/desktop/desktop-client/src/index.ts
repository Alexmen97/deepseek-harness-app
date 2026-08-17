/**
 * Desktop client package: the typed IPC carrier, the connection plugin, the
 * native picker, host capabilities, and the boot entry.
 *
 * @module @deepseek-ai/dsh-desktop-client
 */

export { DesktopApiClient } from './api.ts'
export {
  installDesktopBindings,
  desktopBindings,
} from './transport.ts'
export type {
  DesktopBindings,
  DesktopCredentialStatus,
  DesktopHost,
  DesktopRuntimeFrame,
  DesktopRuntimeLifecycle,
  DesktopTransport,
  DesktopTransportRequest,
} from './transport.ts'
