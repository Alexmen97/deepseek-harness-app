# Agent Note: 桌面端重连唤醒停驻的流

Status: implemented

[English](2026-08-20-desktop-reconnect-wakes-parked-streams.md) | 中文

## 问题

桌面运行时管理器会在启动替换 sidecar 前正确推进 generation，并拒绝仍指向前一 generation 的请求。因此，工作区切换可能与进行中的连接握手竞争：过时的 initialize 请求按预期失败，但其已打开的事件流在等待帧时被本地中止。此变更之前，中止该流不会解析其待处理的等待。上游连接控制器因而无限等待流泵结束，永远不会发起下一次握手；即使替换 sidecar 已存活，应用仍保持断开状态。

## 决策

`DesktopApiClient.openStream()` 现在会通过两种中止来源唤醒停驻的异步流：调用方 signal 与客户端拥有的 generation controller。生成器在下一次循环时观察到中止、完成，并移除两个监听器和自己的帧注册。帧到达也复用同一唤醒路径。Rust 管理器继续拒绝过时 generation；客户端不会自行重试或重新解释过时请求。流的完成仍是让上游连接控制器按其正常重连顺序对当前 generation 发起下一次握手的信号。

## 曾考虑的替代方案

**在 Rust 管理器中接受过时请求。** 否决：请求指定了必须为其提供服务的运行时 generation。接受过时 generation 会削弱 generation 隔离，并可能让替换运行时处理属于其前任的请求。

**由桌面客户端重启上游连接控制器。** 否决：控制器已经拥有连接尝试和重试排序。桌面 carrier 只需让其已中止的流可观察地完成，从而保留现有的所有权划分。

**轮询流的中止状态。** 否决：轮询会为每条事件流加入延迟和计时器生命周期。解析既有的待处理等待是即时的，也没有后台工作。

## 测试

`packages/desktop/desktop-client/tests/carrier.client.spec.ts` 会在 generation 替换前开始一次流拉取，并证明该待处理拉取会完成。配套用例证明调用方中止也会唤醒停驻的拉取。聚焦的 carrier 测试套件以 9/9 通过。

## 后果

- 工作区触发的运行时替换中，若较早的握手因过时而被拒绝，会进入既有的重连路径，不再保持断开状态。
- 过时请求仍在 Rust generation 检查处 fail-closed；协议和运行时管理器行为均未改变。
- 空闲事件流现在拥有两个短生命周期的中止监听器，并会在流完成时移除它们。
