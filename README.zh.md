# DeepSeek Harness App

[English](README.md) | 中文

一个基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)构建的开源 macOS 桌面客户端，为 Harness 会话、工具调用、审批、工作区和模型交互提供原生桌面体验。本项目由社区开发，属于非官方项目：与 DeepSeek 无关，也未获得其背书。

![带已打开会话和已完成工具调用的 Harness Desktop](docs/assets/hero.png)

更多视图：[首次运行引导](docs/assets/onboarding.png)、[对话](docs/assets/conversation.png)、[审批](docs/assets/approval.png)、[设置](docs/assets/settings.png)。

## 关于

DeepSeek Harness App 将打包后的 DeepSeek Harness 运行时封装在 Tauri 桌面外壳中。Rust 宿主进程管理运行时，API 密钥保存在 macOS 钥匙串中，会话界面直接复用上游 Harness 客户端。基于 DeepSeek AI 的 DeepSeek Harness 构建。

## 功能

- 首次运行引导与原生工作区选择器
- 会话、流式回复、工具调用、审批与提问
- 通过粘贴、拖放或原生选择器添加图片附件
- API 密钥仅存于 macOS 钥匙串，无明文凭据存储
- 英文与意大利文界面，支持跟随系统
- 英语、中文、意大利语、西班牙语、法语、德语和巴西葡萄牙语界面，支持跟随系统
- 原生菜单、快捷键、通知与关于窗口

## 安装

1. 从 Releases 下载最新 .dmg。
2. 打开 DMG。
3. 将 Harness Desktop 拖入应用程序。
4. 启动应用。
5. 配置 DeepSeek API 密钥。
6. 选择项目。

无需安装 Node。

## 需求

- Apple Silicon 的 macOS
- DeepSeek API 密钥（或兼容的自定义 Base URL）

## 快速开始

首次运行流程见 [docs/USER-GUIDE.md](docs/USER-GUIDE.md)，帮助见[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)。

## 开发

```sh
pnpm install
node scripts/build-exe-for-desktop.ts
cd apps/desktop && pnpm exec tauri build
```

测试层次见 [docs/desktop/M1B-TESTING.md](docs/desktop/M1B-TESTING.md)，开发边界见[CONTRIBUTING.md](CONTRIBUTING.md)。

## 架构

React（复用的 Harness UI）→ DesktopApiClient → Tauri IPC → Rust 运行时管理器 →stdio JSON-RPC → 打包的 Harness 运行时。完整契约见[docs/desktop/ARCHITECTURE.md](docs/desktop/ARCHITECTURE.md)。

## 构建

```sh
pnpm install
node scripts/build-exe-for-desktop.ts
cd apps/desktop && pnpm exec tauri build
node scripts/sign-desktop.mjs --mode adhoc-hardened
node scripts/make-desktop-dmg.mjs
```

公开版本使用 Developer ID 签名、公证并装订；见[docs/desktop/DISTRIBUTION.md](docs/desktop/DISTRIBUTION.md)。

## 安全

API 密钥仅存于 macOS 钥匙串，前端不会读回。WebView 只加载内置内容，外部链接由系统浏览器打开，宿主 IPC 不含通用的执行或文件系统命令。请通过私密漏洞报告渠道提交漏洞（[SECURITY.md](SECURITY.md)）。

## 路线图

见 [ROADMAP.md](ROADMAP.md)。

## 上游

本仓库派生自[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（MIT），固定版本记录于[docs/project/upstream-base.json](docs/project/upstream-base.json)。上游历史完整保留；桌面新增内容与两处上游补丁见[docs/project/REPOSITORY-STRUCTURE.md](docs/project/REPOSITORY-STRUCTURE.md) 与[docs/desktop/UPSTREAM-PATCHES.md](docs/desktop/UPSTREAM-PATCHES.md)。

## 参与贡献

欢迎提交 Pull Request。请阅读[CONTRIBUTING.md](CONTRIBUTING.md) 与[行为准则](CODE_OF_CONDUCT.md)。

## 许可证

MIT。见 [LICENSE](LICENSE) 与[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
