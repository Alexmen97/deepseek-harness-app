# Hardened Runtime entitlements

The hardened-runtime configuration is deliberately minimal. One entitlement is declared, and it exists because the WebView cannot run without it.

## com.apple.security.cs.allow-jit

WebKit needs its JIT tier in the WebView process; the hardened runtime denies writable+executable memory without this entitlement. Tauri's macOS signing guidance prescribes allow-jit for WebView apps. The app carries it.

The bundled runtime carries no entitlements: pkg signs the SEA itself with Hardened Runtime, and the keyless acceptance suite runs the full tool execution matrix against that signature. Re-signing the SEA is forbidden — it corrupts the embedded snapshot (docs/desktop/NESTED-CODE.md).

## Explicitly NOT declared

- com.apple.security.cs.disable-library-validation — not required: the runtime and its dylibs are all signed inside-out.
- com.apple.security.cs.allow-unsigned-executable-memory — not required.
- com.apple.security.cs.allow-dyld-environment-variables — not required.
- com.apple.security.cs.debugger — not required.

The sidecar carries no entitlements at all. Child process execution and filesystem access need no entitlement outside the App Sandbox, which stays disabled (docs/desktop/MACOS-SANDBOX.md).

## Verification

```sh
codesign -d --entitlements - "Harness Desktop.app"
codesign -d --entitlements - "Harness Desktop.app/Contents/Resources/sidecar/dsh-desktop-runtime"
```
