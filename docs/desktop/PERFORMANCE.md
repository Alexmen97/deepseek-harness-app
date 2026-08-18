# Desktop performance baseline

Reference baseline recorded on the M2 build machine (Apple Silicon, macOS 26, release bundle, ad-hoc hardened signature). Re-measure before each release and treat these numbers as ceilings, not targets.

## Startup

- App process after open: ~0.1 s
- Runtime sidecar spawned: ~2.4 s (frontend boot plus invoke round trip)
- Runtime startup to JSON-RPC handshake: 275 ms (acceptance suite)
- First usable shell with session list: ~5 s (screenshot-verified)

## Idle memory

- App process (WebKit shell): ~110 MB RSS
- Harness runtime (Node SEA): ~178 MB RSS

## Notes

The first session list render and the first conversation render are bounded by the runtime's session projection, not by the desktop layer; the desktop adds one IPC hop per unary call and a direct event subscription for streams. No optimization work happened in M2 beyond stripping production source maps from the frontend bundle (12 MB binary including embedded assets).
