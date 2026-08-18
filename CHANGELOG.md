# Changelog

All notable changes to DeepSeek Harness App are documented here in a Keep a Changelog-inspired format.

## [Unreleased]

### Added

- Complete seven-language application localization: English, Chinese, Italian, Spanish, French, German, and Brazilian Portuguese, with live switching, system-locale detection, and a fail-closed CI/release coverage gate.
- First public macOS preview of the Tauri desktop client over the packaged DeepSeek Harness runtime.
- Keychain credential storage, native workspace picker, attachments, notifications, native menu, and English/Italian localization.
- Public repository documentation: README, user guide, troubleshooting, privacy, security, roadmap, contributing, and code of conduct.
- GitHub Actions release workflow with dry-run support, Developer ID signing, notarization, draft-only publication, artifact attestations, and a fail-closed SBOM publish gate.
- gitleaks secret scanning in CI with an explicit allowlist for upstream e2e fixture placeholders.
- Machine-readable upstream pin (docs/project/upstream-base.json), SHA-256 checksums, and a release manifest for every DMG.

### Changed

- The application name remains Harness Desktop while the public project is DeepSeek Harness App.
- Distribution artifacts use the public DeepSeek-Harness-App-v<version>-macOS-arm64.dmg naming with LICENSE and THIRD_PARTY_NOTICES.md inside the DMG.

### Fixed

- The upstream locale fallback now resolves to English instead of Chinese.
- The remote namespace mount race no longer breaks the boot-time inspect sync.

### Security

- CSP eval audit with a boot-time manifest guard and a source-scan regression test.
- Navigation locked to the app origin; rendered Markdown verified against hostile input.
- Hardened Runtime signing pipeline with Developer ID/notarization support.
