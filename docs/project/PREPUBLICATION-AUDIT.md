# Prepublication audit

Reference for the history and content checks run before the repository can go public. The M3 run is recorded here; re-run the commands before publication.

## History-aware searches

```sh
git log -p --diff-filter=A 99f6f02fec..HEAD | grep -nE 'sk-[A-Za-z0-9]{20,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'
git grep -n '/Users/alex'
git grep -n 'ChatGPT'
```

The M3 run found no API keys, private key blocks, certificates, or provisioning material in the desktop commits. The only developer-specific path occurred in the overlay test fixture and was genericized to /Users/example. The ChatGPT occurrences are upstream Agent Notes describing provider behavior, not credentials or local data.

## Working-tree checks

```sh
git status
git diff --cached --check
node scripts/verify-desktop-release.mjs
```

The worktree is clean at each milestone commit, no generated artifacts are tracked, and the bundle verification enforces the license and notice files.

## Automated scanning in CI

The public CI runs gitleaks on every pull request and push; see .github/workflows/secret-scan.yml and the allowlist in .gitleaks.toml. CI scans the working tree of every change; the full-history sweep above remains the prepublication gate. Run the same check locally with
```sh
docker run --rm -v "$PWD:/repo" gitleaks/gitleaks detect -s /repo -c /repo/.gitleaks.toml --no-banner
```
or the gitleaks CLI.
