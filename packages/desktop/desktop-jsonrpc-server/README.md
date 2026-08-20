# @deepseek-ai/dsh-desktop-jsonrpc-server

Physical carrier plugin for the DeepSeek Harness desktop runtime: it serves the desktop protocol over newline-delimited JSON-RPC on the sidecar's stdio. The web API proxy stays the transport-agnostic gateway face; this plugin wraps ctx.apiProxy exactly like the web fetch handler does, so the desktop wire and the browser wire share handler logic, payload schemas, and error folding.

## Behavior

- The handshake is the first RPC: desktop.initialize validates the workspace cwd, records the route hints, mounts the DeepSeek fallback adapter when the requested provider is unserved, publishes the ready status, and returns identity, versions, and capabilities. Repeating initialize with identical parameters is idempotent; differing parameters fail.
- Apiproxy surface methods (session.list/create/history/models/prompt/selectModel/cancel, workspace.list/create, llm.providers/models, settings.describe/update/replace/mutate, credentials.describe/set/unset) validate payloads with the same zod schemas as the HTTP carrier and invoke the same ApiProxy domain methods. Business failures ride the RpcResult error branch; JSON-RPC errors are carrier failures only.
- The ApiProxy mux and host event streams bridge into events.mux and events.host notifications with frame payloads unchanged. Answerable approval/question frames carry their stable rpcId; the client answers through the unary respond request.
- desktop.shutdown publishes the stopping status, flushes the response, then disposes the complete root runtime and exits 0. Requests after shutdown fail; a second shutdown is a no-op.
- stdout is protocol-only. The plugin writes no logs; the composing tree must not mount a stdout logger. Diagnostics belong to stderr.

## Failure modes

A missing rpcId answers the invalid-request sentinel; a schema failure answers bad-request with the zod issues; an unknown method fails with a method-not-found message (the shared transport reports every handler failure as -32603). A desktop connection that disappears while an approval is pending fails closed: the app bin disposes the root on stdin EOF or signals, and the gateway's teardown settles every pending approval as cancelled.

## Extension points

Capability flags derive from the composed services (approval, userQuestions, attachments) and carrier configuration, never from version numbers. The terminal capability is available through the composed terminal service; the Keychain capability is available only when the host-request bridge is configured.

## Model Experience

None, as the package registers nothing model-facing.

#### KV Cache effect

None; the carrier does not shape provider requests.

## Known Limitations and Deferred Work

- The carrier serves only the methods registered in SERVED_ROUTES; an unregistered method fails with method-not-found.
