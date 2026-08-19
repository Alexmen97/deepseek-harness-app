#!/usr/bin/env node
/**
 * Verify the DMG contents contract: only the app bundle, the Applications
 * alias, LICENSE, and THIRD_PARTY_NOTICES may ship. No source tree, test
 * fixtures, logs, credentials, signing temp files, or developer paths.
 * Usage: node scripts/verify-desktop-dmg.mjs [path-to.dmg]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const conf = JSON.parse(readFileSync(resolve(repo, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'))
const version = process.env.DESKTOP_RELEASE_VERSION ?? conf.version
const dmg = process.argv[2] ?? resolve(repo, 'dist-exe', 'DeepSeek-Harness-App-v' + version + '-macOS-arm64.dmg')

if (!existsSync(dmg)) {
  console.error('verify-desktop-dmg: missing ' + dmg)
  process.exit(1)
}

const mountPoint = mkdtempSync(join(tmpdir(), 'dsh-dmg-check-'))
try {
  execFileSync('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mountPoint, dmg], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const entries = readdirSync(mountPoint, { withFileTypes: true }).map(e => e.name).sort()
  const expected = ['Applications', 'Harness Desktop.app', 'LICENSE.txt', 'THIRD_PARTY_NOTICES.md']
  const missing = expected.filter(name => !entries.includes(name))
  const extra = entries.filter(name => !expected.includes(name))
  const failures = []
  if (missing.length > 0) failures.push('missing entries: ' + missing.join(', '))
  if (extra.length > 0) failures.push('unexpected entries: ' + extra.join(', '))
  if (failures.length > 0) {
    console.error('verify-desktop-dmg: FAILED\n' + failures.join('\n'))
    process.exit(1)
  }
  console.log('verify-desktop-dmg: OK - contents are ' + entries.join(', '))
} finally {
  try { execFileSync('hdiutil', ['detach', mountPoint], { stdio: 'ignore' }) } catch { /* already detached */ }
  rmSync(mountPoint, { recursive: true, force: true })
}
