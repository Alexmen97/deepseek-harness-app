# M4 manual acceptance record

Honest M4.1 acceptance record for the M4 coding surfaces. Each row distinguishes manual verification on the real packaged runtime or the real application from automated coverage; a unit or integration test never counts as manual verification, and anything that needs the real DeepSeek API or visual GUI automation is marked NOT TESTABLE.

## Method

- Terminal: a stdio JSON-RPC driver (temporary script, not committed) drove the real packaged runtime (dist-exe/dsh-desktop-runtime-macos-arm64, production cordis.yml) through desktop.initialize, session.create, and every desktop.terminal method against the real bash PTY; output, signals, and scrollback were observed on the wire.
- Application: the real Harness Desktop.app was launched with a workspace in preferences; processes, the runtime sidecar, generation bumps in desktop.log, and process cleanup were observed directly.
- Files/Changes/Plan/Jobs/Subagents: exercised through the real app only where possible without GUI automation and without an API key.

## Results

| Area | Check | Result | Evidence |
|---|---|---|---|
| Terminal | spawn | PASS — manually verified | pty-1 published with motd; capabilities.terminal=true |
| Terminal | interactive input | PASS — manually verified | echo M4QA_HELLO observed in the output stream |
| Terminal | resize | PASS — manually verified | desktop.terminal.resize returned resized=true on the live PTY |
| Terminal | Ctrl+C against a running process | PASS — manually verified | SIGINT delivered=true to sleep 30; no session exit |
| Terminal | shell usable after SIGINT | PASS — manually verified | echo AFTER_SIGINT_OK appeared after the interrupt |
| Terminal | scrollback | PASS — manually verified | desktop.terminal.read returned 9 retained lines |
| Terminal | kill | PASS — manually verified | killed=true; session removed from the registry |
| Terminal | quit cleanup | PASS — manually verified | after desktop.shutdown no dsh-desktop-runtime or --noprofile process remained |
| Files | directory expansion | PASS — automated verification only | cargo tests: listing sorts dirs-first, hides .git, caps entries |
| Files | source file opening | PASS — automated verification only | cargo tests: text preview, binary refusal, size cap |
| Files | in-file search | PASS — automated verification only | FilesTab filter logic covered by component behavior tests |
| Files | Reveal in Finder | NOT TESTABLE | needs visual GUI confirmation; the narrow open -R command is covered by cargo containment tests |
| Changes | modify a workspace file, dirty state, changed file, unified diff, refresh | PASS — automated verification only | cargo fixture tests: clean/dirty/untracked status and diff parsing; rendering covered by diff.spec.ts |
| Plan | real structured plan | NOT TESTABLE | requires a real agent turn (API key); projection store covered by store-core.spec.ts |
| Jobs | real background job | NOT TESTABLE | requires a real agent turn (API key); session/jobs snapshot covered by store-core.spec.ts |
| Subagents | real subagent | NOT TESTABLE | requires a real agent turn (API key); lineage reducer covered by store-core.spec.ts |
| Crash/reconnect | kill runtime with inspector state, new generation, stale rejection, recovery | PASS — manually verified | kill -9 the sidecar: the manager restarted it, desktop.log moved to generation=2, requests kept settling |
| Quit | no runtime/PTY/child process remains | PASS — manually verified | after Cmd-style quit no harness-desktop, dsh-desktop-runtime, or shell process remained |

## Bugs found and fixed during M4.1

1. Boot regression: the Inspector imported xterm at the top of the boot bundle, so the first M4 application build never reached requestRuntimeStart and never spawned the runtime sidecar. Fixed by lazy-loading the Inspector (React lazy + Suspense); after the fix the app spawns the sidecar, survives a kill -9 restart with generation=2, and quits cleanly. Regression evidence: manual launch checks above; the existing boot/carrier tests remain green.

## Still NOT TESTABLE

- Visual GUI acceptance (tab clicks, editor text selection, Finder reveal) without GUI automation.
- Plan/Jobs/Subagents live states without a configured DeepSeek API key; their structured-state stores and renderers are covered by unit tests only.
