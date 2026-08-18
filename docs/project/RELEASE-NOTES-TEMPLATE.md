# Release notes template

The body template for a GitHub Release. The release workflow fills the version, engine, and checksum placeholders from the release manifest. The complete drafted v0.1.0 notes are below; they are prepared, not published.

```markdown
# DeepSeek Harness App v<version>

First public preview (Pre-release).

## Highlights

- Native macOS desktop client (Tauri) over the packaged DeepSeek Harness runtime; no Node, pnpm, or Homebrew required.
- Seven complete application languages: English, Chinese, Italian, Spanish, French, German, and Brazilian Portuguese.
- API key stored in the macOS Keychain; workspace/session management, streaming, tool calls, approvals, questions, and image attachments.
- Developer ID signing and notarization pipeline with draft, prerelease, attestation, SBOM, checksum, and manifest gates.

## Installation

Download DeepSeek-Harness-App-v<version>-macOS-arm64.dmg, open it, drag the
app to Applications, and launch. Configure the DeepSeek API key and pick a
project. No Node installation is required.

## Requirements

macOS on Apple Silicon. Harness Engine <harnessVersion> (upstream commit
<harnessCommit>).

## Known limitations

- macOS on Apple Silicon only; Intel and Windows/Linux are not built.
- One workspace per runtime; the terminal UI is not exposed yet, and the automatic updater is not implemented.
- Harness Engine is an upstream developer preview pinned to <harnessVersion>; compatibility-breaking upstream changes are expected.
- First release: treat as a technical preview, not a stable product.

## Included Harness Engine

Harness Engine: <harnessVersion>
Harness upstream commit: <harnessCommit>
Desktop protocol: 1

## Verification

- SHA-256: <sha256> (verify with `shasum -a 256 -c DeepSeek-Harness-App-v<version>-macOS-arm64.dmg.sha256` after downloading both files into the same directory)
- Release manifest: DeepSeek-Harness-App-v<version>-release-manifest.json
- SBOM: DeepSeek-Harness-App-v<version>-sbom.cdx.json (CycloneDX 1.5)

## Changes

<categorized notes from CHANGELOG.md>

## Security / Privacy

- The API key lives in the macOS Keychain and is never read back by the frontend. Conversations and session data stay on your Mac; requests go to your configured DeepSeek provider. No telemetry, analytics, or crash uploads.
```
