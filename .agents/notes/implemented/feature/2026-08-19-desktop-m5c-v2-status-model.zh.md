# Agent Note：桌面端 M5C.1 porcelain-v2 git 状态模型

状态：已实现

[English](2026-08-19-desktop-m5c-v2-status-model.md) | 中文

## 问题

M4 的 Changes 面板通过 porcelain v1（`git status --porcelain=v1`）和单一 unified diff 读取工作区，因此无法区分暂存与非暂存状态，重命名不携带原路径，冲突不可见，也没有支撑 M5C stage/unstage/discard 命令的结构基础。

## 决策

M5C.1 将状态读取替换为 porcelain v2 模型。Rust 宿主运行 `git status --porcelain=v2 -z`（固定 argv，无 shell），并按每种记录类型的固定头部 token 数量解析 NUL 结尾的记录：`1` 在路径前有 7 个 token，`2` 为 8 个加上重命名分数，`u` 为 9 个，`?` 记录中未跟踪路径是其余全部内容。`-z` 契约从不做 C 风格转义，因此路径就是原样的剩余部分，可以包含空格、制表符、换行或非 ASCII 字节；重命名条目把原路径作为独立的 NUL 分块输出，解析在下一轮迭代中消费它。`u`（冲突）条目在 JSON 中标记为 `conflicted: true`，前端不必从 XY 代码推断冲突。宿主仍然从工作区根目录运行 git；porcelain v2 即使从子目录运行也报告仓库根相对路径，变异层（M5C.2+）在任意固定 argv 命令前用 `contained_path()` 对每个 pathspec 重新做工作区根校验。

前端通过纯模型（`inspector/git-model.ts`）投影宿主的 JSON：暂存（XY 的索引侧 X）、非暂存（工作区侧 Y 加上未跟踪）、为只读策略单独保留的未跟踪路径列表，以及只出现在冲突集合中并带徽标的冲突行。Changes 面板从该单一投影渲染 Staged Changes 与 Changes 两个分区；diff 面板在 M5C.4 增加暂存/非暂存选择器之前保持只读。四个新字符串以全部七种语言发布。

## 备选方案

### 为什么不继续解析 porcelain v1 并推断分区？

v1 行格式没有重命名原路径、没有冲突记录，且对含空格的路径有歧义的空格分隔字段；从 v1 代码推断分区会有损，并且每个 M5C 变异命令都需要返工。v2 -z 模型是架构 spike 已经指定的、有文档的、无损基础。

### 为什么不在前端解析 porcelain v2？

宿主拥有 git 并已经拥有窄化的白名单命令面；在宿主解析可以把线缆负载降到最小（结构化 JSON），把引号与 NUL 语义集中在一个经过测试的位置，并符合 M5C 安全模型：任何变异命令之前路径都在 Rust 中校验。

## 后果

- `git_status_v2` 是 Changes 面板唯一的状态来源；M4 的 `git_status`（v1）命令保留兼容，但面板不再调用它。
- 运行时单可执行文件与桌面协议保持不变：v2 命令走现有的 Tauri invoke 面。
- 含空格、换行、制表符和非 ASCII 字节的路径原样往返（NUL 分隔，从不转义）。
- 冲突文件以带徽标的只读行渲染；M5C 不提供冲突解决操作。
- Rust fixture 固定重命名原路径、冲突行、子目录工作区与怪异文件名；Vitest 固定前端分区；七语言 i18n 门覆盖新字符串。
