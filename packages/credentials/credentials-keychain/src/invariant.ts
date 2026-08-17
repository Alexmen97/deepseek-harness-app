/**
 * Package-owned invariant companion for @deepseek-ai/dsh-credentials-keychain.
 * @module @deepseek-ai/dsh-credentials-keychain/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-credentials-keychain'

/** Cordis companion plugin name. */
export const name = 'credentials-keychain-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a transport-backed provider with no event stream or
 * mutable data relation of its own; the credential seam owns its behavior.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
