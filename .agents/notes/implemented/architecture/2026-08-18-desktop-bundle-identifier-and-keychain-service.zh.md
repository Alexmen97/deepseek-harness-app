# Agent Note: 桌面端 Bundle Identifier 与钥匙串服务

Status: implemented

[English](2026-08-18-desktop-bundle-identifier-and-keychain-service.md) | 中文

## 问题

临时 bundle identifier `com.deepseek.harness.desktop` 把 deepseek 反向域名权威放在了并不控制该域名的社区项目上。该 identifier 还派生 Application Support 目录（日志、偏好设置、会话）与钥匙串服务命名空间，因此首次公开发布后再修改会搁置用户数据。这一待决事项记录于 docs/desktop/BRANDING.md 与 docs/project/BRANDING-AND-TRADEMARK.md，当时 GitHub owner 尚未确定。

## 决定

公开 bundle identifier 为 `io.github.alexmen97.harness-desktop`：它是维护者控制的 GitHub Pages 命名空间 `io.github.alexmen97` 的反向域名，并与应用名称 Harness Desktop 一致。钥匙串服务使用同一字符串（apps/desktop/src-tauri/src/manager.rs），凭据命名空间随应用身份一起迁移。重命名在首次公开发布之前落地，当时不存在公开用户数据。

## 备选方案

### 为什么不保留 com.deepseek.harness.desktop？

deepseek 反向域名权威意味着社区项目并不拥有的域名所有权；该 identifier 会显得具有官方关联，而日后修改会把用户数据搁置在 Application Support 与钥匙串中。

### 为什么不使用单独注册的域名？

决策时维护者没有自有域名。`io.github.<owner>` 是每个 GitHub 账号通过 GitHub Pages 控制的命名空间，无需注册即可满足由维护者控制的反向域名要求。

## 后果

- `~/Library/Application Support/com.deepseek.harness.desktop` 下的预发布开发数据不迁移；使用新 identifier 的首次构建从全新的日志、偏好设置与会话开始。
- 退役钥匙串服务下的预发布 `DEEPSEEK_API_KEY` 条目成为登录钥匙串中的孤儿，仍可通过“钥匙串访问”找回；密钥在设置中重新输入一次。
- identifier 与钥匙串服务在首次公开发布后不得再变更：Application Support 路径、钥匙串条目与 Gatekeeper 身份均派生自它们。
