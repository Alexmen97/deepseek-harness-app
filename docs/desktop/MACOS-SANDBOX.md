# Desktop macOS sandbox policy

Reference for the macOS security posture of the M1B application bundle. The enforcement layer for agent work is the Harness sandbox and approval policy; this document covers only the macOS App Sandbox and bookmark questions for the desktop host itself.

## App Sandbox

The M1B bundle ships with the App Sandbox entitlement disabled. The coding agent model requires the runtime to spawn user-approved tool subprocesses and to read and write the user-picked workspace; running the harness inside the app container would either break those subprocesses or require broad exceptions that leave the sandbox hollow. This is the same tradeoff the upstream web host accepts when it runs outside a sandbox.

The Harness runtime keeps its own enforcement: filesystem and subprocess capabilities resolve through ctx.fs and ctx.subprocess under the harness sandbox and approval policy, regardless of the macOS container status. Disabling the App Sandbox does not disable that layer.

## Security-scoped bookmarks

Bookmarks are not implemented. They exist to let a sandboxed app retain access to user-granted folders; the M1B app is unsandboxed, plain paths work for the process lifetime, and the workspace preference is a plain path under Application Support. The selected workspace reaches Harness through the existing workspace APIs and the runtime launch cwd; the desktop host keeps no second filesystem model. Implement bookmarks only when the App Sandbox is enabled, and revisit both before App Store distribution.

## Signing

The release bundle is ad-hoc signed, including the embedded runtime executable. Ad-hoc signatures run on the build machine without Gatekeeper prompts; distributing the raw bundle to another Mac adds the usual download quarantine, so Developer ID signing and notarization remain M2 work. No certificate material lives in the repository.

## Keychain

The ad-hoc-signed app accesses macOS Keychain items under its own service namespace (io.github.alexmen97.harness-desktop) with the user's keychain permissions; no entitlement is required for the user's own items. See [CREDENTIALS.md](CREDENTIALS.md) for the credential flow.

## WebView CSP

The production CSP keeps every origin locked to the bundled app assets (default-src 'self') and permits unsafe-eval for self-origin scripts only: the reused client runtime evaluates Cordis !!js configuration expressions through generated functions, and no remote content can reach the WebView. Navigation is restricted to the app origin and external links open in the system browser.
