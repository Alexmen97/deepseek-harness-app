# Repository setup checklist

Settings to apply after the public repository is created. None of these are performed in M3.

- Repository: public, name DeepSeek Harness App, slug deepseek-harness-app, default branch main, description "Open-source macOS desktop client for DeepSeek Harness."
- Topics: deepseek, deepseek-harness, macos, tauri, ai, ai-agent, coding-agent, desktop, open-source.
- Features: Issues enabled, Discussions enabled, private vulnerability reporting enabled, Actions enabled, Dependabot alerts and secret scanning enabled where GitHub offers them.
- Branch protection on main: pull requests required, the public CI checks required, force pushes and deletion prevented. No approval minimum beyond the release environment for a solo-maintainer project.
- GitHub Environment named release with required reviewers and the secrets from docs/project/GITHUB-SECRETS.md.

## Branch protection rationale

main stays green through the public CI checks; force pushes are blocked so history remains the audit trail. The release environment carries the only human-approval gate because that is where credentials and published artifacts live.
