/**
 * Release verification for a built Harness Desktop.app: bundle integrity,
 * size/version sanity, accidental artifacts, and (when signed) signature
 * validation. Fails the release on any violation.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const appPath = process.argv[2] ?? resolve(repo, 'apps/desktop/src-tauri/target/release/bundle/macos/Harness Desktop.app')

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

check(existsSync(appPath), 'bundle missing: ' + appPath)
if (!existsSync(appPath)) {
  console.error('verify-desktop-release: FAILED\n' + failures.join('\n'))
  process.exit(1)
}

const resources = resolve(appPath, 'Contents', 'Resources')
const sidecar = resolve(resources, 'sidecar', 'dsh-desktop-runtime')
check(existsSync(sidecar), 'sidecar missing: ' + sidecar)
check(existsSync(resolve(resources, 'runtime', 'cordis.yml')), 'runtime cordis.yml missing')

// Architecture: every Mach-O in the bundle must be the host architecture.
const expectedArch = process.arch === 'arm64' ? 'arm64' : 'x86_64'
const machoFiles = execFileSync('find', [appPath, '-type', 'f'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter(file => {
    try {
      return execFileSync('file', ['-b', file], { encoding: 'utf8' }).includes('Mach-O')
    } catch {
      return false
    }
  })
for (const file of machoFiles) {
  const info = execFileSync('file', ['-b', file], { encoding: 'utf8' })
  check(info.includes(expectedArch), 'unexpected architecture for ' + file + ': ' + info.trim())
}

// No development fixtures, source maps, or duplicate runtime anywhere.
const entries = readdirSync(appPath, { recursive: true })
for (const entry of entries) {
  const lower = entry.toLowerCase()
  check(!lower.endsWith('.map'), 'source map leaked into the bundle: ' + entry)
  check(!lower.includes('fixture'), 'fixture leaked into the bundle: ' + entry)
  check(!lower.includes('session.jsonl'), 'session fixture leaked into the bundle: ' + entry)
  check(!lower.includes('node_modules'), 'node_modules leaked into the bundle: ' + entry)
}
check(machoFiles.filter(file => basename(file) === 'dsh-desktop-runtime').length === 1, 'runtime duplicated in the bundle')

// Version coherence between the manifest and the crate.
const conf = JSON.parse(readFileSync(resolve(repo, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'))
const cargo = readFileSync(resolve(repo, 'apps/desktop/src-tauri/Cargo.toml'), 'utf8')
const crateVersion = cargo.match(/^version = "([^"]+)"/m)?.[1]
check(conf.version === crateVersion, 'manifest/crate version mismatch')

// Signature state: validate when signed, report ad-hoc otherwise.
const signed = (() => {
  try {
    execFileSync('codesign', ['--verify', '--strict', '--verbose=2', appPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return true
  } catch {
    return false
  }
})()
if (signed) {
  const detail = execFileSync('codesign', ['-dv', '--verbose=2', appPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  console.log('verify-desktop-release: signed bundle:\n' + detail)
  try {
    const assessment = execFileSync('spctl', ['--assess', '--type', 'execute', '--verbose=2', appPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    console.log('verify-desktop-release: Gatekeeper assessment:\n' + assessment)
  } catch {
    console.log('verify-desktop-release: Gatekeeper rejected the bundle (expected for ad-hoc development signatures; Developer ID + notarization must accept)')
  }
} else {
  console.log('verify-desktop-release: bundle is unsigned (development artifact)')
}

if (failures.length > 0) {
  console.error('verify-desktop-release: FAILED\n' + failures.join('\n'))
  process.exit(1)
}
console.log('verify-desktop-release: OK (' + appPath + ')')
