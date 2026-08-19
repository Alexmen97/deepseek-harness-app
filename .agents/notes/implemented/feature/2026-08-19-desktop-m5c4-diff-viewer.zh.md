# Agent Note：桌面端 M5C.4 暂存/未暂存 diff 查看器

状态：已实现

[English](2026-08-19-desktop-m5c4-diff-viewer.md) | 中文

## 问题

M5C.1-M5C.3 可以暂存、取消暂存和放弃，但 Changes 面板只显示一个全局 diff：同时具有暂存与未暂存更改的文件不明确，用户无法回答“将要提交什么？”与“工作区里还有什么？”这两个问题。M5C.4 里程碑增加了按文件的暂存/未暂存 diff 检查，并保证精确的 Git 语义。

## 决策

宿主新增 `git_diff_file(path, cached)`，一个窄化命令，运行 `git diff -- <path>` 或 `git diff --cached -- <path>`（固定 argv、强制 `--`、先做包含校验）。结果携带 diff 文本以及 `tooLarge`（保留现有 512 KiB 上限并报告，绝不静默截断）和 `binary` 标志（从 `Binary files ... differ` / `GIT binary patch` 标记检测；二进制负载绝不渲染）。git 2.50.1 上的 fixture 证据确定了语义：对 index B / worktree C，`--cached` 显示 A->B，普通显示 B->C（绝不在任一侧显示 A->C）；暂存新文件渲染完整新增；未跟踪路径返回空 diff（UI 显示“未跟踪文件 — 没有可用的 Git diff”，不伪造补丁）；删除无需工作区文件即可渲染；按路径的 rename diff 显示为 new-file，因为 git diff 不按路径输出 rename 元数据——porcelain v2 的 originalPath 仍然是 rename 元数据来源，这一点已记录为限制。

前端核心持有仅会话的选择状态：`select(path, from)` 根据点击的区段默认模式（Staged Changes -> staged，Changes -> unstaged），`setMode` 切换选择器，按模式 diff 缓存去重请求。每次 git 操作后的刷新在文件仍存在于另一个区段时保留同一个逻辑文件（必要时切换模式），文件完全消失时丢弃选择——绝不留下死空白面板。diff 面板通过现有统一解析器渲染，并扩展为从 hunk 头（`@@ -a,b +c,d @@`）派生的旧/新行号、当两侧都存在时的紧凑 Staged|Unstaged 选择器、在变更文件间的前一/下一导航、Open File 操作（对未暂存删除禁用）、本地化空状态（无暂存/未暂存更改、过大、二进制、冲突只读）以及仅重命名状态。diff 内容保持不受信任的文本，通过 React 文本节点渲染；不影响 CSP。

## 备选方案

### 为什么用按路径宿主命令而不是复用全局 diff？

全局 diff 无法分离一个文件的暂存与未暂存两侧，需要客户端重新切片；`git diff --cached -- <path>` 是精确的 Git 原语，包含校验、固定 argv 以及上限/二进制标志集中在一个经过测试的位置。

### 为什么保留 512 KiB 上限而不提高？

M4 的上限仍然合适：过大 diff 用本地化消息报告为过大，而不是冻结 UI 或静默截断。解析器每次选择只运行一次，并由模式缓存记忆；对测量到的大小不需要虚拟化或新依赖。

### 为什么 rename 元数据取自 porcelain v2 而不是 diff？

git diff 对单个路径不输出 rename 元数据（显示 new file mode）；仅从 porcelain 重建相似度会重复逻辑且可能与 git 不一致。UI 从模型显示 originalPath 徽标，并在 diff 没有 hunk 时显示仅重命名状态，且限制已记录。

## 后果

- 一个窄化 Tauri 命令；没有通用 git/exec/shell；按路径包含校验；仅 index 的 diff 绝不咨询 watcher（操作后直接刷新）。
- Stage/Unstage/Discard 后的选择连续性：同一个逻辑文件跨区段跟随；否则是确定性的空状态。
- 未跟踪文件不显示伪造 diff；冲突只读渲染，无解决快捷键；二进制负载绝不渲染。
- 14 个新的桌面字符串以全部七种语言发布（867 键 x 7，100% 覆盖）。
- 运行时单可执行文件与桌面协议保持不变；只扩展 Tauri invoke 面。
