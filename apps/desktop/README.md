# Harness Desktop (apps/desktop)

The macOS Tauri 2 application over the packaged DeepSeek Harness runtime:
the reused web client shell, the desktop IPC carrier, the Rust process
owner, first-run onboarding, and the macOS Keychain bridge. This is the
unofficial desktop client; branding remains provisional.

## Build

```sh
pnpm install
node scripts/build-exe-for-desktop.ts
cd apps/desktop && pnpm exec tauri build
```

The bundle lands at apps/desktop/src-tauri/target/release/bundle/macos/
Harness Desktop.app. Building the runtime executable first is required: the
bundled sidecar is copied from dist-exe by
scripts/ensure-desktop-sidecar.mjs, which the Tauri beforeBuildCommand runs.
No system Node, pnpm, or Homebrew is needed to run the result; the runtime
embeds its own Node.

## Runtime ownership

The Rust manager is the only owner of the sidecar process. The WebView
requests lifecycle operations through the allowlisted Tauri commands and
never spawns, kills, or reaches the executable itself. Stdout is JSON-RPC
protocol only; stderr is captured to the app logs with one rotation.

## Preferences and data

Desktop state lives in the application data directory under prefs.json: the
selected workspace, the DeepSeek base URL, and window state. Sessions and
conversation history live in Harness persistence under the same directory,
never in a desktop database.

## Development overrides

Environment variables for development and CI only; production uses the
bundle resources:

- DSH_DESKTOP_RUNTIME_PATH: run an unpackaged runtime executable.
- DSH_DESKTOP_RUNTIME_CONFIG: run with an unpackaged cordis.yml.
- DSH_DESKTOP_MAX_FRAME_BYTES: override the 16 MiB stdout frame limit.
- DSH_DESKTOP_SHUTDOWN_GRACE_MS: override the 5 s shutdown grace.

The development frontend server runs with pnpm dev; the Tauri dev mode
points at it through devUrl. There is no hidden fallback to a globally
installed dsh.

## Security

The IPC surface is the minimum: runtime lifecycle, rpc_request, the native
workspace picker, Keychain credential status/set/delete, open logs,
open_external for http(s) links only, preferences, and diagnostics. No exec,
shell, or filesystem commands exist. The production CSP allows only the
bundled origin; see docs/desktop/MACOS-SANDBOX.md and
docs/desktop/CREDENTIALS.md.

## Limitations

One workspace per runtime process; switching workspace restarts the
runtime. Terminal, plugin, skills, and MCP management surfaces are not part
of M1B. The bundle is ad-hoc signed; Developer ID signing and notarization
are later milestones.
