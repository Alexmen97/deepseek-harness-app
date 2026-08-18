# Supply chain

Release engineering for the direct GitHub Releases distribution model.

## Build inputs

- The npm workspace with the frozen pnpm-lock.yaml.
- The Rust crate tree with the committed apps/desktop/src-tauri/Cargo.lock.
- The packaged runtime executable built by scripts/build-exe-for-desktop.ts from the staged workspace closure.
- Apple signing credentials from the release environment only (never the repository).

## Release outputs

Every public release produces: the notarized DMG (DeepSeek-Harness-App-v<version>-macOS-arm64.dmg), its SHA-256 checksum, a machine-readable release manifest (version, desktop protocol, harness version and commit, platform, architecture, DMG and SBOM filenames, checksum, build commit and timestamp), and a CycloneDX SBOM. The release workflow refuses to publish a stable release without Developer ID signing and notarization, generates the SBOM in every build including dry runs, and its publish gate fails closed when the SBOM asset is missing.

## Provenance

The release workflow attests the DMG, checksum, manifest, and SBOM with GitHub artifact attestations before creating the draft release. Reproducible builds are not claimed: the SEA packaging and Apple tooling are not byte-reproducible end to end, and the documentation states that plainly.

## SBOM coverage

`pnpm run desktop:sbom` writes `DeepSeek-Harness-App-v<version>-sbom.cdx.json` to `dist-exe/`: a CycloneDX 1.5 document with a deterministic UUIDv5 serial and sorted components. It lists every non-dev package in pnpm-lock.yaml (the packaged runtime closure is a production `pnpm deploy`), every package in the desktop Cargo.lock, and the redistributed native binaries (sharp/libvips under LGPL, node-pty and koffi under MIT) at component level. Licenses come from the installed store manifests when present. Cargo.lock cannot separate build-time from runtime crates, so all crates carry scope `required`; the crate-level approximation and the per-file SEA closure remain documented gaps, not reasons to skip the gate. Repository coordinates come from docs/project/project-metadata.json and the GitHub URL is omitted while the owner is unknown.
