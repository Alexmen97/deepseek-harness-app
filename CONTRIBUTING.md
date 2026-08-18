# Contributing

English | [中文](CONTRIBUTING.zh.md)

## Requirements

- Node ^22.19 || >=24 with pnpm.
- Rust stable with Cargo (for the desktop crate).
- macOS on Apple Silicon for the full desktop build; tests and typecheck run
  on any supported host.

## Setup

```sh
pnpm install
pnpm exec tsc -b tsconfig.host.json
pnpm exec tsc -b tsconfig.client.json
pnpm exec vitest run packages/desktop packages/credentials/credentials-keychain packages/api/gateway packages/api/remotes apps/desktop/tests
cd apps/desktop/src-tauri && cargo test --lib
```

## Architecture overview

The application reuses the upstream DeepSeek Harness client as a static
bundle over a Tauri IPC bridge: the Rust manager owns the packaged runtime
process, and the desktop wire protocol is the only transport. See
docs/desktop/ARCHITECTURE.md and docs/project/REPOSITORY-STRUCTURE.md.

## Desktop-specific boundaries

- Rust owns the runtime process; the WebView never spawns or kills it.
- The desktop surface adds commands only through the allowlisted host
  surface in apps/desktop/src-tauri/src/commands.rs.
- The two upstream patches live in docs/desktop/UPSTREAM-PATCHES.md; keep
  them minimal and tested.

## Upstream compatibility rule

Do not modify agent-loop, model, or session behavior for desktop-only
features. Changes to upstream packages require a justified upstream patch
with a regression test, documented in docs/desktop/UPSTREAM-PATCHES.md.

## Formatting and lint

Run oxlint with the repository configuration and keep typecheck clean. The
pre-commit hook fixes staged lint and checks whitespace; commit messages
state the behavior changed.

## Commit expectations

Logical boundaries, one change per commit, tests with behavior changes. No
secrets, no generated artifacts, no developer-specific absolute paths.
