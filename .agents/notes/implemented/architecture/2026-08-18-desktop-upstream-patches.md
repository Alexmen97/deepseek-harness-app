# Agent Note: The two desktop upstream patches

Status: implemented

English | [中文](2026-08-18-desktop-upstream-patches.zh.md)

## Problem

Two small changes to upstream packages are required for the desktop architecture, and they must stay reviewable and removable as upstream evolves: the ConnectionController re-export and the remote namespace mount ordering fix.

## Decision

packages/client/connection re-exports ConnectionController so the desktop connection plugin can build the identical ConnectionHandle over DesktopApiClient without copying the controller. packages/api/gateway installs a namespace's first method batch inside the namespace service's own apply, so a consumer that injects a remote namespace sees the mounted methods immediately; the rollback path withdraws partially-installed methods on a failed batch. Both are additive, documented in docs/desktop/UPSTREAM-PATCHES.md, and each carries a regression test: the gateway ordering test in gateway.client.spec.ts and the desktop connection plugin's use of the exported controller (typechecked and covered by the carrier tests). The upgrade procedure in docs/project/UPSTREAM-WORKFLOW.md reviews both patches at every upstream base bump and drops any the new base absorbed.

## Alternatives considered

- **Copying ConnectionController into the desktop package** — rejected: duplicate controller logic would drift from the upstream loop semantics.
- **Making the namespace mount wait through timing** — rejected: a sleep or retry papers over the ordering contract instead of fixing it.
- **Forking the two packages wholesale** — rejected: the patches are each a handful of lines, and a fork would make upstream upgrades permanent work.

## Consequences

The desktop carries exactly two upstream file modifications, both isolated and named in the upgrade workflow. If upstream later exports the controller or adopts the ordering fix, the corresponding patch is deleted in the next base bump and the owning test is updated to match upstream behavior.
