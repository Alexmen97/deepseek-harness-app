# Agent Note: Tag releases fail closed without notarization credentials

Status: implemented

English | [中文](2026-08-18-release-fail-closed-notarization.zh.md)

## Problem

The release gate checked only the signing certificate: a tag release with signing credentials but no notarization credentials would sign the app, skip notarization, and still create a draft pre-release of an unnotarized DMG.

## Decision

The signing-secrets job also decides notarized from either the App Store Connect API-key triple or the Apple-ID password triple. The build job refuses a tag publication when signing or notarization credentials are absent, before any Release is created; a dry-run dispatch still produces an unsigned development artifact without publication. The workflow verifies the imported signing identity with security find-identity before signing.

## Alternatives considered

### Why not gate on notarization success inside the sign step?

sign-desktop exits successfully when credentials are absent, by design, so the dry-run can complete; the workflow-level credential gate keeps the fail-closed rule without changing the dry-run behavior.

## Consequences

- A v* tag cannot publish a signed-but-unnotarized DMG.
- The release-workflow structural spec pins the notarization refusal.
