# Agent Note: Host tsdown face builds only Host-emitted packages

Status: implemented

English | [中文](2026-08-18-host-tsdown-face-clean-tree-workspace.zh.md)

## Problem

On a clean tree, pnpm run build and pnpm run typecheck failed during the Host tsdown pass: the workspace list included every package, but client-only packages such as the desktop client have no lib/types output until the Client aggregate runs, so tsdown entry resolution failed with Cannot find entry lib/types/{index,invariant,startup}.js. The same failure broke the public desktop CI, which typechecks on a fresh checkout.

## Decision

The Host face derives its workspace at config time from the filesystem: vendor/*, apps/cli, and every packages/<group>/<package> whose lib/types directory exists after tsc -b tsconfig.host.json. The Client face keeps the full workspace list. The filter follows Host program emission exactly, so Host-reachable client packages that contribute Host Typert models remain included.

## Alternatives considered

### Why not reorder the client typecheck before the host bundle?

The Client aggregate imports generated typert.remote-client declarations that only the Host tsdown pass emits, so the client pass cannot run first on a clean tree.

### Why not list client-only packages explicitly?

An explicit exclusion list drifts as packages join the Client aggregate; the exists check derives membership from the Host emission itself.

## Consequences

- pnpm run build and pnpm run typecheck pass on a clean checkout, which the desktop CI requires.
- The change is recorded as the third intentional upstream patch in docs/desktop/UPSTREAM-PATCHES.md.
