# Repository structure

How the desktop project layers onto the upstream DeepSeek Harness checkout.

| Directory | Content |
|---|---|
| packages/, vendor/, python/, native/, examples/, website/, scripts/, docs/ | Upstream DeepSeek Harness code and gates, unmodified except for the two additive patches listed in docs/desktop/UPSTREAM-PATCHES.md |
| apps/desktop | The Tauri 2 application: frontend entry, bindings, capabilities, and the Rust runtime manager |
| apps/desktop-agent-pkg | Dependency-only deploy root defining the packaged runtime closure |
| packages/desktop/desktop-protocol | The typed desktop wire protocol |
| packages/desktop/desktop-jsonrpc-server | The stdio JSON-RPC carrier over ctx.apiProxy |
| packages/desktop/desktop-runtime | The runtime composition (cordis.yml) and packaging entry |
| packages/desktop/desktop-client | The IPC carrier, connection plugin, onboarding/settings/notification surfaces |
| packages/credentials/credentials-keychain | The Keychain credential provider bridged over stdio |
| docs/desktop | Desktop architecture, security, testing, and distribution references |
| docs/project | Public-project references: branding, licensing, repository strategy, release engineering |
| scripts/build-exe-for-desktop.ts, scripts/ensure-desktop-sidecar.mjs, scripts/desktop-icon.mjs, scripts/sign-desktop.mjs, scripts/verify-desktop-release.mjs, scripts/make-desktop-dmg.mjs | Desktop build, signing, DMG, and release verification tooling |
| .github | Public CI, release workflow, issue and PR templates, dependabot, labels |

The upstream source plane and its gates stay intact: desktop checks are additive, and the two upstream patches are isolated in their owning files so an upstream upgrade can review them directly.
