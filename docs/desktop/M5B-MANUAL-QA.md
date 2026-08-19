# M5B.1 — Interactive QA record (macOS arm64, debug build)

Built from origin/main plus the M5B.1 fixes listed under Findings (debug bundle, ad-hoc local). Workspace fixture: /tmp/m4qa-ws (git repo with tracked files, untracked files, ignored *.log + node_modules, a binary, and the same filename in two directories). Provider: dummy DeepSeek key — no real API calls, chat turns intentionally fail. Each item: PASS (manually verified), FAIL, or NOT TESTABLE (with reason).

## Clean file external update

- Open a file in CodeMirror: PASS (src/app.ts opens clean).
- Keep the buffer clean: PASS.
- Modify via the integrated Terminal: NOT TESTABLE as specified — the bundled app could not spawn a terminal (the node-pty spawn helper was missing from the bundle; packaging bug fixed in this session) and terminal output crashes the WebView once a shell does run (pre-existing, see Findings). Used an equivalent external writer (shell outside the app), which exercises the same watcher path.
- Watcher fires and ctx.fs revalidation occurs: PASS (content 4 → 5 auto-adopted with the new FsVersion).
- Editor updates automatically and the tab stays clean: PASS after the M5B.1 fix (initially FAILED: the external reload marked the tab dirty).
- Cursor/selection do not jump unexpectedly: NOT TESTABLE precisely — the accessibility tree cannot read the CodeMirror cursor; selection is clamped and scroll preserved by construction; no visible jump observed.

## Dirty file external update

- Draft remains intact: PASS.
- External-change/conflict state appears: PASS (localized banner and status).
- Save with V1 does not overwrite V2: PASS (save rejected; disk kept V2).
- Reload adopts V2: PASS (content replaced; tab clean).
- Keep Changes preserves the local draft: PASS (banner dismissed, draft kept; a subsequent save is still rejected as stale).

## Delete

- Clean open file deleted externally: PASS (tab stays, deleted state, content kept, no recreation, Save hidden).
- Dirty open file deleted externally: PASS (draft kept, deleted state, no recreation).
- Deleted file reappears: PASS (clean adoption of the new content).

## Rename

- Rename → delete + create: PASS (tab keeps the old path in deleted state; the new path appears in Files; no unsafe path tracking, no content heuristics).

## Quick Open (Cmd+P, real git repository)

- Palette opens: PASS.
- Fuzzy results: PASS (subsequence matching, basename priority).
- Same filename in multiple directories: PASS (README.md vs docs/README.md distinguishable).
- Ignored files behavior: PASS (ignored.log and node_modules absent from the index; untracked non-ignored files present).
- Keyboard navigation / Enter / Escape: PASS.
- Already-open file activates the existing tab: PASS (no duplicate tab).

## Large repository behavior (the harness repo, 7,718 indexed files)

- Index build time: ~1–2 s (git ls-files itself ~0.15 s; build runs on the blocking pool; no main-thread stall).
- Search latency: filtering is instant per keystroke (round-trip dominated by IPC/AX, not the filter); UI stayed responsive.
- UI responsiveness: PASS.

## Files / Changes / Git sync

- Rapid repeated writes (5 appends): PASS — Files and Changes refreshed, git status/diff coalesced (one update, no refresh storm), final state correct (branch, changed-file count, additions/deletions).

## Unsaved quit guard

- No dirty files → normal quit: FAIL — the Cmd+Q keystroke reloads the WebView instead of quitting (no Rust exit path, no dialog, editor state lost). The native menu Quit item works when no guard is armed (app exits, runtime cleaned, no orphan).
- Dirty file → Cancel / Discard and Quit / Save All and Quit / conflict during Save All: NOT TESTABLE — the dialog never appeared in any attempt. Guard arming is confirmed working (desktop.log: quit-guard: armed=true), and the one observed prevention kept the runtime alive, but the frontend dialog path is broken (see Findings).
- Runtime teardown begins only after the user confirms: PARTIAL — when the exit was prevented, no teardown started; the dialog path itself is broken.
- No PTY/runtime orphan: PASS (after clean exits only one runtime instance exists; killed instances leave none).

