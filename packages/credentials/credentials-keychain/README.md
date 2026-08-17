# @deepseek-ai/dsh-credentials-keychain

Keychain-backed credential provider for the desktop runtime. The macOS
Keychain is owned by the trusted desktop host (the Tauri process); this
provider resolves, stores, and deletes credential references by crossing the
stdio transport through one server-initiated JSON-RPC request per operation
(the option-C architecture in docs/desktop/CREDENTIALS.md).

## Behavior

- resolve reads the Keychain through the bridge first; when the host has no
  value it falls back to the process environment (tests and explicit
  development mode only — never the production path).
- set and unset always write the Keychain through the bridge; an empty value
  is rejected and removing an absent reference is a no-op on the host.
- describe reports configured state, the supplying source, and writability,
  never the value.
- No secret is written to any runtime-owned file, and no operation logs its
  value; failures carry the host's message without the secret.

## Composition

Mount this provider instead of dsh-credentials-local in the desktop runtime.
The desktop JSON-RPC server must be composed with keychain: true so it
provides the credential bridge and reports the keychain capability.
