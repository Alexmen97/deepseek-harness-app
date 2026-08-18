# Agent Note: Desktop bundle identifier and Keychain service

Status: implemented

English | [中文](2026-08-18-desktop-bundle-identifier-and-keychain-service.zh.md)

## Problem

The provisional bundle identifier com.deepseek.harness.desktop places the deepseek reverse-DNS authority in a community project that does not control that domain. The identifier also derives the Application Support directory (logs, preferences, sessions) and the Keychain service namespace, so changing it after the first public release would strand user data. The open decision was documented in docs/desktop/BRANDING.md and docs/project/BRANDING-AND-TRADEMARK.md with the GitHub owner unknown.

## Decision

The public bundle identifier is io.github.alexmen97.harness-desktop, reverse-DNS of the maintainer-controlled GitHub Pages namespace io.github.alexmen97 and consistent with the application name Harness Desktop. The Keychain service uses the same string (apps/desktop/src-tauri/src/manager.rs), so the credential namespace moves with the app identity. The rename shipped before the first public release, when no public user data existed.

## Alternatives considered

### Why not keep com.deepseek.harness.desktop?

The deepseek reverse-DNS authority implies domain ownership the community project does not have; the identifier would read as official affiliation, and changing it later would strand user data in Application Support and the Keychain.

### Why not a separately registered domain?

No maintainer domain existed at decision time. io.github.<owner> is the namespace each GitHub account controls through GitHub Pages, so it satisfies the maintainer-controlled reverse-DNS requirement without registering anything.

## Consequences

- Pre-release development data under ~/Library/Application Support/com.deepseek.harness.desktop is not migrated; the first build with the new identifier starts with fresh logs, preferences, and sessions.
- The pre-release DEEPSEEK_API_KEY entry under the retired Keychain service is orphaned in the login Keychain and remains recoverable through Keychain Access; the key is re-entered once in Settings.
- The identifier and Keychain service must not change again after the first public release: Application Support paths, Keychain items, and Gatekeeper identity derive from them.
