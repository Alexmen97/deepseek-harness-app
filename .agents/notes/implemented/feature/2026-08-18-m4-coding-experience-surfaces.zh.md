# Agent Note: M4 编码体验界面

Status: implemented

[English](2026-08-18-m4-coding-experience-surfaces.md) | 中文

## 问题

Harness Desktop 此前以对话为主：文件、工作区变更、终端、计划、任务与子代理都没有专属桌面界面，而运行时架构禁止通用的文件或进程 IPC。

## 决定

桌面覆盖层新增可折叠的 Inspector，包含六个分区。Files 与 Changes 使用受限的只读宿主能力（fs_list、fs_read_text、reveal_in_path、git_status、git_diff），并限定在工作区范围内；Terminal 是通过新的 desktop.terminal.* 协议方法、由运行时组合中挂载 bash PTY 后端的 Harness 终端服务提供的 xterm 前端；Plan、Jobs 与 Subagents 渲染 events.mux 帧中的结构化上游状态（session/projection 计划投影、session/jobs 快照、session/event 中的子代理谱系）。仅打开的标签页与可见性持久化在 prefs.json。终端 seam 增加可选 resize 成员（上游补丁之四）。

## 备选方案

### 为什么不通过 Harness 服务访问文件与 git？

Harness 文件系统与子进程服务是代理执行界面；查看器不需要其权限模型，通过新 RPC 暴露它们会比有界宿主目录列举更扩大协议面。

### 为什么不从助手文本推断计划？

只渲染结构化的计划投影；从文本推断会凭空生成会话日志并不拥有的状态。

## 后果

- WebView 没有获得任何通用的读、写或进程执行原语；每个新界面都限定在工作区内且只读。
- 42 条新桌面字符串以全部七种语言发布，覆盖率门禁保持不变。
- 测试固定了宿主路径约束与上限、diff 解析器，以及包含代际隔离的投影存储。
