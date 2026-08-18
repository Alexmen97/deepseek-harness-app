# Upstream patches carried by the desktop client

Every modification outside the desktop-specific packages, with its justification and the plan if upstream adopts it.

## packages/client/connection/src/client/index.ts

Patch: one additive re-export, export { ConnectionController } from './connection.ts'. The web plugin constructs its own ConnectionController inside its apply, so the controller was package-internal; the desktop connection plugin needs the same controller class to build the identical ConnectionHandle over DesktopApiClient without copying it.

Effect if upstream exports it later: the re-export line becomes a duplicate export of an already-public symbol and can be dropped; nothing else changes. Upstream PR candidate: expose ConnectionController from the package root.

## packages/api/gateway/src/client/index.ts

Patch: namespace method batches install inside the namespace service's own apply instead of after it, so a consumer that injects a remote namespace always sees the mounted methods (the M1B syncInspectManifest race). The rollback path withdraws partially-installed methods on a failed batch. Regression test: gateway.client.spec.ts, 'installs a namespace batch before the namespace service becomes visible'. Upstream PR candidate: the same ordering fix in ClientRemoteService.

## tsdown.config.ts

Patch: the Host build face filters its workspace to the packages whose lib/types the Host TypeScript pass emitted, instead of building every workspace package. On a clean tree the previous workspace list included client-only packages (for example the desktop client) whose lib/types only the Client aggregate emits, and the Host entry resolution failed. The Client face keeps the full workspace list unchanged.

Effect if upstream adopts it: identical filter; the desktop-specific reason (client-only desktop packages joined the Client aggregate) disappears but the clean-tree failure affects any client-only package, so the filter remains correct. Upstream PR candidate: the same exists-based Host workspace filter.

No other upstream file is modified.
