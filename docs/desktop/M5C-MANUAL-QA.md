# M5C manual QA record - Git change management milestones

Scope: the M5C feature surface (porcelain-v2 status, Stage/Unstage, safe Discard, staged/unstaged diff viewer). Each milestone records what was verified interactively and what remains pinned by the automated suites.

## M5C.5 - final interactive QA and preview.2 gate

QA app: `apps/desktop/src-tauri/target/release/bundle/macos/Harness Desktop.app` built at HEAD 5662f9ca2d (0.1.0-preview.1 shape, ad-hoc hardened, arm64). Bundled sidecar runtime + spawn helper verified; node/npm/pnpm not required at runtime; handshake ok (runtime process running, generation 1); no web:error entries in desktop.log.

### PASS (verified)

- App bundle launches; single instance; workspace pref restores; session list loads; Inspector tabs present; runtime Connected.
- Spawn-helper present and executable in the bundle; sidecar used (process is the bundled path).
- No WebView crash and no unexpected console errors in desktop.log during the session.
- PTY leak bug found during QA: repeated `t`-dependent effect re-runs spawned multiple bash children that were never killed; fixed with a stable `t` ref, a spawn-run guard, and an owned-terminal ref that always kills the previous PTY before spawning (TerminalTab.tsx). Verified: with the fix, the runtime holds 0 stray bash children and the spawn/kill log is serialized. Regression test: apps/desktop/tests/terminal-tab.spec.ts.
- Full automated regression after the fix: 844 files / 13716 tests / 0 failed; cargo 64/64; lint, typechecks, i18n 867x7, hardcoded, doc-sync 28/28, packaged runtime acceptance 5/5, spawn-helper gate, preview.1 DMG untouched.

### NOT TESTABLE in this session (accessibility server flaky)

- The computer-use accessibility server was unstable throughout the session (cgWindowNotFound / noWindowsAvailable / timeouts), so interactive click-through of Terminal, Files/Editor, FsVersion conflict, Stage/Unstage/Discard, diff selector, Quick Open, quit-guard, crash/reconnect, and the seven-language visual spot check could not be driven manually. These flows remain covered by the automated suites listed in M5C-TESTING.md; the manual pass must run in a stable environment before preview.2 is published.
- Real provider turn (DeepSeek credential): the user inserted a credential into the Keychain, but a full real chat turn could not be driven without the accessibility server; credential presence confirmed, bridge covered by the automated bridge spec.
