# Agent Note: Public repository identity and release decisions

Status: implemented

English | [中文](2026-08-18-public-repository-and-release-decisions.zh.md)

## Problem

The desktop application needs a public identity and a release pipeline while remaining clearly unofficial. The decisions — repository shape, naming, licensing, artifact names, and release status — each had a plausible alternative that would be expensive to reverse after the first public download.

## Decision

The public project is an independent GitHub repository named DeepSeek Harness App (slug deepseek-harness-app), derived from the pinned upstream checkout with the full upstream history retained and the upstream remote preserved as upstream. The application keeps the provisional name Harness Desktop so the DeepSeek mark never appears as an application name without permission; the repository carries the product identity. The whole project stays MIT, with the upstream LICENSE and THIRD_PARTY_NOTICES.md preserved and the libvips LGPL obligation recorded in docs/project/LICENSE-AUDIT.md. Public artifacts are named DeepSeek-Harness-App-v<version>-macOS-arm64.dmg with a SHA-256 checksum and a machine-readable release manifest; the first public release is marked Pre-release. The Mac App Store is not part of the product strategy; Developer ID signing and notarization serve direct GitHub Releases only.

## Alternatives considered

- **A GitHub fork of deepseek-ai/deepseek-harness** — rejected: the fork relationship would present the engine's identity, tags, and README to desktop users, and would complicate independent releases, discussions, and issue workflows for a product with its own identity.
- **Renaming the application to DeepSeek Harness App** — rejected for now: the mark in the application name and dock reads as official affiliation without permission; the repository name carries the identity instead.
- **A squashed initial commit** — rejected: retaining the upstream history preserves attribution and makes future upstream merges and blame usable.
- **A custom license** — rejected: MIT matches upstream, and no bundled dependency prevents keeping the whole project MIT.
- **Marking 0.1.0 stable** — rejected: the engine is in developer preview with breaking changes expected, so the first desktop release is a Pre-release.

## Consequences

The repository can be created and published without a fork relationship, with independent tags and releases. The application name remains a known open item to revisit only with trademark permission. Every release carries the license and notice files inside the DMG, and the release workflow refuses to publish a stable DMG without Developer ID signing and notarization.
