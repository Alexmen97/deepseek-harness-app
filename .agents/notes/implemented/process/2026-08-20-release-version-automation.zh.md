# Agent Note: 发布版本自动化（M5C.6）
Status: implemented

[English](2026-08-20-release-version-automation.md) | 中文

## 问题

每次预览发布都需要一次源码提交来修改 .github/workflows/desktop-release.yml 中硬编码的 DESKTOP_PREVIEW_VERSION 常量；发布 v0.1.0-preview.2 时产生了工作流提交 74159ab4。该常量是与标签可能漂移的独立版本来源，并强制每次预览产生一次发布工程提交。

## 决策

scripts/resolve-release-version.mjs 是唯一的规范解析器。它解析标签（vX.Y.Z-preview.N 为 preview，vX.Y.Z 为 production）或手动触发的 release_version 输入（相同语法），并拒绝格式错误的值（缺少 v 前缀、缺少序列号、非法内容）。

- 工作流移除了 DESKTOP_PREVIEW_VERSION；decide 步骤通过解析器为标签推送和手动触发两种情况派生版本与类别。
- 手动触发现在必须提供 release_version；release_kind 必须与版本语法一致（preview 类别需要 preview 版本，production 类别需要 production 版本）。
- 一个解析出的版本驱动 Tauri 构建覆盖、DMG 文件名、.sha256、发布清单、SBOM 与发布标题；不再存在独立的版本字符串。
- check-release-consistency 在设置 DESKTOP_RELEASE_TAG 时校验清单与解析出的标签/类别一致，并强化生产路径：production 清单必须声明 developer-id 签名且 notarized=true。
- 发布作业拒绝已存在的标签或发布（Refuse duplicate tag 步骤），已发布的预览不能被静默覆盖。

## 验证

scripts/resolve-release-version.spec.ts 覆盖标签解析、畸形标签、手动版本与产物命名；scripts/desktop-release-workflow.spec.ts 固定工作流结构（无预览常量、release_version 必填、解析器使用、Tauri 版本传播、重复标签保护）。使用 0.1.0-preview.99 的合成 dry-run 生成 app、DMG、SHA、清单与 SBOM，全部一致并通过一致性检查，未创建 Release。

## 备选方案

**保留硬编码常量并在每次发布时递增。** 否决：强制每次发布一个工程提交，且允许常量与标签漂移。

**继续使用旧的子串匹配推断类别。** 否决：解析器使用完整语法，拒绝畸形输入而非猜测。

## 后果

- 预览标签或显式触发版本成为唯一的发布版本输入；无需再维护工作流常量。
- 非法版本在构建开始前快速失败。
- 已发布版本必须显式删除才能重新发布。

<!-- agent-note-format: alternatives-recorded -->
