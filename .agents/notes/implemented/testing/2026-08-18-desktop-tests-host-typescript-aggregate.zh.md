# Agent Note: 桌面应用测试加入 Host TypeScript 聚合

Status: implemented

[English](2026-08-18-desktop-tests-host-typescript-aggregate.md) | 中文

## 问题

apps/desktop/tests 下的桌面应用测试游离在所有 TypeScript 程序之外：Vite 项目只覆盖 src，两个聚合也都不包含这些测试。因此 Oxlint 的类型感知规则在无项目的情况下分析它们，把所有符号视为 error 类型，整仓 lint 在 apps/desktop/tests 上失败，而桌面 CI 的范围化 lint 却通过。

## 决定

apps/desktop/tests/**/*.ts 及被其导入的 apps/desktop/src/boot-guard.ts 归属 host 聚合（tsconfig.host.json），与承载 apps/web/tests 的程序相同。release-workflow 规格通过会抛错的 job() 辅助函数收窄从 YAML 加载的 job，boot-guard 规格改用带花括号的 void 箭头。Oxlint 可执行契约测试固定 apps/desktop/tests 文件解析到 tsconfig.host.json。

## 备选方案

### 为什么不使用独立的 tests tsconfig？

聚合之外的程序不会被仓库 typecheck 门禁检查，而且会重复仓库为应用测试已有的聚合模式。

### 为什么不让这些测试退出类型感知 lint？

排除会掩盖真实的严格模式发现；加入聚合后发现并修复了真实的 YAML job 未定义访问。

## 后果

- pnpm run lint 覆盖整个仓库并通过。
- 桌面测试获得严格类型检查，同一 include 下的新文件自动被覆盖。
