# Agent Note: Public preview releases without Apple credentials

Status: implemented

English | [中文](2026-08-19-public-preview-releases.zh.md)

## Problem

The desktop distribution pipeline required Developer ID signing and notarization for every publication, but the maintainer has no active Apple Developer Program account. GitHub Actions therefore could never produce a downloadable macOS artifact: production builds fail closed by design, and there was no explicit preview path. The CI icon failure also showed a second gap: cargo test compiled generate_context! before the generated icon existed, so Rust tests depended on incidental locally-generated files.

## Decision

The release workflow supports two explicit release classes, never inferred from push events alone. A plain push to main publishes nothing.

- **production** keeps the existing fail-closed contract: Developer ID signed, notarized, stapled, published as a DRAFT prerelease from a v* tag. Missing signing or notarization credentials fail the build before publication.
- **preview** is ad-hoc signed and NOT notarized, published only when explicitly requested: a manual dispatch with release_kind=preview and dry_run=false, or an explicit v*-preview.* tag. The Release is a GitHub Pre-release titled Public Preview — Unsigned / Not Notarized, and its body states macOS Apple Silicon only, no Node required, Gatekeeper warning expected, and Open Anyway instructions. It never claims Apple validation.

Preview artifacts use version v0.1.0-preview.1 (bumped per preview) so a preview never overwrites the future production v0.1.0. The release manifest always declares machine-readable releaseKind, signing, and notarized fields; a preview manifest must declare signing=adhoc and notarized=false, enforced by the consistency gate.

Rust-test resources are staged deterministically by scripts/prepare-desktop-rust-tests.mjs and guarded by scripts/check-desktop-rust-resources.mjs, which derives the required paths from tauri.conf.json and fails with an actionable list before cargo test compiles. The generated icon is byte-deterministic and identical to the committed icon.icns.

## Verification

The release-workflow vitest spec asserts preview defaults, preview publication conditions, the fail-closed production gate, and the preview manifest version gate. The desktop CI spec asserts staging before cargo test and that the checks/preview jobs never publish.

## Alternatives considered

**Publish unsigned stable releases when credentials are missing.** Rejected: it would make users infer security status from filenames and break the fail-closed production contract.

**Make previews the default for every dispatch.** Rejected: preview publication must stay an explicit, reviewed action.

**Skip icon generation and disable Tauri icon validation.** Rejected: it hides real packaging problems and makes the build depend on incidental state.

## Consequences

- Users can download a functional, clearly-labeled preview DMG now; production notarized releases remain a future path behind the same gates.
- Preview and production artifacts never collide: version, manifest fields, release kind, and Release type all differ.
- Rust tests no longer depend on locally-generated files; a clean checkout fails fast with the missing-resource list.

<!-- agent-note-format: alternatives-recorded -->
