# Agent Note: Public repository CI disposition

Status: implemented

English | [中文](2026-08-18-public-repository-ci-disposition.zh.md)

## Problem

The public repository inherits upstream workflows written for DeepSeek organization infrastructure: enterprise and self-hosted runner pools, organization label automation, and npm/PyPI release machinery. Triggering them on the public repository would queue pull requests on unavailable runners or fail on missing organization settings.

## Decision

Four workflows run on the public repository: Desktop (push to main and desktop pull requests; its release builds run only on pull requests), Secret scan, the adapted keyless E2E, and Desktop release (tags and manual dispatch, fail-closed). The remaining upstream workflows are disabled through the GitHub workflow-disable setting and stay in the source tree for upstream history; docs/project/GITHUB-SETUP.md records each disposition and re-enable condition. Required checks on main are the desktop checks job and the gitleaks job, both GitHub-hosted and credential-free.

## Alternatives considered

### Why not rewrite upstream workflows for GitHub-hosted runners?

The CI workflow encodes organization failover variables, self-hosted standby drills, and Windows pools; adapting it would fork a large upstream surface for no desktop benefit.

### Why not delete the workflow files?

Deleting them would widen the divergence from upstream and erase the upstream history the repository promises to preserve.

## Consequences

- Pull requests to the public repository cannot queue on private runners.
- The public repository loses upstream-only validation (Windows coverage, sandbox proofs, npm release rehearsal), which remains CI-owned upstream.
- Workflow disable is a repository setting, not a committed diff; GITHUB-SETUP.md is the durable record.
