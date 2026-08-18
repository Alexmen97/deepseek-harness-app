# 桌面

[English](desktop.md) | 中文

桌面子系统将打包的 DeepSeek Harness 运行时装入 macOS 应用：`dsh-desktop-runtime` 可执行文件通过 stdio JSON-RPC 提供 Harness，桌面 JSON-RPC 服务器桥接 Harness 网关，`ctx.desktopRuntimeInfo` 报告正在运行的引擎的准确身份。

来源：[`packages/desktop/desktop-jsonrpc-server/src/index.ts`](../../packages/desktop/desktop-jsonrpc-server/src/index.ts)

`DesktopRuntimeInfo` 携带 Harness 引擎版本、桌面运行时包版本以及所服务的协议版本。组合应用二进制在树挂载之前安装该值；JSON-RPC 服务器用它回答握手与能力请求，Tauri 宿主在关于窗口和诊断信息中展示它。其余桌面宿主表面（钥匙串凭据、工作区选择器、运行时生命周期）位于 Tauri IPC 边界之后，详见 [docs/desktop/ARCHITECTURE.md](../desktop/ARCHITECTURE.md)。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxdesktopruntimeinfo--desktopruntimeinfo"></a>

### `ctx.desktopRuntimeInfo` — `DesktopRuntimeInfo`

Runtime identity values provided by the composing app bin.

Source: [`packages/desktop/desktop-jsonrpc-server/src/index.ts:80`](../../packages/desktop/desktop-jsonrpc-server/src/index.ts)
<!-- END GENERATED cordis-surface -->
