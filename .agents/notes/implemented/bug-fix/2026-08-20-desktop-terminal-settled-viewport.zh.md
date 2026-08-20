# Agent Note: 桌面端终端保留 settled viewport

Status: implemented

[English](2026-08-20-desktop-terminal-settled-viewport.md) | 中文

## 问题

集成终端通过 inspector store 显示流式 `delta` 输出。短命令可能在 JSON-RPC 服务器的轮询泵观察到 delta 之前就结束。其未读取的输出会作为最终 viewport 包含在终端操作的 `settled` 通知中。store 记录了该通知的状态却丢弃其文本，结果是命令在实时 PTY 中运行了，但终端界面没有显示其输出和 prompt。

## 决策

`applyInspectorFrame()` 现在会先追加 `delta` 和 `settled` 两种终端通知中的 `text`，再记录终端状态。最终 viewport 属于同一条输出流，而非状态元数据。这样可保留正常轮询期间抵达的输出，并只追加一次未读取的尾部，因为终端操作会在构建最终 viewport 前消费每个先前的 delta。

## 曾考虑的替代方案

**修改 JSON-RPC 服务器以发出额外的最终 delta。** 否决：协议已在 `settled` 通知中携带未读取的 viewport。在前端投影现有字段范围更窄，也避免冗余通知。

**用 settled viewport 替换终端缓冲区。** 否决：settled viewport 只包含轮询泵此前未消费的输出。替换会擦除更早已流式显示的内容。

**允许快速命令没有 UI 输出。** 否决：当 coding 界面无法显示命令结果或可用 prompt 时，终端发送成功并不充分。

## 测试

`apps/desktop/tests/store-core.spec.ts` 将终端 delta 与 settled viewport 组合，并证明两者按顺序显示且终端状态仍可用。聚焦的 inspector-store 测试套件以 7/7 通过。手动应用 QA 使用实时 bash PTY 复现了修复前的情形：send RPC 已结算，但终端 canvas 未显示命令结果。

## 后果

- 快速和长时间运行的终端命令共享一条有序输出投影，包括最终 prompt。
- 终端 wire 格式和服务器轮询行为保持不变。
- UI 可显示在结算通知中收到的终端输出，而不会将其视为第二个命令结果。
