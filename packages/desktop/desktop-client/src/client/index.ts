/**
 * Desktop client plugin face: the connection carrier, the host-capabilities
 * service, and the native workspace-picker occupant.
 *
 * @module @deepseek-ai/dsh-desktop-client/client
 */

export { name as connectionName, inject as connectionInject, apply as applyConnection } from './connection.ts'
export { name as hostName, inject as hostInject, apply as applyHost } from './host.ts'
export type { DesktopHostService } from './host.ts'
export { name as pickerName, inject as pickerInject, apply as applyPicker } from './picker.ts'
