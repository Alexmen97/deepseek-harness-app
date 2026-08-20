# Agent Note: 桌面端凭据 RPC 路由

Status: implemented

[English](2026-08-20-desktop-credential-rpc-routes.md) | 中文

## 问题

Models 设置页面使用共享 API proxy 的凭据方法显示配置状态、保存 API key 和删除它。桌面 stdio carrier 提供了相邻的 settings 与 models 方法，却遗漏了 `credentials.describe`、`credentials.set` 和 `credentials.unset`。因此保存 key 时，请求到达运行时传输层后便以 `method not found: credentials.set` 失败，Keychain provider 尚未来得及存储它。

## 决策

桌面 JSON-RPC server 通过 `SERVED_ROUTES` 提供全部三个标准凭据方法，使用 API proxy 的请求 schema，并将已验证的请求转发给 `ctx.apiProxy.credentials`。桌面运行时的 Keychain provider 经由既有 credential bridge 接收写入；该 bridge 只将值发送给受信任的 macOS host。响应只包含常规成功或拒绝结果，绝不包含凭据值。

## 曾考虑的替代方案

**从 Models 页面直接调用 Tauri credential command。** 否决：Models 页面是共享 Harness 客户端界面。桌面专用客户端分支会重复凭据行为，并绕过拥有响应语义的 API proxy。

**增加第二套仅限桌面的凭据 API。** 否决：carrier 已为 API proxy 方法提供了具类型且经过验证的路由系统。并行的方法集合会扩大协议，却不会提供不同能力。

**公开已存储的值以确认写入。** 否决：状态和写入结果已足够供页面使用。返回值会违反只写凭据设计。

## 测试

`packages/desktop/desktop-jsonrpc-server/tests/dispatch.spec.ts` 通过 JSON-RPC wire 发送每个标准凭据方法，并证明其到达匹配的 API proxy domain 方法。`bridge.spec.ts` 继续覆盖 host Keychain bridge 的存储和删除。聚焦的 dispatcher 与 bridge 套件以 12/12 通过。

## 后果

- Models 设置可通过已打包的桌面运行时保存、显示状态并删除凭据。
- Key 存储仍由 macOS host 所有；web client 不会获得读取 secret 的方法。
- 桌面 carrier 接受与共享 API proxy 相同的凭据 payload 验证。
