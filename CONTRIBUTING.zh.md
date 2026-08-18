# 贡献指南

[English](CONTRIBUTING.md) | 中文

## 环境要求

- Node ^22.19 || >=24，配 pnpm。
- Rust stable 与 Cargo（用于桌面 crate）。
- 完整桌面构建需要 Apple Silicon 的 macOS；测试与类型检查可在任意支持的主机运行。

## 环境搭建

```sh
pnpm install
pnpm exec tsc -b tsconfig.host.json
pnpm exec tsc -b tsconfig.client.json
pnpm exec vitest run packages/desktop packages/credentials/credentials-keychain packages/api/gateway packages/api/remotes apps/desktop/tests
cd apps/desktop/src-tauri && cargo test --lib
```

## 架构概览

应用把上游 DeepSeek Harness 客户端作为静态包复用于 Tauri IPC 桥之上：Rust 管理器
拥有打包后的运行时进程，桌面 wire 协议是唯一传输。见
docs/desktop/ARCHITECTURE.md 与 docs/project/REPOSITORY-STRUCTURE.md。

## 桌面专属边界

- Rust 拥有运行时进程；WebView 从不派生或杀死它。
- 桌面表面只通过 apps/desktop/src-tauri/src/commands.rs 中允许清单内的宿主命令
  增加能力。
- 两处上游补丁见 docs/desktop/UPSTREAM-PATCHES.md；保持它们最小且有测试。

## 上游兼容规则

不要为桌面专属功能修改 agent-loop、模型或会话行为。对上游包的改动必须是带回归
测试、有充分理由的上游补丁，并记录在 docs/desktop/UPSTREAM-PATCHES.md。

## 格式与 lint

使用仓库配置运行 oxlint，并保持类型检查通过。pre-commit 钩子修复已暂存的 lint
并检查空白；提交信息应说明改变的行为。

## 提交预期

逻辑边界、一次变更一个提交、行为变更带测试。不含密钥、不含生成产物、不含开发者
专属的绝对路径。

## 翻译

应用界面共提供七种完整语言：英语（`en`，桌面自有字符串的规范源）、中文（`zh`，上游字典的键来源）、意大利语（`it`）、西班牙语（`es`）、法语（`fr`）、德语（`de`）和巴西葡萄牙语（`pt-BR`）。只有覆盖率达到 100% 的语言才算受支持：缺失、为空或占位符不一致的字符串都会导致门禁失败。

上游界面文案位于 `packages/client/*` 与 `packages/extensions/ui-cordis` 各包的 `locales.ts` 字典中；桌面自有文案位于 `packages/desktop/desktop-client/src/ui/strings.ts`；原生菜单表位于 `apps/desktop/src-tauri/src/menu.rs`。新增或修改英文或中文字符串时，必须在同一变更中同步更新其他所有语言。`{count}` 之类的占位符必须在每种语言中原样保留。

运行 `pnpm run desktop:i18n:check` 检查键与占位符完整性，运行 `pnpm run desktop:hardcoded-strings` 进行硬编码文案扫描；两者均在 CI 中执行并阻止发布。完整清单见 `docs/desktop/LOCALIZATION-AUDIT.md`。
