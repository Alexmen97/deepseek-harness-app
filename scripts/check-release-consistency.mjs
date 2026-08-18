#!/usr/bin/env node
/**
 * Release artifact consistency gate: every public filename, checksum, and
 * metadata field in dist-exe/ must agree with the application version, the
 * pinned upstream base, and the repository HEAD. A mismatch fails the
 * release (scripts/check-release-consistency.mjs in the release workflow).
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'))
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }

const conf = read('apps/desktop/src-tauri/tauri.conf.json')
const upstream = read('docs/project/upstream-base.json')
const project = read('docs/project/project-metadata.json')
const version = conf.version
const expectedDmg = project.artifactPrefix + '-v' + version + '-macOS-arm64.dmg'
const expectedSbom = project.artifactPrefix + '-v' + version + '-sbom.cdx.json'
const dist = resolve(root, 'dist-exe')

check(existsSync(resolve(dist, expectedDmg)), 'DMG missing: ' + expectedDmg)
const dmgPath = resolve(dist, expectedDmg)
const hash = existsSync(dmgPath) ? createHash('sha256').update(readFileSync(dmgPath)).digest('hex') : ''

const shaFile = expectedDmg + '.sha256'
check(existsSync(resolve(dist, shaFile)), 'checksum file missing: ' + shaFile)
if (existsSync(resolve(dist, shaFile))) {
  const shaText = readFileSync(resolve(dist, shaFile), 'utf8').trim()
  const fields = shaText.split(/\s+/).filter(Boolean)
  check(fields.length === 2 && fields[0] === hash, 'checksum file does not carry the DMG SHA-256')
  check(fields[1] === expectedDmg, 'checksum file references a different public filename: ' + fields[1])
}

const manifestName = project.artifactPrefix + '-v' + version + '-release-manifest.json'
check(existsSync(resolve(dist, manifestName)), 'release manifest missing: ' + manifestName)
if (existsSync(resolve(dist, manifestName))) {
  const manifest = read('dist-exe/' + manifestName)
  check(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1')
  check(manifest.version === version, 'manifest version drift')
  check(manifest.desktopProtocol === 1, 'manifest protocol drift')
  check(manifest.harnessVersion === upstream.version, 'manifest harness version drift')
  check(manifest.harnessCommit === upstream.commit, 'manifest harness commit drift')
  check(manifest.platform === 'macos' && manifest.arch === 'arm64', 'manifest platform/arch drift')
  check(manifest.dmgFilename === expectedDmg, 'manifest DMG filename drift')
  check(manifest.sha256 === hash, 'manifest checksum drift')
  check(manifest.sbomFilename === expectedSbom, 'manifest SBOM filename drift')
  const head = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() } catch { return 'unknown' } })()
  check(manifest.buildCommit === head, 'manifest build commit drift: ' + manifest.buildCommit + ' vs ' + head)
  check(typeof manifest.buildTimestamp === 'string' && manifest.buildTimestamp.length > 0, 'manifest build timestamp missing')
}

check(existsSync(resolve(dist, expectedSbom)), 'SBOM missing: ' + expectedSbom)
if (existsSync(resolve(dist, expectedSbom))) {
  const sbom = read('dist-exe/' + expectedSbom)
  check(sbom.bomFormat === 'CycloneDX' && sbom.specVersion === '1.5', 'SBOM format/spec drift')
  check(sbom.metadata.component.version === version, 'SBOM version drift')
  check(sbom.metadata.component.name === project.name, 'SBOM product name drift')
  check(Array.isArray(sbom.components) && sbom.components.length > 0, 'SBOM has no components')
}

if (failures.length > 0) {
  console.error('check-release-consistency failed:')
  for (const failure of failures) console.error('  ' + failure)
  process.exit(1)
}
console.log('check-release-consistency: artifacts agree (v' + version + ', protocol 1, harness ' + upstream.version + ' @ ' + upstream.commit.slice(0, 12) + ')')
