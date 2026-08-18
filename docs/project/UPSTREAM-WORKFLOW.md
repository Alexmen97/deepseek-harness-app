# Upstream workflow

How the desktop project tracks and upgrades the pinned DeepSeek Harness base. The current checkout derives from commit 99f6f02fecdb7dff40c3fbc9470f5907c29f74ca (0.1.0-rc.7); see docs/project/upstream-base.json, reported by scripts/report-upstream-base.mjs.

## Remote setup (after repository creation)

```sh
git remote rename origin upstream
git remote add origin https://github.com/<owner>/deepseek-harness-app.git
git remote -v
```

Nothing changes in M3: the local checkout keeps its current origin until the public repository exists.

## Upgrading the Harness base

1. Fetch upstream and review the release notes and breaking changes.
2. Rebase or merge the pinned base onto the desktop branch; rebase is the preferred shape for the desktop commit stack.
3. Re-run the desktop contract tests: the keyless vitest suites, the Rust manager tests, and the acceptance suite against the rebuilt runtime.
4. Review the two upstream patches (docs/desktop/UPSTREAM-PATCHES.md): drop each one the new base absorbed, keep the rest minimal.
5. Update docs/project/upstream-base.json (repository, commit, version) and the HARNESS_VERSION constant in apps/desktop/src-tauri/src/manager.rs; the version consistency test fails the build when they drift.
6. Rebuild the runtime executable and the application bundle; run scripts/verify-desktop-release.mjs.

## Branch and tag policy

The desktop project publishes its own tags (v0.1.0, v0.2.0) independent of upstream Harness tags. The public default branch is main; until the repository is created the local branch stays master so upstream tracking is undisturbed, then main becomes the publication branch.
