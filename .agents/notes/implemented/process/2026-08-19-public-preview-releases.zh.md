# Agent Note: 无 Apple 凭据的公共预览发布

Status: implemented

[English](2026-08-19-public-preview-releases.md) | 中文

## 问题

桌面分发流水线要求每次发布都使用 Developer ID 签名与公证，但维护者目前没有有效的 Apple Developer Program 账户。因此 GitHub Actions 永远无法产出可下载的 macOS 构件：生产构建按设计 fail-closed，而当时也没有显式的预览路径。CI 图标失败还暴露了另一个缺口：cargo test 在生成的图标存在之前就编译 generate_context!，导致 Rust 测试依赖偶然存在的本地生成文件。

## 决策

发布工作流支持两个显式发布类别，绝不从 push 事件推断。直接推送到 main 不会发布任何内容。

- **production** 保持既有的 fail-closed 契约：Developer ID 签名、公证、装订，从 v* 标签发布为 DRAFT 预发布。缺少签名或公证凭据时，构建在发布前失败。
- **preview**：ad-hoc 签名且未经公证，仅在显式请求时发布：手动触发 release_kind=preview 且 dry_run=false，或显式 v*-preview.* 标签。Release 是标题为 Public Preview — Unsigned / Not Notarized 的 GitHub Pre-release，正文说明仅支持 macOS Apple Silicon、无需 Node、预期出现 Gatekeeper 警告以及仍要打开 操作步骤。绝不暗示 Apple 验证。

预览构件使用版本 v0.1.0-preview.1（每次预览递增），因此预览不会覆盖未来生产版 v0.1.0。发布清单始终声明机器可读的 releaseKind、signing、notarized 字段；预览清单必须声明 signing=adhoc 且 notarized=false，由一致性门禁强制。

Rust 测试资源由 scripts/prepare-desktop-rust-tests.mjs 确定性地暂存，并由 scripts/check-desktop-rust-resources.mjs 守护：该脚本从 tauri.conf.json 派生必需路径，在 cargo test 编译前以可执行的缺失清单失败。生成的图标字节级确定，与已提交的 icon.icns 完全相同。

## 验证

release-workflow vitest 规范断言预览默认值、预览发布条件、fail-closed 生产门禁以及预览清单版本门禁。desktop CI 规范断言 cargo test 之前完成资源暂存，且 checks/preview 作业绝不发布。

## 备选方案

**凭据缺失时发布未签名稳定版。** 否决：这会让用户从文件名推断安全状态，并破坏 fail-closed 生产契约。

**让每次触发默认发布预览。** 否决：预览发布必须保持为显式、经审查的操作。

**跳过图标生成并禁用 Tauri 图标校验。** 否决：这会掩盖真实的打包问题，并使构建依赖偶然状态。

## 后果

- 用户现在即可下载功能完整、标识清晰的预览 DMG；生产公证版本仍是未来路径，且由同一门禁保护。
- 预览与生产构件永不冲突：版本、清单字段、发布类别与 Release 类型均不同。
- Rust 测试不再依赖本地生成文件；干净检出会立即失败并列出缺失资源。

<!-- agent-note-format: alternatives-recorded -->
