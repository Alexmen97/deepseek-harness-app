# Desktop JSON-RPC — RPC mapping

Reference for the desktop wire contract: every desktop method against the
existing web API proxy, its types, the harness service it reads, and the
implementation strategy. Strategies: `REUSE` (same types and same handler
logic), `ADAPT` (same vocabulary, different carrier or a thin wrapper), `NEW`
(no upstream equivalent). The desktop transport is a physical carrier over
`ctx.apiProxy` ([`packages/host/apiproxy`](../../host/apiproxy/README.md)); it
never re-implements handler logic that already lives behind that service.

## Unary requests

| Desktop method | Existing apiproxy RPC | Existing types | Harness service/context | Strategy |
|---|---|---|---|---|
| `desktop.initialize` | none (SDK has `initialize`) | `InitializeParams`/`InitializeResult` in `@deepseek-ai/dsh-desktop-protocol` | process environment, `ctx.llm` adapter probe, composed services for capabilities | NEW |
| `desktop.shutdown` | none (SDK has `shutdown`) | `ShutdownParams` in `@deepseek-ai/dsh-desktop-protocol` | root context fiber | NEW |
| `desktop.describe` | none | `DesktopRuntimeDescription` in `@deepseek-ai/dsh-desktop-protocol` | runtime info provider, `ctx.apiProxy.host.describe` | NEW |
| `host.describe` | `host.describe` | `HostApi['describe']`, `hostDescribeRequestSchema` | `ctx.apiProxy.host` | REUSE |
| `session.list` | `session.list` | `SessionsApi['list']`, `sessionListRequestSchema` | `ctx.apiProxy.sessions` | REUSE |
| `session.create` | `session.create` | `SessionsApi['create']`, `sessionCreateRequestSchema` | `ctx.apiProxy.sessions` | REUSE |
| `session.open` | none | — | — | not implemented: opening a known id is `session.create` with an explicit `sessionId` (idempotent adoption + cold resume in the same handler) |
| `session.history` | `session.history` | `SessionsApi['history']`, `sessionHistoryRequestSchema` | `ctx.apiProxy.sessions` | REUSE |
| `session.prompt` | `session.prompt` | `SessionsApi['prompt']`, `sessionPromptRequestSchema` | `ctx.apiProxy.sessions` | REUSE |
| `session.cancel` | `session.cancel` | `SessionsApi['cancel']`, `sessionCancelRequestSchema` | `ctx.apiProxy.sessions` | REUSE |
| `workspace.list` | `workspace.list` | `WorkspaceApi['list']`, `workspaceListRequestSchema` | `ctx.apiProxy.workspace` | REUSE |
| `workspace.create` | `workspace.create` | `WorkspaceApi['create']`, `workspaceCreateRequestSchema` | `ctx.apiProxy.workspace` | REUSE |
| `llm.providers` | `llm.providers` | `LlmApi['providers']`, `llmProvidersRequestSchema` | `ctx.apiProxy.llm` | REUSE |
| `llm.models` | `llm.models` | `LlmApi['models']`, `llmModelsRequestSchema` | `ctx.apiProxy.llm` | REUSE |
| `respond` | `POST /api/respond` | `ClientResponse`, `RpcReceipt`; `approvalResponsePayloadSchema`, `questionResponsePayloadSchema` | `ctx.apiProxy.respond` | REUSE |

`session.open` has no separate implementation because the apiproxy `create`
handler already adopts an existing persisted session and resumes its agent
(`packages/host/apiproxy/src/api-proxy.ts`, `ensureSession`). A desktop client
opens a session by calling `session.create` with the recorded `sessionId` and
the same `cwd`; a wrong `cwd` answers `session-conflict`, which is the
authoritative open/ownership check.

## Notifications (server to client)

| Desktop notification | Existing stream | Existing types | Source | Strategy |
|---|---|---|---|---|
| `events.mux` | `EventsApi.mux` stream | `RpcRequest<MuxFrame>`: `session/event`, queue snapshots, tool views, `approval/requested`, `question/requested`, projections, jobs, `stream/error` | `ctx.apiProxy.events.mux` AsyncIterable bridged to JSON-RPC notifications | ADAPT (carrier bridging only; frame payloads unchanged) |
| `events.host` | `EventsApi.host` stream | `RpcRequest<HostFrame>`: session added/removed/status, agent errors, workspace changes | `ctx.apiProxy.events.host` AsyncIterable bridged to JSON-RPC notifications | ADAPT (carrier bridging only; frame payloads unchanged) |
| `desktop.status` | none | `DesktopStatusNotification` in `@deepseek-ai/dsh-desktop-protocol` | server plugin lifecycle | NEW |

Answerable frames (`approval/requested`, `question/requested`) keep their
stable `rpcId`; the client answers through the unary `respond` request, so the
four-quadrant model of [`rpc.ts`](../../host/apiproxy/src/api/rpc.ts) survives
the carrier swap unchanged. The `events.mux` open replay (pending approvals
and questions re-pushed with the same `rpcId`) is re-established by
re-subscribing after reconnection, exactly like the web client re-opens its
streams.

## Validation and error folding

The desktop carrier validates every unary payload with the same zod schemas
the HTTP carrier uses (`packages/host/apiproxy/src/api/*.schema.ts`, exported
through the `@deepseek-ai/dsh-host-apiproxy/api/*` subpaths) and invokes the
same `ApiProxy` domain methods. Business failures stay inside the
`RpcResult` error branch (`ok: false`); JSON-RPC-level errors (`-32601`
unknown method, `-32603` handler crash) are carrier failures folded with
`transportError`. A client can therefore share the web client's result-folding
path without a semantic conversion.

## Capability composition

`ApiProxyService` requires a composed set of services
(`agentDefaultModel`, `agents`, `attachments`, `directoryPicker`, `llm`,
`sessions`, `subagents`, `sessionQuery`, `tools`, `userQuestions`,
`workspaceRegistry` — [`packages/host/apiproxy/src/index.ts`](../../host/apiproxy/src/index.ts)).
The desktop runtime composition in
[`packages/desktop/desktop-runtime/runtime/cordis.yml`](../../desktop/desktop-runtime/runtime/cordis.yml)
mounts every one of them plus the spine, so the desktop carrier reuses the
same gateway service the web host uses.
