# Release notes template

The body template for a GitHub Release. The release workflow fills the version, engine, and checksum placeholders from the release manifest.

```markdown
# DeepSeek Harness App v<version>

First public preview (Pre-release).

## Highlights

<three to five bullet points>

## Installation

Download DeepSeek-Harness-App-v<version>-macOS-arm64.dmg, open it, drag the
app to Applications, and launch. Configure the DeepSeek API key and pick a
project. No Node installation is required.

## Requirements

macOS on Apple Silicon. Harness Engine <harnessVersion> (upstream commit
<harnessCommit>).

## Known limitations

<current limitations>

## Included Harness Engine

Harness Engine: <harnessVersion>
Harness upstream commit: <harnessCommit>
Desktop protocol: 1

## Verification

SHA-256: <sha256>

## Changes

<categorized notes from CHANGELOG.md>

## Security / Privacy

The API key lives in the macOS Keychain. No telemetry or crash uploads.
```
