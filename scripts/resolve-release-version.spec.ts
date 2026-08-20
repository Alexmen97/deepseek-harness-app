import { describe, expect, it } from 'vitest'
import { artifactNames, classifyVersion, resolveInputVersion, resolveTag } from './resolve-release-version.mjs'
describe('release version resolution', () => {
  it('accepts a preview tag with its sequence number', () => {
    expect(resolveTag('v0.1.0-preview.3')).toMatchObject({ ok: true, version: '0.1.0-preview.3', kind: 'preview', previewSequence: 3 })
  })

  it('accepts a multi-digit preview sequence without fragile substring rules', () => {
    expect(resolveTag('v0.1.0-preview.10')).toMatchObject({ ok: true, version: '0.1.0-preview.10', kind: 'preview', previewSequence: 10 })
  })

  it('accepts a production tag', () => {
    expect(resolveTag('v0.1.0')).toMatchObject({ ok: true, version: '0.1.0', kind: 'production', previewSequence: undefined })
  })

  it('rejects a tag without the v prefix', () => {
    expect(resolveTag('0.1.0-preview.3').ok).toBe(false)
  })

  it('rejects malformed tags', () => {
    expect(resolveTag('vfoo').ok).toBe(false)
    expect(resolveTag('v0.1').ok).toBe(false)
    expect(resolveTag('v0.1.0-preview').ok).toBe(false)
    expect(resolveTag('v0.1.0-preview.x').ok).toBe(false)
  })

  it('requires an explicit version for manual dispatch', () => {
    expect(resolveInputVersion('').ok).toBe(false)
    expect(resolveInputVersion(undefined as unknown as string).ok).toBe(false)
    expect(resolveInputVersion('0.1.0-preview.99')).toMatchObject({ ok: true, version: '0.1.0-preview.99', kind: 'preview' })
    expect(resolveInputVersion('0.2.0')).toMatchObject({ ok: true, version: '0.2.0', kind: 'production' })
  })

  it('derives one artifact family from one resolved version', () => {
    const names = artifactNames('0.1.0-preview.99')
    expect(names.dmg).toBe('DeepSeek-Harness-App-v0.1.0-preview.99-macOS-arm64.dmg')
    expect(names.sha).toBe('DeepSeek-Harness-App-v0.1.0-preview.99-macOS-arm64.dmg.sha256')
    expect(names.manifest).toBe('DeepSeek-Harness-App-v0.1.0-preview.99-release-manifest.json')
    expect(names.sbom).toBe('DeepSeek-Harness-App-v0.1.0-preview.99-sbom.cdx.json')
  })

  it('classifies a production version without a preview sequence', () => {
    expect(classifyVersion('1.2.3')).toMatchObject({ ok: true, version: '1.2.3', kind: 'production' })
  })
})
