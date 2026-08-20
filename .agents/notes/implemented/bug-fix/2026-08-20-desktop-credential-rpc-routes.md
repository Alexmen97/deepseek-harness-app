# Agent Note: Desktop credential RPC routes

Status: implemented

English | [中文](2026-08-20-desktop-credential-rpc-routes.zh.md)

## Problem

The Models settings page uses the shared API proxy credential methods to show configuration state, save an API key, and remove it. The desktop stdio carrier served the neighboring settings and model methods but omitted `credentials.describe`, `credentials.set`, and `credentials.unset`. Saving a key therefore reached the runtime transport but failed as `method not found: credentials.set` before the Keychain provider could store it.

## Decision

The desktop JSON-RPC server serves all three standard credential methods through `SERVED_ROUTES`, using the API proxy request schemas and forwarding the validated request to `ctx.apiProxy.credentials`. The desktop runtime's Keychain provider receives the write through its existing credential bridge, which sends the value only to the trusted macOS host. The response contains only the normal success or rejection result and never a credential value.

## Alternatives considered

**Call the Tauri credential command directly from the Models page.** Rejected: the Models page is a shared Harness client surface. A desktop-specific client branch would duplicate credential behavior and bypass the API proxy that owns its response semantics.

**Add a second desktop-only credential API.** Rejected: the carrier already has a typed, validated route system for the API proxy methods. A parallel method set would enlarge the protocol without providing a different capability.

**Expose a stored value to confirm the write.** Rejected: status and write outcomes are sufficient for the page. Returning a value would violate the write-only credential design.

## Testing

`packages/desktop/desktop-jsonrpc-server/tests/dispatch.spec.ts` sends each standard credential method over the JSON-RPC wire and proves it reaches the matching API proxy domain method. `bridge.spec.ts` continues to cover the host Keychain bridge for store and delete. The focused dispatcher and bridge suites pass 12/12.

## Consequences

- Models settings can save, show, and remove credentials through the packaged desktop runtime.
- Key storage remains owned by the macOS host; the web client does not obtain a read method for secrets.
- The desktop carrier accepts the same credential payload validation as the shared API proxy.
