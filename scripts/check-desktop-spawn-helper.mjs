/**
 * Release gate: the packaged app bundle must carry the node-pty spawn helper
 * next to the runtime executable. Without it the integrated terminal cannot
 * spawn in the shipped app (M5B.1 packaging finding). Fails loudly on
 * missing helper or runtime; never relies on local dev node_modules.
 *
 * Usage: node scripts/check-desktop-spawn-helper.mjs <path-to-app.app>
 */

import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repo = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const appPath = args[0]

if (!appPath) {
  console.error('check-desktop-spawn-helper: expected the path to the built .app bundle')
  process.exit(2)
}

const failures = []

// Source of truth at build time: the dist-exe artifacts the sidecar stages from.
for (const name of ['dsh-desktop-runtime-macos-arm64', 'dsh-desktop-runtime-macos-arm64-spawn-helper']) {
  const path = join(repo, 'dist-exe', name)
  if (!existsSync(path)) failures.push('dist-exe missing ' + name)
}

const sidecarDir = join(appPath, 'Contents', 'Resources', 'sidecar')
for (const name of ['dsh-desktop-runtime', 'dsh-desktop-runtime-spawn-helper']) {
  const path = join(sidecarDir, name)
  if (!existsSync(path)) {
    failures.push('bundle missing Resources/sidecar/' + name)
    continue
  }
  const mode = statSync(path).mode
  if ((mode & 0o111) === 0) failures.push('bundle Resources/sidecar/' + name + ' is not executable')
}

if (failures.length > 0) {
  for (const failure of failures) console.error('check-desktop-spawn-helper: ' + failure)
  process.exit(1)
}

console.log('check-desktop-spawn-helper: runtime and spawn helper present and executable in ' + appPath)