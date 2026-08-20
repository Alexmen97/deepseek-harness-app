# Agent Note: 桌面终端提交并正确渲染已输入的命令行

Status: implemented

[English](2026-08-20-desktop-terminal-input-buffer.md) | 中文

## 问题

桌面终端在 xterm 中本地渲染每个输入字符，却在发起终端请求前丢弃了它。Enter 因此发送空字符串，用户虽然看见了输入，实时 PTY 却没有收到命令。完整命令行到达 PTY 后，第二次手动运行又暴露了三个呈现问题：规范化的 PTY 换行让 xterm 只向下移动而不回到第零列，spawn 响应及其输出通知把初始 prompt 渲染了两次，终端驱动又回显了 xterm 已在本地显示的同一条已提交命令行。随后一次 Ctrl+C 运行终止了前台进程，却没有恢复 Bash 的 prompt：面向进程的 SIGINT 绕过了 Bash 在中断后重绘所依赖的终端控制路径。关闭并重新打开终端还会保留先前 PTY 的输出，因为 Inspector 投影只按会话键控。在打包应用中，xterm 会发出 Ctrl+C，但同步 Tauri RPC 命令会被长时间运行的终端 send 请求阻塞，因此中断请求只有在命令完成后才会到达 runtime。本地命令行渲染器还会把 Backspace 显示为控制字符，而不是删除待提交的字符。

## 决策

`TerminalTab` 用 ref 保存待提交的命令行，在本地渲染每个按键，并且只在 Enter 提交时发送准确的缓冲文本。Ctrl+C、会话替换和关闭终端都会清空待提交的命令行。Tauri RPC 命令在阻塞 worker 中等待 runtime 响应，因此长时间运行的终端 send 不会占用 IPC executor，xterm 的 Ctrl+C 信号会立即到达 runtime。Backspace 代码会通过本地的退格-空格-退格渲染删除待提交字符。xterm 将规范化的换行转换为回车加换行。初始 prompt 只从终端输出通知渲染。每次提交后，有状态的前缀只消费匹配的 PTY 回显；任何不匹配的内容均原样渲染。xterm 实例由选定的外观而不是新分配的 palette 所有；resize 和输入处理器使用的会话与终端值来自 refs。对于 Ctrl+C，PTY 后端会验证前台进程组并写入终端控制字节，使终端行规程传递中断并让 Bash 重绘 prompt。其他信号仍直接发送给前台进程组。前端不会在本地绘制 `^C`，而是只渲染一次终端的真实回显。变化的 terminal id 会替换该会话的 Inspector 输出，显式关闭会在 Inspector 卸载前释放两个前端 PTY 引用。

## 曾考虑的替代方案

**每次按键发送一个 RPC。** 否决：`desktop.terminal.send` 是串行的行操作，因此逐键请求不能表示交互式 shell 输入，并会使命令顺序更复杂。

**等待 PTY 回显而不渲染本地输入。** 否决：面向行的传输会给普通输入增加可见延迟，并移除即时终端反馈。

**修改 sanitizer 以保留回车。** 否决：它的输出有意按行规范化。xterm 有支持该表示的设置，从而无需改变其他客户端共享的 runtime 流。

**禁用终端驱动的回显。** 否决：这会改变每个终端消费者的 PTY 行为。桌面 canvas 可以只移除紧接在自身本地回显之后的内容。

## 测试

`apps/desktop/tests/terminal-core.spec.ts` 证明完整、分片和不匹配的本地回显处理。`apps/desktop/tests/terminal-tab.spec.ts` 固定了换行转换、一次初始 prompt 投影、缓冲提交和稳定的 xterm 所有权。聚焦的终端和 Inspector 套件通过。手动打包应用 QA 先显示空命令提交，随后在命令送达后显示重复且缩进的 `echo hello` 输出，接着在 Ctrl+C 后显示缺少返回的 prompt，最后显示 Ctrl+C 信号排在活动终端 send 之后以及可见的 Backspace 控制输入。PTY Ctrl+C 回归测试使用相同的终端控制字节，并确认活动 send 在返回 prompt 处完成；runtime-manager 回归测试证明中断请求会在先前请求仍活动时完成，terminal-tab 测试固定了本地 Backspace 渲染。物理按键路径仍需实时复查。

## 后果

- 在 xterm 中输入的终端命令会以完整命令行到达实时 PTY，且只显示一次。
- 规范化的 PTY 输出在每个新行从第零列开始，包括返回的 prompt。
- Inspector state 更新不会重新创建 xterm viewport 或其输入处理器。
- Ctrl+C 无需等待活动终端 send 的响应即可到达 TTY 行规程，因此 Bash 会回显中断并重绘 prompt。
- Backspace 会删除一个未提交的本地字符，而不会渲染为控制字符。
- 重新打开终端从新 PTY 输出开始，不会报告对旧 PTY 的第二次关闭。
- 当先前 runtime generation 的 live agent 和 PTY 已不存在时，清理操作是幂等的空操作。
- 终端传输和 PTY 所有权保持面向行且不变。