## Crash / reconnect

- NOT TESTABLE in this session: killing the runtime did not produce a clean observable reconnect (the sidecar did not auto-restart within the observed window and the app process showed unstable relaunch behavior in the same period). The reconcile-after-reconnect semantics are covered by the automated editor-reconcile suite; a re-test on a stable environment is required before M5C.

## Findings (bugs found by this QA)

1. FIXED — highlight.tsx (M4) built an invalid regex: backslash-slash collapses to / in the string value, turning /* into a quantifier-on-nothing; the Inspector crashed at mount in the built app. The token regex moved to a host-safe highlight-core.ts with correct escaping plus a regression spec.
2. FIXED — the inspector store sent generation -1 when installed after the last desktop.status transition; every desktop.fs.* RPC was rejected. Added the runtimeStatus boot anchor and made terminalRequest await it, plus a spec.
3. FIXED — the built app could not spawn terminals: the node-pty spawn helper was not staged into the bundle. ensure-desktop-sidecar.mjs and tauri.conf.json now bundle it.
4. FIXED — the editor was never wired to live watcher invalidation (M5B gap): open buffers did not react to external changes. installFilesync now reconciles affected buffers, plus a wiring spec.
5. FIXED — external reloads marked the tab dirty: the CodeMirror update listener treated programmatic replaces as user edits. Reload dispatches carry a reload annotation and the listener skips them.
6. FIXED — the native quit-guard flag could stay armed across WebView reloads, silently blocking quit. installQuitGuard now re-syncs the guard at boot.
7. OPEN — the quit-guard dialog never appears, and Cmd+Q reloads the WebView (no Rust ExitRequested path, no dialog). Requires WebView console debugging; reproduction steps above.
8. OPEN — terminal output crashes the WebView with a repeated TypeError: null is not an object (evaluating r.type) render loop (pre-existing M4 terminal surface, unrelated to M5B).
9. OPEN — chat turns fail with cannot get property desktopCredentialBridge without inject even with a stored key; likely a composition/wiring issue in the credential bridge; needs a real key to confirm (NOT TESTABLE here).
10. MINOR — after a WebView reload the UI locale briefly flashes to the system language before the pinned preference applies.

## Phase 2 — Flaky full-suite failures: root-cause analysis

Observed: the M5B full Vitest run reported 3 failures — packages/subprocess/subprocess-local/tests/process-exit.spec.ts (30 s timeout on removes an ordinary managed tree after uncaught-exception), scripts/oxlint-contract.spec.ts (8.5 s fix-retry timing), and packages/client/ui-primitives/tests/code-block.client.spec.tsx (6 s grammar load timeout). The same tests passed 33/33 in isolation.

Investigation result: none of the three suites imports M5B code (subprocess-local, scripts, and client/ui-primitives are untouched by M5B/M5B.1). During the failing window the repository was running TWO full Vitest instances concurrently (an accidental duplicate of pnpm run test): the failures all carry hard timeout limits (30 s / 8.5 s / 6 s) that trip under CPU contention. No test-order coupling, no open-handle or PTY leak, and no filesystem race was found in the failing suites or in M5B code. M5B-specific resource hygiene was audited: watcher threads are dropped and joined synchronously with the generation; the filesync/quit-guard installers are idempotent and fully reset in tests; no global timers outlive a spec.

Conclusion: genuine resource pressure from concurrent full-suite runs on a shared machine, not a deterministic bug. One clean, single-instance run of the full suite is the reliability gate to re-run before M5C implementation (CI already runs one instance per runner). No test-isolation code change is justified by the evidence.

## Phase 3 — M5C architecture spike

See docs/desktop/M5C-ARCHITECTURE.md.
