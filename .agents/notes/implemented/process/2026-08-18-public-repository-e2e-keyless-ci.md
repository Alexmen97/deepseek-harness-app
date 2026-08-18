# Agent Note: Public repository e2e CI is keyless by default

Status: implemented

English | [中文](2026-08-18-public-repository-e2e-keyless-ci.zh.md)

## Problem

The upstream e2e workflow fails its preflight when the DEEPSEEK_API_KEY_EXTERNAL repository secret is absent, because the suites self-skip without a key and a trusted event must not report a false green. The public repository has no such secret, so every push to main would fail the preflight.

## Decision

In the public repository, the e2e preflight records a has_key step output instead of failing: without the secret it emits a warning and skips the build and e2e steps; with the secret the workflow runs exactly as upstream. The suites' own self-skip behavior is unchanged.

## Alternatives considered

### Why not require the secret before publication?

The maintainer has not provisioned an external-API key for CI, and failing pushes would keep the default branch red without user-visible benefit.

### Why not remove or disable the workflow?

The workflow documents the real-API path and returns to full upstream behavior once the secret exists; removing it would erase that path.

## Consequences

- Pushes to main stay green with a skip warning until the maintainer adds DEEPSEEK_API_KEY_EXTERNAL.
- A missing or empty secret reads as a skipped suite with a warning, not as a failed workflow; upstream keeps the stricter preflight on its own repository.
