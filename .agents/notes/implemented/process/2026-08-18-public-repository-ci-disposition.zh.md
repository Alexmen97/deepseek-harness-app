# Agent Note: 公开仓库 CI 处置方案

Status: implemented

[English](2026-08-18-public-repository-ci-disposition.md) | 中文

## 问题

公开仓库继承了为 DeepSeek 组织基础设施编写的上游工作流：企业与自托管 runner 池、组织标签自动化，以及 npm/PyPI 发布机制。在公开仓库触发它们会让拉取请求卡在不可用的 runner 上排队，或因缺少组织设置而失败。

## 决定

公开仓库上运行四个工作流：Desktop（推送到 main 及桌面相关拉取请求；其发布构建仅在拉取请求上运行）、Secret scan、已适配的无密钥 E2E，以及 Desktop release（标签与手动触发，fail-closed）。其余上游工作流通过 GitHub 的工作流禁用设置停用，并保留在源码树中以保存上游历史；docs/project/GITHUB-SETUP.md 记录每个工作流的处置与重新启用条件。main 上的必需检查是桌面 checks 任务与 gitleaks 任务，二者都运行在 GitHub 托管 runner 上且无需凭据。

## 备选方案

### 为什么不把上游工作流改写为 GitHub 托管 runner？

CI 工作流编码了组织故障转移变量、自托管热备演练和 Windows 池；适配它会为桌面仓库分叉一大片上表面却没有桌面收益。

### 为什么不删除工作流文件？

删除会扩大与上游的分歧，并抹去仓库承诺保留的上游历史。

## 后果

- 公开仓库的拉取请求不会再在私有 runner 上排队。
- 公开仓库失去仅上游拥有的验证（Windows 覆盖、沙箱证明、npm 发布演练），这些仍由上游 CI 承担。
- 工作流禁用是仓库设置而非提交的差异；GITHUB-SETUP.md 是持久记录。
