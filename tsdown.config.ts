import { defineConfig } from 'tsdown'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { typertPlugin } from './packages/typert/generator/lib/types/tsdown-plugin.js'

function isBuildFaceClient(value: unknown): boolean {
  if (value === undefined || value === 'host') return false
  if (value === 'client') return true
  throw new Error(`tsdown: --env.DSH_BUILD_FACE must be host or client, received ${String(value)}`)
}

/** Host workspace: the packages whose lib/types the Host tsc pass emitted. */
function hostWorkspace(): string[] {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const packagesDir = join(root, 'packages')
  const globs = ['vendor/*']
  for (const group of readdirSync(packagesDir)) {
    const groupDir = join(packagesDir, group)
    if (!statSync(groupDir).isDirectory()) continue
    for (const pkg of readdirSync(groupDir)) {
      const pkgDir = join(groupDir, pkg)
      if (statSync(pkgDir).isDirectory() && existsSync(join(pkgDir, 'lib', 'types'))) {
        globs.push('packages/' + group + '/' + pkg)
      }
    }
  }
  globs.push('apps/cli')
  return globs
}

/**
 * The ordinary workspace build consumes JavaScript emitted by the Host
 * TypeScript project and runs Typert. On a clean tree the Host pass must
 * include only the packages the Host tsc emitted: client-only packages have
 * no lib/types at this point, and their absence used to fail the entry
 * resolution. The Client pass selects packages that declare a browser
 * bundle and lets their package-local configs emit both their Node loader
 * entry and browser artifact.
 */
export default defineConfig(({ env }) => {
  const client = isBuildFaceClient(env?.DSH_BUILD_FACE)
  return {
    workspace: client ? ['vendor/*', 'packages/*/*', 'apps/cli'] : hostWorkspace(),
    entry: client ? '' : ['lib/types/{index,invariant,startup}.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    plugins: client ? [] : [typertPlugin({ mode: 'workspace', faces: ['host'] })],
  }
})
