/**
 * Prepare the desktop sidecar for a Tauri bundle: copy the packaged runtime
 * executable and the runtime configuration into src-tauri/resources/. Fails
 * with an actionable message when the M1A executable has not been built.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const sidecarSource = resolve(repo, 'dist-exe', 'dsh-desktop-runtime-macos-arm64')
const sidecarTarget = resolve(repo, 'apps/desktop/src-tauri/resources/sidecar/dsh-desktop-runtime')
const configSource = resolve(repo, 'packages/desktop/desktop-runtime/runtime/cordis.yml')
const configTarget = resolve(repo, 'apps/desktop/src-tauri/resources/runtime/cordis.yml')

if (!existsSync(sidecarSource)) {
  console.error('ensure-desktop-sidecar: missing dist-exe/dsh-desktop-runtime-macos-arm64')
  console.error('Build it first: pnpm exec tsx scripts/build-exe-for-desktop.ts --skip-build')
  process.exit(1)
}
mkdirSync(dirname(sidecarTarget), { recursive: true })
mkdirSync(dirname(configTarget), { recursive: true })
copyFileSync(sidecarSource, sidecarTarget)
copyFileSync(configSource, configTarget)
console.log('ensure-desktop-sidecar: sidecar and runtime config staged into src-tauri/resources/')
