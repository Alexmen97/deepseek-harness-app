# Desktop distribution

Reference for the signing, notarization, and DMG pipeline. Secrets never enter the repository: credentials arrive through the environment only.

## Signing model

scripts/sign-desktop.mjs verifies the bundled runtime signature and signs the application with Hardened Runtime. No codesign --deep and no sidecar re-signing. The only entitlement is allow-jit (docs/desktop/ENTITLEMENTS.md). The nested-code set is pinned by scripts/verify-desktop-release.mjs (docs/desktop/NESTED-CODE.md).

## Local development signing

```sh
node scripts/sign-desktop.mjs --mode adhoc-hardened
```

Produces an ad-hoc hardened-runtime bundle for the build machine. Ad-hoc identities cannot be notarized and Gatekeeper rejects them on other Macs; this mode exists to exercise the hardened-runtime workflow locally.

## Developer ID + notarization

```sh
APPLE_SIGNING_IDENTITY="Developer ID Application: ..." \
APPLE_API_KEY=... APPLE_API_ISSUER=... APPLE_API_KEY_PATH=/path/to/AuthKey.p8 \
node scripts/sign-desktop.mjs --mode developer-id
```

The pipeline signs, submits to notarytool, waits, staples, and verifies with spctl. With APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD it uses password authentication instead of the App Store Connect API key. When credentials are absent the pipeline prints NOTARIZATION SKIPPED and exits — it never reports SKIPPED as PASS.

## Verification commands

```sh
codesign --verify --strict --verbose=2 "Harness Desktop.app"
codesign -d --entitlements - "Harness Desktop.app"
spctl --assess --type execute --verbose=2 "Harness Desktop.app"
xcrun stapler validate "Harness Desktop.app"
node scripts/verify-desktop-release.mjs
```

## DMG

scripts/make-desktop-dmg.mjs stages Harness Desktop.app beside an Applications alias and builds DeepSeek-Harness-App-v<version>-macOS-arm64.dmg with hdiutil. The mounted layout uses Finder window positions set via AppleScript when available; a failed layout script degrades to the default Finder arrangement, never to a broken DMG.

## Release classes



The release workflow (.github/workflows/desktop-release.yml) supports two explicit classes. A plain push to main never publishes a Release.

- preview: ad-hoc signed, NOT notarized, published only when explicitly triggered (manual dispatch with release_kind=preview, dry_run=false, and an explicit release_version input, or a vX.Y.Z-preview.N tag) as a GitHub Pre-release titled Public Preview — Unsigned / Not Notarized. Gatekeeper warns on first launch; users choose Open Anyway in System Settings → Privacy & Security.
- production: Apple Developer ID signed, notarized, stapled, published as a DRAFT prerelease from a vX.Y.Z tag. Without Developer ID and notarization credentials the build fails before publication; it never publishes an unsigned stable release.

## Release versions

The canonical release version is derived once per run and propagated to every artifact (Tauri app version, DMG filename, .sha256, release manifest, SBOM, and release title). The workflow no longer carries a hardcoded preview version constant.

- Preview tags: `vX.Y.Z-preview.N` → version `X.Y.Z-preview.N`, releaseKind `preview`. The sequence number is required.
- Production tags: `vX.Y.Z` → version `X.Y.Z`, releaseKind `production`.
- Manual dispatch: `release_version` (no leading `v`) is required; `release_kind` must match the version grammar (preview versions for preview kind, production versions for production kind).
- Malformed tags or inputs are rejected by scripts/resolve-release-version.mjs; the workflow fails before building.
- A tag that already has a GitHub Release is refused, so a published version cannot be silently overwritten.

Run a dry-run with `release_kind` and an explicit synthetic version such as `0.1.0-preview.99` (dry_run defaults to true) to verify the full artifact family without creating a Release.

The release manifest always states releaseKind, signing, and notarized fields; preview builds declare signing=adhoc and notarized=false. The DMG filename carries the version (v0.1.0-preview.1 for previews) so a preview never overwrites a future production artifact.

## CI

.github/workflows/desktop.yml runs typecheck, lint, the desktop test suites, Rust tests, the frontend build, the unsigned release verification, and — only when signing secrets exist — the Developer ID path with DMG upload. Secrets are GitHub encrypted secrets referenced by name; logs never print them.

## Clean-machine acceptance

Before a release, install the DMG on an isolated macOS user account without node, npm, pnpm, or a global dsh: copy to Applications, launch from Finder, and confirm Gatekeeper accepts the notarized artifact without dequarantining.
