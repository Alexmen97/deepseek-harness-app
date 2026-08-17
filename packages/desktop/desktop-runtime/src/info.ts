/**
 * Runtime identity provider: serves the versions and protocol revision the
 * desktop JSON-RPC server reports at handshake. One home for the identity
 * values, provided before the server entry mounts.
 *
 * @module @deepseek-ai/dsh-desktop-runtime/info
 */

import type { Context } from '@deepseek-ai/cordis'
import { DESKTOP_PROTOCOL_VERSION } from '@deepseek-ai/dsh-desktop-protocol'
import type { DesktopRuntimeInfo } from '@deepseek-ai/dsh-desktop-jsonrpc-server'

/** Cordis plugin name. */
export const name = 'desktop-runtime-info'

/**
 * The engine and runtime ship in lockstep from one repository release; keep
 * this constant on the repository release version. A constant rather than a
 * package.json read, so the single-executable SEA snapshot performs no
 * manifest lookup at boot.
 */
const RUNTIME_VERSION = '0.1.0-rc.7'

/** Provide the desktop runtime identity the server plugin injects. */
export function apply(ctx: Context): void {
  const info: DesktopRuntimeInfo = {
    harnessVersion: RUNTIME_VERSION,
    runtimeVersion: RUNTIME_VERSION,
    protocolVersion: DESKTOP_PROTOCOL_VERSION,
  }
  ctx.provide('desktopRuntimeInfo', info)
}
