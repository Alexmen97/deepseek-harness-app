# Desktop distribution

Reference for the signing, notarization, and DMG pipeline. Secrets never
enter the repository: credentials arrive through the environment only.

## Signing model

Inside-out: scripts/sign-desktop.mjs signs the bundled runtime first, then
the application, both with Hardened Runtime. No codesign --deep. The only
entitlement is allow-jit (docs/desktop/ENTITLEMENTS.md). The nested-code
set is pinned by scripts/verify-desktop-release.mjs
(docs/desktop/NESTED-CODE.md).

## Local development signing

```sh
node scripts/sign-desktop.mjs --mode adhoc-hardened
```

Produces an ad-hoc hardened-runtime bundle for the build machine. Ad-hoc
identities cannot be notarized and Gatekeeper rejects them on other Macs;
this mode exists to exercise the hardened-runtime workflow locally.

## Developer ID + notarization

```sh
APPLE_SIGNING_IDENTITY="Developer ID Application: ..." \
APPLE_API_KEY=... APPLE_API_ISSUER=... APPLE_API_KEY_PATH=/path/to/AuthKey.p8 \
node scripts/sign-desktop.mjs --mode developer-id
```

The pipeline signs, submits to notarytool, waits, staples, and verifies with
spctl. With APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD it uses password
authentication instead of the App Store Connect API key. When credentials
are absent the pipeline prints NOTARIZATION SKIPPED and exits — it never
reports SKIPPED as PASS.

## Verification commands

```sh
codesign --verify --strict --verbose=2 "Harness Desktop.app"
codesign -d --entitlements - "Harness Desktop.app"
spctl --assess --type execute --verbose=2 "Harness Desktop.app"
xcrun stapler validate "Harness Desktop.app"
node scripts/verify-desktop-release.mjs
```

## DMG

scripts/make-desktop-dmg.mjs stages Harness Desktop.app beside an
Applications alias and builds
Harness-Desktop-<version>-macOS-arm64.dmg with hdiutil. The mounted layout
uses Finder window positions set via AppleScript when available; a failed
layout script degrades to the default Finder arrangement, never to a broken
DMG.

## CI

.github/workflows/desktop.yml runs typecheck, lint, the desktop test
suites, Rust tests, the frontend build, the unsigned release verification,
and — only when signing secrets exist — the Developer ID path with DMG
upload. Secrets are GitHub encrypted secrets referenced by name; logs never
print them.

## Clean-machine acceptance

Before a release, install the DMG on an isolated macOS user account without
node, npm, pnpm, or a global dsh: copy to Applications, launch from Finder,
and confirm Gatekeeper accepts the notarized artifact without
dequarantining.
