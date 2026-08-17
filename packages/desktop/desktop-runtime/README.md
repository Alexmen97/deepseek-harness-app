# @deepseek-ai/dsh-desktop-runtime

Desktop runtime app: the closed runtime composition the macOS desktop client
spawns, the runtime identity provider, and the bins that boot it. The
packaged single executable embeds Node and every plugin in the composition,
so a clean Mac needs no Node, pnpm, or Homebrew.

## Composition

runtime/cordis.yml mounts the agent spine, the DeepSeek adapter, JSONL session
persistence, the sandbox/approval policy, the local bash and filesystem
providers, settings and credentials, the workspace registry, the subagent
registry, the native directory picker, the API gateway, and the desktop
JSON-RPC server. The deployment seams are environment variables:
DSH_CORDIS_CONFIG (config path, required), DSH_SNAPSHOT (replay overlay),
DSH_SESSION_ROOT, DSH_CWD, DSH_HOME, DSH_PERMISSION_MODE.

runtime/cordis.snapshot.yml is the keyless replay overlay: it disables the
DeepSeek adapter and inserts llm-replay, serving recorded JSONL fixtures
without a key or network. The acceptance tests drive the packaged executable
through this overlay.

## Bins

dsh-desktop-runtime boots an external configuration whose plugin packages the
configuration project owns. The packaged runtime uses packaged-bin.ts, which
resolves bare plugins from the installed runtime closure while relative
plugins remain configuration-relative. stdin EOF and SIGTERM/SIGINT dispose
the root to quiescence; stdout carries only JSON-RPC frames.

## Credentials

M1A passes DEEPSEEK_API_KEY through the launching environment (temporary;
see docs/desktop/CREDENTIALS.md). The runtime stores no credential in its
settings or credential documents, and a test pins that credential-shaped
values never appear in transport output.

## Model Experience

The composition owns the persona and the tool catalog the model sees; the
transport layers add nothing model-visible.

## Known Limitations

- One sidecar serves one workspace root (the launch cwd pins the sandbox
  policy); multi-workspace support belongs to the desktop host layer.
- The interactive terminal domain and keychain credentials are not mounted;
  the handshake reports those capability flags false.
