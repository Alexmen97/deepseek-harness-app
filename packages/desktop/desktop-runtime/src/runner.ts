/**
 * Shared process lifecycle for the desktop runtime bins: boot the explicitly
 * selected configuration and own process exit. stdin EOF and termination
 * signals dispose the root to quiescence, which fails pending approvals
 * closed ('cancelled') through the gateway's teardown.
 *
 * @module @deepseek-ai/dsh-desktop-runtime/runner
 */

import { existsSync } from 'node:fs'
import { inspect } from 'node:util'
import { boot, installFailLoud, loadEnv, resolveConfigPath } from '@deepseek-ai/dsh-app-boot'

/* v8 ignore start -- composition over tested app-boot/server and executable acceptance paths */
/** Executable identity for fail-loud diagnostics and process naming. */
export const NAME = 'dsh-desktop-runtime'

/**
 * Boot the explicitly selected configuration and own process exit.
 * @param bareModuleBaseUrl - optional installed-runtime base for bare plugins;
 * omit it when the configuration project owns its plugin packages.
 * @returns after process handlers are installed; process lifetime then belongs
 * to stdin and signal events.
 */
export async function runDesktopRuntime(bareModuleBaseUrl?: string): Promise<void> {
  installFailLoud(NAME)
  loadEnv(NAME)

  // Env wins over argv; empty values are absent. The snapshot overlay swaps
  // the sibling cordis.snapshot.yml when DSH_SNAPSHOT=replay, the keyless
  // acceptance path.
  const fromEnv = process.env['DSH_CORDIS_CONFIG']
  const fromArgv = process.argv[2]
  const requested = fromEnv !== undefined && fromEnv !== ''
    ? fromEnv
    : fromArgv !== undefined && fromArgv !== '' ? fromArgv : undefined
  const configPath = requested === undefined
    ? undefined
    : resolveConfigPath(requested, process.env['DSH_SNAPSHOT'])
  if (configPath === undefined || !existsSync(configPath)) {
    process.stderr.write(
      'usage: ' + NAME + ' <path/to/cordis.yml> (or set DSH_CORDIS_CONFIG=<path>, which wins); the config is required — there is no built-in fallback\n',
    )
    process.exit(1)
  }

  let ctx: Awaited<ReturnType<typeof boot>>
  try {
    ctx = await boot(NAME, configPath, undefined, undefined, bareModuleBaseUrl)
  } catch (error) {
    // The loader aggregates per-entry failures; the deepest cause alone
    // hides which plugins failed. Print the full chain once to stderr, then
    // let the boot rejection propagate (fail loud).
    process.stderr.write('desktop runtime boot diagnostics: ' + inspect(error, { depth: 8, maxArrayLength: 100 }) + '\n')
    throw error
  }
  let exiting = false

  async function disposeAndExit(code: number): Promise<void> {
    if (exiting) return
    exiting = true
    try {
      await ctx.fiber.dispose()
    } finally {
      process.exit(code)
    }
  }

  process.stdin.on('end', () => { void disposeAndExit(0) })
  process.on('SIGTERM', () => { void disposeAndExit(0) })
  process.on('SIGINT', () => { void disposeAndExit(130) })
}
/* v8 ignore stop */
