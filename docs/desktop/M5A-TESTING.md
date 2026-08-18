# M5A testing record — editor foundation and the safe filesystem contract

Reference for M5A behavior, authority, and verification. Editor buffers are UI state only; the Harness filesystem service (ctx.fs) remains the single data authority, and every save crosses the versioned desktop protocol into the session-scoped service.

## Write authority

Editor → DesktopApiClient → desktop.fs.write (additive protocol v1) → desktop runtime → ctx.fs of the live session (workspace cwd) → sandbox/policy waterfall → filesystem backend. No generic writeFile, filesystem IPC, shell execution, or Git execution exists on the desktop surface.

## FsVersion semantics

FsVersion is opaque and authoritative; the frontend never parses or synthesizes it. Opening a file yields { path, content, version, metadata }; saving carries the version observed at open (or the last successful save). A stale version is rejected by the backend with FS_STALE_VERSION and never overwrites newer content; the wire carries the stable error code structurally (the packaged closure may hold more than one dsh-fs instance, so instanceof is not used).

## Conflict behavior

Save with a stale FsVersion → conflict state with Reload from disk and Keep editing. Reload discards the local draft and adopts the disk content and its new version. There is no Overwrite-anyway path. Save Copy is not implemented in M5A.

## Editable size limits and binary behavior

Files larger than 512 KiB stay in the read-only viewer. Binary or non-UTF-8 files are rejected by ctx.fs readText and remain in the safe viewer. Unknown text files open as plain text.

## Generation behavior

Every desktop.fs request carries the transport generation; stale-generation requests are rejected by the runtime manager before reaching the filesystem, so a save pending across a runtime restart cannot be accepted by the new generation. The editor marks such failures as save errors.

## Manual QA evidence

M5A automated evidence: server-domain unit tests (stat/read/write/stale/not-found), editor buffer store tests (open/dirty/save/conflict/reload/tab close), and a packaged-runtime integration test (real create, update, and FS_STALE_VERSION rejection with the newer content intact). Manual GUI acceptance of the editor surface is recorded in docs/desktop/M4-MANUAL-QA.md procedure form and remains NOT TESTABLE without GUI automation; the write path itself is verified against the real runtime.
