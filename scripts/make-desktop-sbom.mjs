#!/usr/bin/env node
/**
 * Generate the CycloneDX 1.5 SBOM for the desktop release.
 *
 * Coverage: every non-dev package in pnpm-lock.yaml (the packaged runtime
 * closure is a production `pnpm deploy` of the workspace), every package in
 * apps/desktop/src-tauri/Cargo.lock, and the native redistributed binaries
 * the bundle embeds (sharp/libvips, node-pty, koffi, the spawn helpers).
 * Cargo.lock cannot separate build-time from runtime crates, so all crates
 * are listed with scope 'required' and the gap is documented in
 * docs/project/SUPPLY-CHAIN.md. The document is deterministic for one
 * repository state: a stable UUIDv5 serial, sorted components, no
 * timestamps. Repository coordinates come from
 * docs/project/project-metadata.json and are omitted while the GitHub owner
 * is unset.
 *
 * Usage: node scripts/make-desktop-sbom.mjs
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import * as yaml from 'js-yaml'
import { parse as parseToml } from 'smol-toml'

const root = resolve(import.meta.dirname, '..')
const read = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'))
const confVersion = read('apps/desktop/src-tauri/tauri.conf.json').version
const version = process.env.DESKTOP_RELEASE_VERSION ?? confVersion
const project = read('docs/project/project-metadata.json')
const upstream = read('docs/project/upstream-base.json')
const buildCommit = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() }
  catch { return 'unknown' }
})()

/** Deterministic UUIDv5 (namespace DNS) so one repository state has one serial. */
function uuidv5(name) {
  const namespace = Buffer.from([0x6b, 0xa7, 0xb8, 0x10, 0x9d, 0xad, 0x11, 0xd1, 0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8])
  const hash = createHash('sha1').update(Buffer.concat([namespace, Buffer.from(name)])).digest()
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.toString('hex')
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20, 32)
}

/** License string from the installed store manifest, when present. */
function buildLicenseIndex() {
  const index = new Map()
  const store = resolve(root, 'node_modules', '.pnpm')
  if (!existsSync(store)) return index
  for (const dir of readdirSync(store)) {
    const manifest = resolve(store, dir, 'node_modules')
    if (!existsSync(manifest)) continue
    for (const pkg of readdirSync(manifest)) {
      const pkgJson = resolve(manifest, pkg, 'package.json')
      if (!existsSync(pkgJson)) continue
      try {
        const meta = JSON.parse(readFileSync(pkgJson, 'utf8'))
        const id = (meta.name ?? pkg) + '@' + (meta.version ?? '0.0.0')
        if (typeof meta.license === 'string' || (meta.license && typeof meta.license.type === 'string')) {
          index.set(id, typeof meta.license === 'string' ? meta.license : meta.license.type)
        }
      } catch { /* unreadable manifests are simply skipped */ }
    }
  }
  return index
}

/** npm components from pnpm-lock.yaml, dev-only entries excluded. */
function npmComponents(licenses) {
  const lock = yaml.load(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'))
  const components = []
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    if (entry && entry.dev === true) continue
    const match = /^(.+)@([^@(]+)/.exec(key)
    if (match === null) continue
    const name = match[1]
    const version = match[2]
    const component = { type: 'library', 'bom-ref': 'pkg:npm/' + encodeURIComponent(name) + '@' + version, name, version }
    const purl = 'pkg:npm/' + encodeURIComponent(name) + '@' + version
    component.purl = purl
    const license = licenses.get(name + '@' + version)
    if (license !== undefined) component.licenses = [{ license: { id: license.split(' OR ')[0].trim() } }]
    components.push(component)
  }
  components.sort((a, b) => a['bom-ref'].localeCompare(b['bom-ref']))
  return components
}

/** Cargo components from the committed desktop Cargo.lock. */
function cargoComponents() {
  const lock = parseToml(readFileSync(resolve(root, 'apps/desktop/src-tauri/Cargo.lock'), 'utf8'))
  const components = []
  for (const pkg of lock.package ?? []) {
    const name = pkg.name
    const version = pkg.version
    const component = {
      type: 'library',
      'bom-ref': 'pkg:cargo/' + name + '@' + version,
      name, version,
      purl: 'pkg:cargo/' + name + '@' + version,
      scope: 'required',
    }
    components.push(component)
  }
  components.sort((a, b) => a['bom-ref'].localeCompare(b['bom-ref']))
  return components
}

/** Native redistributed binaries the bundle embeds, component level. */
const NATIVE_COMPONENTS = [
  { name: 'libvips (sharp prebuild)', version: 'bundled', purl: 'pkg:generic/libvips?bundled=sharp', licenses: [{ license: { id: 'LGPL-2.1-or-later' } }], scope: 'required' },
  { name: 'node-pty', version: 'bundled', purl: 'pkg:npm/node-pty@bundled', licenses: [{ license: { id: 'MIT' } }], scope: 'required' },
  { name: 'koffi', version: 'bundled', purl: 'pkg:npm/koffi@bundled', licenses: [{ license: { id: 'MIT' } }], scope: 'required' },
]

const licenses = buildLicenseIndex()
const npm = npmComponents(licenses)
const cargo = cargoComponents()
const components = [...npm, ...cargo, ...NATIVE_COMPONENTS]

const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: 'urn:uuid:' + uuidv5('DeepSeek Harness App v' + version + ' ' + buildCommit),
  version: 1,
  metadata: {
    timestamp: '1970-01-01T00:00:00Z',
    component: {
      type: 'application',
      'bom-ref': 'pkg:generic/deepseek-harness-app@' + version,
      name: project.name,
      version,
    },
  },
  components,
}

if (project.githubOwner !== null) {
  bom.metadata.component.externalReferences = [{
    type: 'website', url: 'https://github.com/' + project.githubOwner + '/' + project.githubRepository,
  }]
}
bom.metadata.component.externalReferences = [
  ...(bom.metadata.component.externalReferences ?? []),
  { type: 'vcs', url: upstream.repository + '/tree/' + upstream.commit },
]

const out = resolve(root, 'dist-exe', 'DeepSeek-Harness-App-v' + version + '-sbom.cdx.json')
writeFileSync(out, JSON.stringify(bom, null, 2) + '\n')
console.log('make-desktop-sbom: ' + out)
console.log('make-desktop-sbom: ' + components.length + ' components (' + npm.length + ' npm, ' + cargo.length + ' cargo, ' + NATIVE_COMPONENTS.length + ' native)')
