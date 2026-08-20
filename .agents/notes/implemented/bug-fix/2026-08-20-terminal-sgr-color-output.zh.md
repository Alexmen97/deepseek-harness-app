# Agent Note: 终端输出保留 SGR 颜色序列

Status: implemented

[English](2026-08-20-terminal-sgr-color-output.md) | 中文

## 问题

持久 bash 终端会在桌面终端 canvas 接收 PTY 输出之前对其进行清理。它移除了每一种 CSI 序列，包括 Select Graphic Rendition（SGR）序列，例如 `\x1b[31m` 和 reset `\x1b[0m`。命令能够完成，其可打印文本也会到达，但 ANSI 颜色和样式永远无法在 xterm 中渲染，导致终端不符合交互输出约定。

## 决策

`TerminalSanitizer` 保留最终字节为 `m` 的完整 CSI 序列，并继续移除所有其他 CSI 序列、OSC 序列、短 escape 与 BEL。SGR 只改变文本外观，不会改变光标位置或终端模式，因此现有 xterm canvas 会渲染颜色和样式；行导向传输仍会过滤光标定位、清屏、超链接、剪贴板控制以及私有 prompt 控制标记。

## 曾考虑的替代方案

**透传所有 CSI 序列。** 否决：光标移动、擦除、模式更改和私有控制没有安全的行导向语义，可能使投影后的终端状态产生误导。

**继续剥离 SGR 并记录纯文本输出。** 否决：桌面终端是 xterm 界面，交互 QA 要求 ANSI 颜色。仅纯文本输出会显著降低普通编译器、测试和 git 输出的可用性。

**在运行时重新实现完整终端仿真。** 否决：xterm 已在渲染端拥有终端仿真。运行时只需保留它转发的安全展示序列类别。

## 测试

`packages/terminal/terminal-bash/tests/sanitize.spec.ts` 现在将拆分的红色 SGR 序列与 reset 输入真实 sanitizer，并证明两者均到达输出，同时仍移除自有 OSC prompt 标记。聚焦的 sanitizer 测试套件以 6/6 通过。打包运行时 stdio QA 命令复现了 SGR payload，并验证终端通知会将其带给桌面 canvas。

## 后果

- ANSI SGR 颜色和样式会在集成终端中渲染。
- 非 SGR 的终端控制序列仍被过滤；这不是通用的终端控制透传。
- 拆分序列在最终字节确定其类别前仍保留既有的有界 carry 行为。
