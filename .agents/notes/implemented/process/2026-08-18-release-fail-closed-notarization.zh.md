# Agent Note: 标签发布在缺少公证凭据时 fail-closed

Status: implemented

[English](2026-08-18-release-fail-closed-notarization.md) | 中文

## 问题

发布门禁只检查签名证书：有签名凭据但没有公证凭据的标签发布会给应用签名、跳过公证，然后仍然为未公证的 DMG 创建草稿预发布。

## 决定

signing-secrets 任务还会根据 App Store Connect API 密钥三元组或 Apple ID 密码三元组判定 notarized。build 任务在签名或公证凭据缺失时拒绝标签发布——在任何 Release 创建之前；dry-run 触发仍然产出未签名的开发工件且不发布。工作流在签名前用 security find-identity 验证导入的签名身份。

## 备选方案

### 为什么不在签名步骤内以公证成功作为门禁？

sign-desktop 在设计上于凭据缺失时以成功退出，以便 dry-run 完成；工作流级的凭据门禁在不改变 dry-run 行为的前提下保留 fail-closed 规则。

## 后果

- v* 标签无法发布只签名而未公证的 DMG。
- release-workflow 结构规格固定了公证拒绝逻辑。
