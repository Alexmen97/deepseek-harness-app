# Agent Note: Host tsdown 构建面只构建 Host 已产出的包

Status: implemented

[English](2026-08-18-host-tsdown-face-clean-tree-workspace.md) | 中文

## 问题

在干净目录树上，pnpm run build 与 pnpm run typecheck 会在 Host tsdown 阶段失败：工作区列表包含所有包，但仅属客户端的包（例如桌面客户端）要等 Client 聚合运行后才有 lib/types 产物，导致 tsdown 入口解析失败并报 Cannot find entry lib/types/{index,invariant,startup}.js。同样的失败破坏了在全新检出上做类型检查的公开桌面 CI。

## 决定

Host 构建面在配置期根据文件系统推导工作区：vendor/*、apps/cli，以及所有在 tsc -b tsconfig.host.json 之后存在 lib/types 目录的 packages/<group>/<package>。Client 构建面保持完整工作区列表。该过滤与 Host 程序的产物完全一致，因此可被 Host 触达、并为 Host Typert 模型贡献的客户端包仍然会被包含。

## 备选方案

### 为什么不把客户端类型检查提前到 host 打包之前？

Client 聚合导入由 Host tsdown 阶段生成的 typert.remote-client 声明，因此干净目录树上客户端阶段无法先行。

### 为什么不显式列出仅客户端包？

显式排除清单会随包加入 Client 聚合而漂移；存在性检查直接从 Host 产物推导成员关系。

## 后果

- pnpm run build 与 pnpm run typecheck 在干净检出上通过，这是桌面 CI 所需的。
- 该改动作为第三处有意为之的上游补丁记录于 docs/desktop/UPSTREAM-PATCHES.md。
