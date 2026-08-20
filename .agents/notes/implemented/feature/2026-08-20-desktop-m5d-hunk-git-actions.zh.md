# Agent Note: 安全的 hunk 级 Git 操作（M5D）

Status: implemented

[English](2026-08-20-desktop-m5d-hunk-git-actions.md) | 中文

## 问题

桌面桥接可以按文件 stage、unstage 或丢弃，但无法按 hunk 操作，因此一个文件内多个独立修改只能全有或全无。安全性是关键：应用前端提供的补丁或过期 hunk 命令可能应用到错误上下文，或越出工作区。

## 决策

Hunk 操作是服务端派生并受 token 保护：前端只发送路径、diff 侧（cached）、hunk 身份和它渲染出的 diff token，绝不发送补丁文本。宿主重新读取当前 diff、校验 token、按内容身份重新识别 hunk，从服务端新 diff 重建补丁，并通过固定 argv 经 stdin 应用：

- Stage Hunk：git apply --cached --recount -
- Unstage Hunk：git apply --cached --reverse --recount -
- Discard Hunk：git apply --reverse --recount -

语义已在真实 git 夹具上验证：三 hunk 中段暂存、取消暂存、丢弃其一；同文件 staged+unstaged；文件名含空格、Unicode、前导连字符；workspace 在仓库根之下。前端在编辑器脏时阻止 Discard Hunk，并对未跟踪、二进制、冲突、重命名、删除及超大 diff 阻止 hunk 操作；新增暂存文件不支持部分取消暂存。

## 验证

Rust 夹具测试覆盖三 hunk 的暂存/取消暂存/丢弃、同文件 staged+unstaged、脏文件、缺失路径、二进制/未跟踪拒绝、怪异文件名及子路径包含。前端测试覆盖路由、脏区阻止、pending 状态和按 hunk 控件。

## 备选方案

**由前端构建并发送补丁。** 否决：存在注入与过期上下文风险；补丁必须由服务端重新派生。

**复用 hunk 数组下标。** 否决：任何应用后下标都会变化；内容身份加 token 才确定。

## 后果

- 按 hunk 的 undo/Unstage/Discard 安全且带类型；过期或外部操作 fail closed。
- 既有文件级操作、FsVersion 安全性和固定 git 表面不变。

<!-- agent-note-format: alternatives-recorded -->
