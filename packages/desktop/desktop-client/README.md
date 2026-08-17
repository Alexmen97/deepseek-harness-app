# @deepseek-ai/dsh-desktop-client

The client face of the desktop transport: the DesktopApiClient carrier
implementing the upstream AbstractApiClient contract over the Tauri IPC
bridge, the desktop connection plugin that provides the upstream
ConnectionHandle, the native workspace-picker occupant for the two
directory-flow holes, the desktop host capabilities wrapper, and the
onboarding/settings surfaces.

## Contract

DesktopApiClient preserves every upstream invariant — rpcId minting, the
four-quadrant envelopes, zod parsing, timeouts, respond receipts — and
implements only the transport aspects: doFetch routes /api/<method> through
one typed rpc_request, and the mux/host stream openers subscribe to
generation-scoped runtime frames. The runtime refuses business routes until
desktop.initialize completes, so the client performs that handshake lazily
from the saved workspace preference; a generation transition drops stale
frames and forces re-initialization.

The bindings pair (transport + host) is installed once by the app entry;
tests install scripted fakes through the same installDesktopBindings seam.

## Limitations

The desktop transport serves no generic logical RPC channels yet; the
connection plugin answers those calls with a rejection. The attachment
adapter is deferred while the runtime reports attachments: true.
