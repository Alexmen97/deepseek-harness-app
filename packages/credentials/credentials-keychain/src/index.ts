/**
 * Keychain-backed credential provider for the desktop runtime. The secret
 * itself never lives in the runtime's storage: every operation crosses the
 * stdio transport as one server-initiated request the trusted desktop host
 * answers from the macOS Keychain. An environment fallback layer keeps
 * automated tests and explicit development mode keyless, and is the ONLY
 * non-Keychain source; it is not the production path.
 *
 * @module @deepseek-ai/dsh-credentials-keychain
 */

import { CredentialProvider, type CredentialInfo, type CredentialRef, type ResolvedCredential } from '@deepseek-ai/dsh-credentials'
import type { DesktopCredentialBridge } from '@deepseek-ai/dsh-desktop-protocol'
// Type-only: brings the desktopCredentialBridge Context key into this program.
import type {} from '@deepseek-ai/dsh-desktop-jsonrpc-server'

/** Cordis plugin name. */
export const name = 'credentials-keychain'
/** The credential bridge the desktop JSON-RPC server provides. */
export const inject = ['desktopCredentialBridge']

/**
 * Keychain provider with an environment fallback. Resolve reads the bridge
 * first, then the process environment (tests and development mode). set and
 * unset always write the Keychain through the bridge and reject empty values;
 * no secret is ever written to a runtime-owned file.
 */
export class KeychainCredentialProvider extends CredentialProvider {
  private get bridge(): DesktopCredentialBridge {
    return this.ctx.desktopCredentialBridge
  }

  async resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined> {
    const stored = await this.bridge.resolve(ref)
    if (stored !== undefined && stored !== '') return { value: stored, source: 'keychain' }
    const env = process.env[ref]
    if (env !== undefined && env !== '') return { value: env, source: 'env' }
    return undefined
  }

  async describe(ref: CredentialRef): Promise<CredentialInfo> {
    const resolved = await this.resolve(ref)
    return {
      configured: resolved !== undefined,
      ...resolved === undefined ? {} : { source: resolved.source },
      writable: true,
    }
  }

  async set(ref: CredentialRef, value: string): Promise<void> {
    if (value === '') throw new TypeError('credential value must be non-empty; use unset to remove it')
    await this.bridge.store(ref, value)
    this.notifyUpdated(ref)
  }

  async unset(ref: CredentialRef): Promise<void> {
    await this.bridge.delete(ref)
    this.notifyUpdated(ref)
  }
}

export default KeychainCredentialProvider
