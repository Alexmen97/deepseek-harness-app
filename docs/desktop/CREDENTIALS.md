# Desktop credentials — architecture

Reference for how the DeepSeek API key reaches the desktop runtime. Upstream owns the credential seam (`ctx.credentials`, [`packages/credentials/credentials`](../../packages/credentials/credentials/README.md)) and a file-backed provider ([`packages/credentials/credentials-local`](../../packages/credentials/credentials-local/README.md)) whose security section names an OS-keychain provider as the deferred sibling package. This document selects the desktop architecture and records what the M1B application ships.

## Requirements

- The API key is stored in the macOS Keychain, nowhere else.
- It never persists in harness plaintext config (`.credentials.yaml`, `.env`, `settings.yaml`) owned by the runtime.
- It never appears in runtime logs, stdout, stderr, crash dumps, or diagnostics output.
- It never reaches the frontend JavaScript unless a flow strictly requires it; the model settings screen shows an owner-scoped masked state, not the value.
- Least privilege: the secret lives in the component that must use it, for the shortest possible lifetime.
- The harness credential seam remains the resolution point for adapters, so a provider swap changes nothing model-visible.

## Compared options

### A. Environment injection

The desktop host writes `DEEPSEEK_API_KEY` into the sidecar environment at spawn. The runtime's existing `credentials-local` env layer resolves it. Zero new runtime code. Drawbacks: the value lives in the child process environment for the whole process lifetime (visible to same-user processes and to same-UID tool subprocesses), and rotation requires a restart.

### B. Desktop/keychain credential provider inside the runtime

A provider plugin inside the runtime reads the macOS Keychain directly. That forces a native addon (or a helper subprocess) into the closed runtime tree, moves the trust root into the engine process, and gives the model's own tool processes a same-UID path to the credential store. Rejected.

### C. Credential RPC from runtime to the trusted desktop host

The runtime registers a `ctx.credentials` provider whose `resolve(ref)` sends a server-initiated JSON-RPC request over the existing stdio channel; the desktop host resolves the reference from Keychain and returns the value only to that one request. The secret enters the engine for a single adapter resolution, never the environment, never disk. The transport is the same trusted channel the app already owns, and a missing desktop host fails closed. This is the target design.

### D. Other upstream-compatible provider seam

A sibling upstream package such as `@deepseek-ai/dsh-credentials-keychain` using macOS Security framework bindings. It is option B with the addon problem, or option C without the transport; no existing upstream seam is cleaner than the provider interface option C already implements.

## Decision

The shipped design is option C. The runtime composes packages/credentials/credentials-keychain, whose provider bridges resolve, store, and delete over server-initiated JSON-RPC requests on the stdio channel; the Rust desktop host answers those requests from the macOS Keychain (service io.github.alexmen97.harness-desktop). The runtime never stores the value; the desktop host never logs it; diagnostics redact every credential-shaped value, and the frontend sees only a configured boolean with the provider name, never the raw key.

Option A stays available exclusively for automated tests and explicit development mode: the acceptance and CI launchers may inject DEEPSEEK_API_KEY into the sidecar environment. The packaged runtime composition never falls back to the environment layer, stderr capture redacts credential-shaped values, and the runtime integration suite pins that no credential-shaped value reaches stdout or stderr.

The desktop settings modal owns the user-facing credential surface: status, replace (new key typed, sent straight to the Keychain, cleared), remove with confirmation, and a separate Base URL preference that never enters the Keychain. The first Keychain access triggers the standard macOS authorization prompt once.

## Identifier and Keychain migration impact

The Keychain service name is io.github.alexmen97.harness-desktop, a separate string in apps/desktop/src-tauri/src/manager.rs that matches the bundle identifier. The rename happened before the first public release: the pre-release development entry under the retired service com.deepseek.harness.desktop is orphaned in the login Keychain (recoverable through Keychain Access, deleted only by the user) and the migration is a one-time re-entry of the API key. With no public users at the rename, an automatic migration is not implemented. Do not silently change the credential identifiers.
