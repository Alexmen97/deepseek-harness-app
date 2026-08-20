# Agent Note: 桌面终端提交已输入的命令行

Status: implemented

[English](2026-08-20-desktop-terminal-input-buffer.md) | 中文

## 问题

桌面终端在 xterm 中本地渲染每个输入字符，却在发起终端请求前丢弃了它。Enter 总是发送空字符串，因此用户虽然看见了输入，实时 PTY 却没有收到命令。另一个问题是，每次 inspector render 都会生成新的桌面 palette，并改变终端初始化 effect 的依赖。xterm 会在无关状态更新时被销毁并重新创建，清空 viewport 并替换输入处理器。

## 决策

`TerminalTab` 用 ref 保存待提交的命令行，在本地渲染每个按键，并且只在 Enter 提交时发送准确的缓冲文本。Ctrl+C、会话替换和关闭终端都会清空待提交的命令行。xterm 实例由选定的外观而不是新分配的 palette 所有；resize 和输入处理器使用的会话与终端值来自 refs。

## 曾考虑的替代方案

**每次按键发送一个 RPC。** 否决：`desktop.terminal.send` 是串行的行操作，因此逐键请求不能表示交互式 shell 输入，并会使命令顺序更复杂。

**添加原始终端输入协议。** 否决：桌面协议有意只暴露面向行的终端请求。第二条传输通道会扩大 native 接口，却不能更好地满足此命令输入需求。

**用 HTML input 替换 xterm 输入。** 否决：这会重复终端呈现并移除正常的终端编辑反馈，而不是保留现有 canvas 交互。

## 测试

`apps/desktop/tests/terminal-tab.spec.ts` 断言 Enter 读取缓冲命令行、以 `submit: true` 转发它、绝不替换为空字符串，并保持 xterm 初始化 effect 与 inspector state 无关。聚焦的终端、store 和 sanitizer 测试以 18/18 通过。手动 QA 发现使用实时打包 PTY：修复前输入 `echo hello` 并按 Enter 没有产生输出。

## 后果

- 在 xterm 中输入的终端命令会以完整命令行到达实时 PTY。
- Inspector state 更新不会重新创建 xterm viewport 或其输入处理器。
- 终端传输和 PTY 所有权保持面向行且不变。
