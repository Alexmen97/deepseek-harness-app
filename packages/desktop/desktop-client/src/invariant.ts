/**
 * Package-owned invariant companion for @deepseek-ai/dsh-desktop-client.
 * @module @deepseek-ai/dsh-desktop-client/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-desktop-client'

/** Cordis companion plugin name. */
export const name = 'desktop-client-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a client transport face with no event stream or
 * mutable data relation of its own; the carrier and runtime-layer tests own
 * its behavior.
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
