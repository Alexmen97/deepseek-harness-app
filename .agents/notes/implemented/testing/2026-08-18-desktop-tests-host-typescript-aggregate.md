# Agent Note: Desktop app tests join the host TypeScript aggregate

Status: implemented

English | [中文](2026-08-18-desktop-tests-host-typescript-aggregate.zh.md)

## Problem

The desktop app tests under apps/desktop/tests sat outside every TypeScript program: the Vite project covers src only and neither aggregate included the tests. Oxlint's type-aware rules therefore analyzed them without a project, typed every symbol as error, and the repository-wide lint failed on apps/desktop/tests even though the scoped desktop CI lint passed.

## Decision

apps/desktop/tests/**/*.ts and the imported apps/desktop/src/boot-guard.ts belong to the host aggregate (tsconfig.host.json), the same program that holds apps/web/tests. The release-workflow spec narrows loaded YAML jobs through a throwing job() helper, and the boot-guard spec uses braced void arrows. The Oxlint executable-contract test pins that apps/desktop/tests files resolve tsconfig.host.json.

## Alternatives considered

### Why not a standalone tests tsconfig?

A program outside the aggregates would not be typechecked by the repository typecheck gates and would duplicate the aggregate pattern the repository already uses for app tests.

### Why not exclude the tests from type-aware lint?

Excluding them hides real strict-mode findings; joining the aggregate uncovered and fixed genuinely undefined YAML job access.

## Consequences

- pnpm run lint covers the whole repository and passes.
- The desktop tests gain strict typechecking, and future files under the same include are covered.
