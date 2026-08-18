# @deepseek-ai/dsh-desktop-protocol

Shared wire protocol for the DeepSeek Harness desktop runtime. The runtime server plugin serves newline-delimited JSON-RPC on the sidecar's stdio; this package owns the named request, result, and notification types both wire ends speak, the protocol version, and the negotiated-capability vocabulary.

## Wire model

- Requests reuse the web API proxy vocabulary: apiproxy surface methods keep their RpcMethodMap keys ('session.list', 'session.create', 'session.history', 'session.prompt', 'session.cancel', 'workspace.list', 'workspace.create', 'llm.providers', 'llm.models', 'respond'), and desktop-only methods use a 'desktop.' prefix ('desktop.initialize', 'desktop.shutdown', 'desktop.describe').
- Unary params carry a client-minted rpcId beside the payload (DesktopRequestEnvelope); the server echoes it in the result (DesktopResponseEnvelope), preserving the four-quadrant message model of @deepseek-ai/dsh-host-apiproxy over the JSON-RPC carrier.
- Business failures ride the RpcResult error branch; JSON-RPC errors are carrier failures only.
- Notifications carry the web API proxy MuxFrame and HostFrame payloads verbatim ('events.mux', 'events.host') plus the runtime lifecycle frame ('desktop.status').
- Approval and question frames are answerable: the client answers the stable rpcId through the unary 'respond' request, exactly like POST /api/respond on the web surface.

## Versioning

DESKTOP_PROTOCOL_VERSION is an explicit wire version, independent of package semver. The desktop app compares its own compiled version against the handshake's reported protocolVersion and fails with an actionable incompatibility error instead of guessing from version numbers.

## Capabilities

DesktopInitializeResult.capabilities is computed by the server from the services actually composed in the runtime; clients branch on capability flags, never on versions.

## Model Experience

None, as the package registers nothing model-facing.

#### KV Cache effect

None; wire types do not shape provider requests.

## Known Limitations and Deferred Work

- The M1A capability flags 'terminal' and 'keychain' are fixed to false until those domains land.
- The protocol reuses the apiproxy payload types, so a breaking change in @deepseek-ai/dsh-host-apiproxy is a breaking desktop wire change and must bump DESKTOP_PROTOCOL_VERSION.
