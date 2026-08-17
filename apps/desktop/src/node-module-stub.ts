/**
 * Desktop mirror of apps/web/src/node-module-stub.ts: the vendored Cordis
 * loader probes node:module; the desktop build replaces it with a stub.
 */

/** Throwing stand-in for node:module's createRequire (never reached in the desktop boot). */
export const createRequire = (): never => {
  throw new Error('node:module is not available in the desktop webview')
}

/** Erased type peer for the vendored loader's type-only LoadHookContext import. */
export type LoadHookContext = never
