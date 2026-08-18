# Agent Note: 公共仓库身份与发布决策

Status: implemented

[English](2026-08-18-public-repository-and-release-decisions.md) | 中文

## Problem

桌面应用需要公共身份和发布流水线，同时必须保持明确的非官方定位。仓库形态、命名、许可、产物命名和发布状态等决策，每一项都存在一旦首次公开下载后难以逆转的替代方案。

## Decision

公共项目是一个独立的 GitHub 仓库，名为 DeepSeek Harness App（slugdeepseek-harness-app），派生自固定版本的上游检出，完整保留上游历史，并将上游远端保留为 upstream。应用继续使用临时名称 Harness Desktop，避免未经许可将 DeepSeek 商标用作应用名称；仓库名称承担产品身份。整个项目保持 MIT，保留上游 LICENSE 与 THIRD_PARTY_NOTICES.md，并在docs/project/LICENSE-AUDIT.md 中记录 libvips 的 LGPL 义务。公共产物命名为DeepSeek-Harness-App-v<version>-macOS-arm64.dmg，附 SHA-256 校验和与机器可读发布清单；首个公开发布标记为 Pre-release。Mac App Store 不属于产品战略；Developer ID 签名与公证仅服务于直接的 GitHub Releases 分发。

## Alternatives considered

- **作为 deepseek-ai/deepseek-harness 的 GitHub fork** —— 拒绝：fork 关系会向桌面用户呈现引擎的身份、标签与 README，并让独立发布、讨论和议题流程变得复杂。
- **把应用改名为 DeepSeek Harness App** —— 目前拒绝：应用名与 Dock 中的商标会被读作官方背书；改由仓库名承担身份。
- **压缩为单个初始提交** —— 拒绝：保留上游历史既保留署名，也让未来的上游合并与 blame 可用。
- **自定义许可证** —— 拒绝：MIT 与上游一致，且没有任何捆绑依赖阻止整个项目保持 MIT。
- **将 0.1.0 标记为稳定版** —— 拒绝：引擎仍处于开发者预览期，破坏性变更可预期，因此首个桌面发布是 Pre-release。

## Consequences

仓库可以无 fork 关系地创建与发布，标签和发布完全独立。应用名称保留为已知的开放事项，仅在获得商标许可后重新评估。每次发布在 DMG 内附带许可证与通知文件，发布流水线拒绝在缺少 Developer ID 签名与公证时发布稳定版 DMG。
