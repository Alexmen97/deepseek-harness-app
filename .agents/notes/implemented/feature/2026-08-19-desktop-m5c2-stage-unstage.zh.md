# Agent Note：桌面端 M5C.2 按文件暂存与取消暂存

状态：已实现

[English](2026-08-19-desktop-m5c2-stage-unstage.md) | 中文

## 问题

M5C.1 让 Changes 面板只读：它渲染 porcelain-v2 模型并拆分 Staged/Changes，但没有办法在 worktree 与 index 之间移动文件。Stage/Unstage 必须窄化、类型化并且安全：只用固定 argv 的 git 命令，不用 shell，不用通用 exec，即使仓库根位于所选工作区之上也要强制工作区包含校验，并且绝不静默保存脏编辑器缓冲区。

## 决策

宿主新增两个 Tauri 命令 `git_stage_file` 和 `git_unstage_file`，都接收一个仓库相对路径（v2 模型的原生形式）。Stage 运行 `git add -A -- <path>`；需要 `-A` 变体，因为普通 `git add -- <path>` 会拒绝已删除的工作区文件，而 M5C.2 明确要求暂存删除；对其他状态两者完全相同。Unstage 用 `git rev-parse --verify --quiet HEAD` 检查 HEAD（在无提交仓库中退出码为 1，绝不从 stderr 文本推断），然后运行 `git restore --staged -- <path>`（git >= 2.23），或在无提交仓库中运行 `git rm -q --cached -- <path>`。所有 argv 固定；`--` 分隔符始终存在；git 相对于工作目录解析 pathspec，因此 argv 携带工作区相对路径，而 `contained_git_path`（一种容忍缺失路径的包含校验变体，用于暂存删除）执行规范包含校验。

路径转换是单一显式层：`workspace_rel_for` 通过剥离仓库根前缀（两侧都规范化；git 的 --show-toplevel 会解析符号链接，如 macOS 上 /var -> /private/var），把仓库相对模型路径转换为工作区可见相对路径，并在任何 git 变异之前用 PATH_OUTSIDE_WORKSPACE 拒绝工作区之外的路径。v2 状态响应现在携带 `workspacePrefix`，前端据此派生每行的工作区可见路径和 insideWorkspace 标志。冲突（`u`）行以 UNSUPPORTED_GIT_STATE 拒绝两个命令，因为在冲突路径上执行 `git add` 会暂存一个解决方案。

前端新增纯操作核心（`changes-core.ts`），带按文件的 pending 状态（idle/staging/unstaging）、类型化错误、重复点击阻止，以及每次成功操作后对 status+diff 的服务端确认刷新；工作区 watcher 不被当作 index 变更的权威。Changes 标签渲染紧凑的 Stage/Unstage 按钮，仅由 porcelain 状态（`actionsFor`）派生；当编辑器持有未保存更改时在 Stage 上显示本地化脏缓冲区警告（绝不 Save+Stage；Unstage 绝不触碰编辑器）；并显示本地化错误行。Git 版本兼容性：`git restore --staged` 需要 git >= 2.23；当前 macOS 目标自带 2.50.1。

## 备选方案

### 为什么用 `git add -A -- <path>` 而不是 `git add -- <path>`？

简报指定了 `git add -- <path>`，但 fixture 证据表明它在已删除的工作区文件上失败（“pathspec did not match any files”），而 M5C.2 明确要求暂存删除。带显式 pathspec 的 `-A` 对其他每个状态都相同，并且保持带强制 `--` 的固定 argv。

### 为什么不用 `git reset -- <path>` 兼容旧 git？

`git reset` 的语义比 unstage 更宽（它可以移动 HEAD），需要仔细论证；`git restore --staged` 是窄化的仅 index 操作，且简报禁止仅为兼容引入 reset。macOS 目标的 git（2.50.1）支持 restore；过旧的 git 会以 GIT_OPERATION_FAILED 大声失败，而不是静默回退。

### 为什么不在前端转换路径？

宿主已经拥有 git 和包含校验；单一 Rust 转换层把仓库根前缀逻辑集中在一个经过测试的位置，并避免 UI 中出现第二个相互竞争的路�径模型。前端只从 `workspacePrefix` 派生显示/包含标志。

## 后果

- 两个窄化 Tauri 命令；不存在通用 git/exec/shell 面。所有 git 状态在操作后直接刷新（绝不用伪造的 watcher 事件）。
- 已删除文件暂存其删除并可取消暂存而绝不重新创建；重命名取消暂存遵循 git 自身的语义（原路径的暂存删除加上新路径回到未跟踪），有文档和 fixture 测试。
- 未跟踪文件暂存为 A.，取消暂存回到 ??；M5C.2 中不存在删除操作。
- 无提交仓库通过 `git rm -q --cached -- <path>` 取消暂存，HEAD 检查是显式判别器。
- 类型化错误类别（GIT_NOT_FOUND、NOT_GIT_REPOSITORY、PATH_OUTSIDE_WORKSPACE、PATH_NOT_FOUND、UNSUPPORTED_GIT_STATE、GIT_OPERATION_FAILED、WORKSPACE_UNAVAILABLE）以序列化结构传输；原始 stderr 只作为经过清理和截断的技术细节出现。
- 7 个新的桌面字符串以全部七种语言发布（844 键 x 7，100% 覆盖）。
- 运行时单可执行文件与桌面协议保持不变；只扩展 Tauri invoke 面。
