# Agent Note: 桌面引用目录路由

Status: implemented

[English](2026-08-20-desktop-reference-catalog-routes.md) | 中文

## Problem

共享桌面客户端会预热两个会话范围的引用目录：用于斜杠 Skill 候选项的 `skill.list`，以及用于会话树的 `subagent.list`。桌面 JSON-RPC 载体遗漏了这两个 API proxy 路由，因此真实 runtime 显示 `method not found` 连接提示，对应的客户端目录也无法加载。

## Decision

桌面 JSON-RPC server 通过 `SERVED_ROUTES` 提供 `skill.list` 和 `subagent.list`，使用它们的共享请求 schema，并将已验证的请求转发至匹配的 API proxy domain。载体不添加桌面专用引用 API，也不解释任一目录；既有 API proxy 继续解析会话并执行可见性策略。

## Alternatives considered

**禁用桌面引用源。** 否决：这会让共享桌面客户端偏离既有客户端组合，并在未解决载体缺口的情况下隐藏已有界面行为。

**直接从桌面 host 加载 Skill 或 subagent 记录。** 否决：API proxy 拥有会话解析、可用性和过滤。原生读取路径会复制该策略并绕过共享请求验证。

## Testing

`packages/desktop/desktop-jsonrpc-server/tests/dispatch.spec.ts` 通过 stdio JSON-RPC wire 发送两个路由，并证明 server 经由各自的 API proxy domain 转发每个会话范围的 payload 与 response。

## Consequences

- 打包后的桌面客户端可以预热既有 Skill 和 subagent 目录，不再出现连接错误。
- 引用目录的授权和过滤仍由 host 所有，并按会话范围执行。
- Desktop protocol v1 保持通用 API proxy 载体，而不增加并行的原生目录路径。
