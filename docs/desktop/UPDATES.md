# Desktop update architecture (design)

Design record only; no updater ships in M2.

## Chosen model

The future M3 updater is the Tauri updater: a signed update manifest served
over HTTPS, per-platform artifacts, and a public/private signature pair. The
manifest carries version, artifact URLs, hashes, and the signature. The
desktop app holds only the public key; the private key never leaves the
release environment.

## Compatibility model

Two independent compatibility axes:

- Desktop compatibility: the app's own schema and prefs must remain
  backward-compatible; prefs.json stays additive (new keys default).
- Harness runtime compatibility: the desktop pins the harness release it was
  built against (the HARNESS_VERSION constant, verified against the
  repository root package.json). An update manifest entry names the runtime
  it bundles; a mismatched protocol version must refuse to start, matching
  the current handshake contract.

## Rollback

Updates keep the previous version installable: the DMG remains the fallback
artifact, and the updater never deletes the currently-running bundle before
the replacement verifies (hash + signature) on disk. A failed update leaves
the running version untouched.

## Not in M2

No production updater, no auto-update, no public release publishing.
