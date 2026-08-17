# Desktop M1B testing

Reference for the M1B test layers: what each layer proves, where it lives,
and the exact commands to run it keylessly. The upstream client suites keep
their own coverage; this page covers only the desktop-owned additions.

## Rust manager tests

apps/desktop/src-tauri/src/manager_tests.rs runs the process owner against
scripted shell stand-ins for the runtime. It covers spawn, graceful stop,
crash restart with a new generation, the 3-per-60s restart budget, oversized
terminated and unterminated stdout frames, malformed frame skipping,
fragmented and multi-frame reads, stale generation rejection, pending
requests failing closed on exit, the uncooperative-process kill ladder,
spawn failure, duplicate ownership, secret redaction, and protocol-mismatch
frames.

```sh
cargo test
```

from apps/desktop/src-tauri, with $HOME/.cargo/bin on PATH. The tests need no
Tauri window: the manager runs over a fake host that records lifecycle
events and drives automatic restarts.

## Carrier tests

packages/desktop/desktop-client/tests/carrier.client.spec.ts pins the
DesktopApiClient transport semantics over a scripted bindings pair: unary
routing with the client rpcId, the respond passthrough, mux streaming with
one onOpen, transport failures, and the carrier timeout.

packages/desktop/desktop-client/tests/overlay.client.spec.tsx pins the
desktop-owned UI: the three onboarding steps, credential and workspace
saving, the connection-state labels, the crash-recovery actions, and picker
cancellation as a non-error.

## Host-equivalent integration

packages/desktop/desktop-client/tests/integration.client.spec.ts runs a Node
harness that owns the packaged runtime stdio exactly like the Rust manager,
then drives DesktopApiClient through a full approved turn, a rejected
approval, and a question flow against the keyless replay fixtures under
packages/desktop/desktop-runtime/fixtures. It skips when
dist-exe/dsh-desktop-runtime-macos-arm64 is not built.

## Keyless CI

All desktop suites run without a DeepSeek API key:

```sh
pnpm exec vitest run packages/desktop packages/credentials/credentials-keychain
pnpm exec tsc -b tsconfig.host.json
pnpm exec tsc -b tsconfig.client.json
```

The replay fixtures cover streamed responses, tool calls, approvals, and
questions. The runtime tests use the same fixtures through
DSH_SNAPSHOT=replay, so no provider call leaves the machine.

## Manual acceptance

The M1B release candidate additionally passes the manual scenarios: fresh
launch with onboarding, a real session with streamed responses and tool
calls, approve and reject paths, a question, persistence across quit and
relaunch, crash recovery in development mode, and Cmd+Q leaving no
dsh-desktop-runtime process behind. Development mode overrides live in
[apps/desktop/README.md](../../apps/desktop/README.md).
