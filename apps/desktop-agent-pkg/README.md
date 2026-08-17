# dsh-desktop-agent-pkg

Dependency-only deploy root that defines the runtime closure of the desktop
single executable. This package ships no code: pnpm deploy materializes its
manifest and node_modules into dist-exe/.desktop-staging, and
scripts/build-exe-for-desktop.ts packs that staged tree into
dsh-desktop-runtime with embedded Node via the same sea route the Python SDK
runtime uses. Adding a plugin to the desktop runtime means adding its
workspace dependency here and rebuilding the executable; the closure check
(scripts/verify-runtime-closure.ts) fails the build when a dependency
leaks outside the graph.
