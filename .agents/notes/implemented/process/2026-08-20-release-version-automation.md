# Agent Note: Release version automation (M5C.6)
Status: implemented

English | [中文](2026-08-20-release-version-automation.zh.md)

## Problem

Every preview release required a source commit to bump the hardcoded DESKTOP_PREVIEW_VERSION constant in .github/workflows/desktop-release.yml; publishing v0.1.0-preview.2 produced the workflow-only commit 74159ab4. The constant was a second, independent version source that could drift from the tag and forced a release-engineering commit for every preview.

## Decision

scripts/resolve-release-version.mjs is the single canonical resolver. It parses the tag (vX.Y.Z-preview.N to preview, vX.Y.Z to production) or an explicit manual-dispatch release_version input with the same grammar, and rejects malformed values (no v prefix, missing sequence, junk).

- The workflow removed DESKTOP_PREVIEW_VERSION; the decide step derives version and kind through the resolver for both tag pushes and manual dispatch.
- Manual dispatch now requires release_version; release_kind must match the version grammar (preview kind requires a preview version, production kind a production version).
- One resolved version drives the Tauri build override, DMG filename, .sha256, release manifest, SBOM, and release title; no independent manual version strings remain.
- check-release-consistency validates the manifest against the resolved tag/kind when DESKTOP_RELEASE_TAG is set and hardens production: a production manifest must declare developer-id signing and notarized=true.
- Publish jobs refuse to republish an existing tag or release (Refuse duplicate tag step), so a published preview cannot be silently overwritten.

## Verification

scripts/resolve-release-version.spec.ts covers tag parsing, malformed tags, manual dispatch versions, and artifact naming; scripts/desktop-release-workflow.spec.ts pins the workflow structure (no preview constant, required release_version input, resolver use, Tauri override propagation, duplicate-tag guards). A synthetic dry-run with 0.1.0-preview.99 produced app, DMG, SHA, manifest, and SBOM all agreeing on that version and passed check-release-consistency without creating a Release.

## Alternatives considered

**Keep the hardcoded constant and bump it per release.** Rejected: it forces a release-engineering commit and allows the constant to drift from the tag.

**Infer preview/production with the previous substring match.** Rejected: the resolver uses the full grammar and rejects malformed input instead of guessing.

## Consequences

- A preview tag or explicit dispatch version is now the only release-version input; no workflow constant needs editing.
- Malformed versions fail before the build starts.
- A published version cannot be overwritten without an explicit delete.

<!-- agent-note-format: alternatives-recorded -->
