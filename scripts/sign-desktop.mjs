/**
 * Release signing pipeline for Harness Desktop.app.
 *
 * The bundled runtime keeps its build-time signature (pkg signs the SEA
 * ad-hoc) and is only VERIFIED here: re-signing a pkg executable corrupts
 * the embedded snapshot. The application is signed with Hardened Runtime.
 * Without Developer ID credentials the pipeline signs ad-hoc for local
 * development and reports NOTARIZATION SKIPPED — it never reports a fake
 * success.
 *
 * Usage:
 *   node scripts/sign-desktop.mjs [--mode adhoc-hardened|developer-id] [--app path]
 * Credentials come from the environment only:
 *   APPLE_SIGNING_IDENTITY            Developer ID Application: ...
 *   APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD   (notarytool password auth)
 *   APPLE_API_KEY / APPLE_API_ISSUER / APPLE_API_KEY_PATH (App Store Connect API)
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback
}
const mode = readArg('--mode', 'adhoc-hardened')
const appPath = readArg('--app', resolve(repo, 'apps/desktop/src-tauri/target/release/bundle/macos/Harness Desktop.app'))
const entitlements = resolve(repo, 'apps/desktop/src-tauri/entitlements/desktop.plist')

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
  if (result.status !== 0) {
    throw new Error(command + ' failed: ' + (result.stderr || result.stdout || 'exit ' + result.status))
  }
  return result.stdout
}

if (!existsSync(appPath)) {
  console.error('sign-desktop: bundle missing: ' + appPath)
  process.exit(1)
}

const sidecar = resolve(appPath, 'Contents/Resources/sidecar/dsh-desktop-runtime')

if (mode === 'developer-id') {
  const identity = process.env.APPLE_SIGNING_IDENTITY
  if (identity === undefined || identity === '') {
    console.error('sign-desktop: --mode developer-id requires APPLE_SIGNING_IDENTITY')
    process.exit(1)
  }
  // The bundled runtime keeps its build-time signature; verify it only.
  run('codesign', ['--verify', '--strict', '--verbose=2', sidecar])
  run('codesign', ['--force', '--options', 'runtime', '--timestamp', '--entitlements', entitlements, '--sign', identity, appPath])
  run('codesign', ['--verify', '--strict', '--verbose=2', appPath])

  const notaryArgs = ['submit', '--wait']
  const apiKey = process.env.APPLE_API_KEY
  if (apiKey !== undefined && apiKey !== '') {
    notaryArgs.push('--key', process.env.APPLE_API_KEY_PATH ?? '', '--key-id', apiKey, '--issuer', process.env.APPLE_API_ISSUER ?? '')
  } else if (process.env.APPLE_ID !== undefined && process.env.APPLE_APP_SPECIFIC_PASSWORD !== undefined) {
    notaryArgs.push('--apple-id', process.env.APPLE_ID, '--password', process.env.APPLE_APP_SPECIFIC_PASSWORD, '--team-id', process.env.APPLE_TEAM_ID ?? '')
  } else {
    console.log('sign-desktop: signed with Developer ID; NOTARIZATION SKIPPED (no App Store Connect credentials)')
    console.log('sign-desktop: run spctl/stapling separately once credentials are available')
    process.exit(0)
  }
  run('ditto', ['-c', '-k', '--keepParent', appPath, appPath + '.zip'])
  try {
    run('xcrun', ['notarytool', ...notaryArgs, appPath + '.zip'])
  } finally {
    spawnSync('rm', ['-f', appPath + '.zip'])
  }
  run('xcrun', ['stapler', 'staple', appPath])
  const assessment = run('spctl', ['--assess', '--type', 'execute', '--verbose=2', appPath])
  console.log('sign-desktop: notarized, stapled, Gatekeeper accepts:\n' + assessment)
  process.exit(0)
}

// adhoc-hardened: local development artifact; the sidecar stays untouched.
run('codesign', ['--verify', '--strict', '--verbose=2', sidecar])
run('codesign', ['--force', '--options', 'runtime', '--timestamp=none', '--entitlements', entitlements, '--sign', '-', appPath])
run('codesign', ['--verify', '--strict', '--verbose=2', appPath])
console.log('sign-desktop: ad-hoc hardened runtime signing complete (development artifact)')
console.log('sign-desktop: NOTARIZATION SKIPPED (ad-hoc identities cannot be notarized)')
