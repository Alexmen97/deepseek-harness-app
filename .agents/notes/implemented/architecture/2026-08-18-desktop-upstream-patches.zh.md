# Agent Note: 两处桌面上游补丁

Status: implemented

[English](2026-08-18-desktop-upstream-patches.md) | 中文

## Problem

桌面架构需要对上游包做两处小改动，并且这些改动必须随着上游演进保持可审阅、可移除：ConnectionController 的再导出与远程命名空间挂载顺序的修复。

## Decision

packages/client/connection 再导出 ConnectionController，使桌面连接插件能够基于DesktopApiClient 构建相同的 ConnectionHandle，而无需复制该控制器。packages/api/gateway 在命名空间服务自身的 apply 中安装该命名空间的首批方法，使注入远程命名空间的消费者立即看到已挂载的方法；失败批次的回滚路径会撤回部分安装的方法。两者均为增量修改，记录于 docs/desktop/UPSTREAM-PATCHES.md，并各自带有回归测试：gateway.client.spec.ts 中的顺序测试，以及桌面连接插件对被导出控制器的使用（经类型检查并由 carrier 测试覆盖）。docs/project/UPSTREAM-WORKFLOW.md中的升级流程在每次上游基线升级时复查这两处补丁，并删除新基线已吸收的部分。

## Alternatives considered

- **把 ConnectionController 复制进桌面包** —— 拒绝：重复的控制器逻辑会偏离上游的循环语义。
- **用计时等待让命名空间挂载就绪** —— 拒绝：sleep 或重试只是掩盖顺序契约，而不是修复它。
- **整体 fork 这两个包** —— 拒绝：每处补丁只有寥寥数行，fork 会让每次上游升级都变成长期负担。

## Consequences

桌面只保留两处上游文件修改，二者都在升级流程中被点名隔离。若上游日后导出该控制器或采纳顺序修复，下一次基线升级即删除对应补丁，并将所属测试更新为与上游行为一致。
