#!/usr/bin/env node
/**
 * Resolve one desktop release version from the canonical release input.
 *
 * The release workflow previously carried a hardcoded preview version
 * (DESKTOP_PREVIEW_VERSION) that required a source commit to bump for every
 * preview. This module is the single resolver: given a tag (vX.Y.Z or
 * vX.Y.Z-preview.N) or an explicit workflow-dispatch input version, it
 * produces the resolved version (no leading v) and the release kind.
 *
 * Tag grammar (repository policy):
 *   vX.Y.Z              -> production, version X.Y.Z
 *   vX.Y.Z-preview.N    -> preview,    version X.Y.Z-preview.N
 * Anything else is rejected (no v prefix, missing sequence, junk).
 *
 * Manual dispatch input grammar (no leading v, N required for previews):
 *   X.Y.Z              -> production
 *   X.Y.Z-preview.N    -> preview
 *
 * Every consumer (Tauri override, DMG/SHA/manifest/SBOM names, release title)
 * reads the version this module emits; there is no second manual string.
 */

const VERSION_GRAMMAR = /^(\d+)\.(\d+)\.(\d+)(?:-preview\.(\d+))?$/

export function classifyVersion(version) {
  const match = VERSION_GRAMMAR.exec(version)
  if (match === null) {
    return { ok: false, reason: `version must match X.Y.Z or X.Y.Z-preview.N, got ${JSON.stringify(version)}` }
  }
  return {
    ok: true,
    version,
    kind: match[4] === undefined ? 'production' : 'preview',
    previewSequence: match[4] === undefined ? undefined : Number(match[4]),
  }
}

export function resolveTag(tag) {
  if (typeof tag !== 'string' || !tag.startsWith('v')) {
    return { ok: false, reason: `release tag must start with 'v', got ${JSON.stringify(tag)}` }
  }
  return classifyVersion(tag.slice(1))
}

export function resolveInputVersion(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, reason: 'manual dispatch requires an explicit version input (e.g. 0.1.0-preview.3)' }
  }
  const parsed = classifyVersion(input.trim())
  if (!parsed.ok) return parsed
  return parsed
}

/** Artifact family for one resolved version: one version, one naming set. */
export function artifactNames(version, prefix = 'DeepSeek-Harness-App') {
  return {
    dmg: `${prefix}-v${version}-macOS-arm64.dmg`,
    sha: `${prefix}-v${version}-macOS-arm64.dmg.sha256`,
    manifest: `${prefix}-v${version}-release-manifest.json`,
    sbom: `${prefix}-v${version}-sbom.cdx.json`,
  }
}

/** CLI surface for the workflow: prints version= and kind= lines. */
if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const args = process.argv.slice(2)
  const tagIndex = args.indexOf('--tag')
  const inputIndex = args.indexOf('--input')
  let result
  if (tagIndex !== -1 && inputIndex === -1 && args[tagIndex + 1] !== undefined) {
    result = resolveTag(args[tagIndex + 1])
  } else if (inputIndex !== -1 && tagIndex === -1 && args[inputIndex + 1] !== undefined) {
    result = resolveInputVersion(args[inputIndex + 1])
  } else {
    console.error('resolve-release-version: use --tag <vX.Y.Z[-preview.N]> or --input <X.Y.Z[-preview.N]>')
    process.exit(2)
  }
  if (!result.ok) {
    console.error('resolve-release-version: ' + result.reason)
    process.exit(1)
  }
  console.log('version=' + result.version)
  console.log('kind=' + result.kind)
}
