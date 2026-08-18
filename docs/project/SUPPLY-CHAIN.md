# Supply chain

Release engineering for the direct GitHub Releases distribution model.

## Build inputs

- The npm workspace with the frozen pnpm-lock.yaml.
- The Rust crate tree with the committed apps/desktop/src-tauri/Cargo.lock.
- The packaged runtime executable built by scripts/build-exe-for-desktop.ts from the staged workspace closure.
- Apple signing credentials from the release environment only (never the repository).

## Release outputs

Every public release produces: the notarized DMG (DeepSeek-Harness-App-v<version>-macOS-arm64.dmg), its SHA-256 checksum, a machine-readable release manifest (version, desktop protocol, harness version and commit, platform, architecture, checksum), and a CycloneDX SBOM. The release workflow refuses to publish a stable release without Developer ID signing and notarization, and its publish gate fails closed when the SBOM asset is missing.

## Provenance

The release workflow attests the DMG, checksum, and manifest with GitHub artifact attestations before creating the draft release. Reproducible builds are not claimed: the SEA packaging and Apple tooling are not byte-reproducible end to end, and the documentation states that plainly.

## SBOM coverage

The SBOM generator is not implemented in M3; the release publish gate fails without a *-sbom.cdx.json asset, so the first public release must add generation before publication. The planned generator uses CycloneDX tooling over the npm workspace and the Rust crate tree. The native libvips binaries inside the sharp prebuild are represented at the component level with their license fields; a fully resolved per-file SBOM for the SEA snapshot is out of scope.
