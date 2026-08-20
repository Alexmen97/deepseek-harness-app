# Agent Note: Desktop reconnect wakes parked streams

Status: implemented

English | [中文](2026-08-20-desktop-reconnect-wakes-parked-streams.zh.md)

## Problem

The desktop runtime manager correctly advances its generation before it starts a replacement sidecar and rejects a request that still names the preceding generation. A workspace change can therefore race an in-flight connection handshake: the stale initialize request fails as intended, but its already-open event stream is locally aborted while parked waiting for a frame. Before this change, aborting that stream did not resolve its pending wait. The upstream connection controller then waited indefinitely for the stream pump to finish and never made the next handshake attempt, leaving the app disconnected although the replacement sidecar was alive.

## Decision

`DesktopApiClient.openStream()` now wakes a parked asynchronous stream for both abort sources: the caller signal and the client-owned generation controller. The generator observes the abort on its next loop iteration, completes, and removes both listeners and its frame registration. Frame arrival uses the same wake path. The Rust manager continues to reject stale generations; the client does not retry or reinterpret a stale request itself. Completion remains the signal that lets the upstream connection controller begin its normal reconnect attempt against the current generation.

## Alternatives considered

**Accept a stale request in the Rust manager.** Rejected: a request names the runtime generation that must serve it. Accepting an obsolete generation would weaken generation isolation and could dispatch work to a replacement runtime under a request that belongs to its predecessor.

**Restart the upstream connection controller from the desktop client.** Rejected: the controller already owns connection attempts and retry sequencing. The desktop carrier only needs to make its aborted stream observable as complete, preserving the existing ownership split.

**Poll a stream for abort state.** Rejected: polling adds latency and a timer lifecycle to every event stream. Resolving the existing pending wait is immediate and has no background work.

## Testing

`packages/desktop/desktop-client/tests/carrier.client.spec.ts` starts a stream pull before a generation replacement and proves that the pending pull completes. A companion case proves that a caller abort also wakes a parked pull. The focused carrier suite passes 9/9.

## Consequences

- A workspace-triggered runtime replacement whose earlier handshake is rejected as stale reaches the existing reconnect path instead of remaining disconnected.
- Stale requests remain fail-closed at the Rust generation check; no protocol or runtime-manager behavior changes.
- Idle event streams now own two short-lived abort listeners and remove them when the stream completes.
