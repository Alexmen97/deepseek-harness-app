# Desktop

English | [中文](desktop.zh.md)

The desktop subsystem carries the packaged DeepSeek Harness runtime under the macOS app: the `dsh-desktop-runtime` executable serves the harness over stdio JSON-RPC, the desktop JSON-RPC server bridges the harness gateway, and `ctx.desktopRuntimeInfo` reports the exact identity of the running engine.

Source: [`packages/desktop/desktop-jsonrpc-server/src/index.ts`](../../packages/desktop/desktop-jsonrpc-server/src/index.ts)

`DesktopRuntimeInfo` carries the harness engine release, the desktop runtime package version, and the served protocol version. The composing app bin installs the value before the tree mounts; the JSON-RPC server answers handshake and capability requests with it, and the Tauri host displays it in the About window and diagnostics. The remaining desktop host surface (Keychain credentials, the workspace picker, runtime lifecycle) lives behind the Tauri IPC boundary and is documented in [docs/desktop/ARCHITECTURE.md](../desktop/ARCHITECTURE.md).

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxdesktopruntimeinfo--desktopruntimeinfo"></a>

### `ctx.desktopRuntimeInfo` — `DesktopRuntimeInfo`

Runtime identity values provided by the composing app bin.

Source: [`packages/desktop/desktop-jsonrpc-server/src/index.ts:75`](../../packages/desktop/desktop-jsonrpc-server/src/index.ts)
<!-- END GENERATED cordis-surface -->
