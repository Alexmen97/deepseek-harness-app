# Agent Note: Desktop reference catalog routes

Status: implemented

English | [中文](2026-08-20-desktop-reference-catalog-routes.zh.md)

## Problem

The shared desktop client prewarms two session-scoped reference catalogs: `skill.list` for slash Skill candidates and `subagent.list` for the session tree. The desktop JSON-RPC carrier omitted both API proxy routes, so a real runtime showed a `method not found` connection notice and the corresponding client catalog could not load.

## Decision

The desktop JSON-RPC server serves `skill.list` and `subagent.list` through `SERVED_ROUTES`, using their shared request schemas and forwarding validated requests to the matching API proxy domains. The carrier does not add desktop-only reference APIs or interpret either catalog; the existing API proxy continues to resolve sessions and apply visibility policy.

## Alternatives considered

**Disable the desktop reference sources.** Rejected: it would make the shared desktop client diverge from the established client composition and hide existing interface behavior without addressing the carrier gap.

**Load Skill or subagent records directly from the desktop host.** Rejected: the API proxy owns session resolution, availability, and filtering. Native read paths would duplicate that policy and bypass shared request validation.

## Testing

`packages/desktop/desktop-jsonrpc-server/tests/dispatch.spec.ts` sends both routes over the stdio JSON-RPC wire and proves the server forwards each session-scoped payload and response through its API proxy domain.

## Consequences

- The packaged desktop client can prewarm its existing Skill and subagent catalogs without a connection error.
- Reference catalog authorization and filtering remain host-owned and session-scoped.
- Desktop protocol v1 retains its generic API proxy carrier instead of gaining parallel native catalog paths.
