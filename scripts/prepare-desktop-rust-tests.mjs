#!/usr/bin/env node
/**
 * Deterministic resource staging for desktop Rust tests.
 *
 * cargo test compiles generate_context! and tauri-build validates declared
 * bundle resources even in dev profile. Both need real files on disk:
 *   - apps/desktop/src-tauri/icons/icon.png  (generated, gitignored)
 *   - apps/desktop/src-tauri/icons/icon.icns (committed)
 *   - resources/sidecar/dsh-desktop-runtime (placeholder for tests)
 *   - resources/sidecar/dsh-desktop-runtime-spawn-helper (placeholder for tests)
 *   - resources/runtime/cordis.yml           (tracked runtime config copy)
 * The tauri build's beforeBuildCommand stages the real SEA; the dev-profile
 * unit tests only need tauri-build's existence checks, so the placeholder
 * is documented here, in .gitignore, and in the CI workflow step.
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const tauri = resolve(repo, 'apps/desktop/src-tauri')

const iconScript = resolve(repo, 'scripts/desktop-icon.mjs')
if (!existsSync(resolve(tauri, 'icons/icon.png'))) {
  execFileSync(process.execPath, [iconScript], { stdio: 'inherit' })
}
if (!existsSync(resolve(tauri, 'icons/icon.icns'))) {
  execFileSync(process.execPath, [iconScript], { stdio: 'inherit' })
}

mkdirSync(resolve(tauri, 'resources/sidecar'), { recursive: true })
mkdirSync(resolve(tauri, 'resources/runtime'), { recursive: true })
for (const name of ['dsh-desktop-runtime', 'dsh-desktop-runtime-spawn-helper']) {
  const sidecar = resolve(tauri, 'resources/sidecar/' + name)
  if (!existsSync(sidecar)) {
    writeFileSync(sidecar, '')
  }
}
copyFileSync(
  resolve(repo, 'packages/desktop/desktop-runtime/runtime/cordis.yml'),
  resolve(tauri, 'resources/runtime/cordis.yml'),
)

console.log('prepare-desktop-rust-tests: icon.icns + icon.png, sidecar placeholder, and runtime cordis.yml are staged for cargo test')
