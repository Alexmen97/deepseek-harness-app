# Repository setup checklist

Settings to apply after the public repository is created. None of these are performed in M3.

- Repository: public, name DeepSeek Harness App, slug deepseek-harness-app, default branch main, description "Open-source macOS desktop client for DeepSeek Harness."
- Topics: deepseek, deepseek-harness, macos, tauri, ai, ai-agent, coding-agent, desktop, open-source.
- Features: Issues enabled, Discussions enabled, private vulnerability reporting enabled, Actions enabled, Dependabot alerts and secret scanning enabled where GitHub offers them.
- Branch protection on main: pull requests required, the public CI checks required, force pushes and deletion prevented. No approval minimum beyond the release environment for a solo-maintainer project.
- GitHub Environment named release with required reviewers and the secrets from docs/project/GITHUB-SECRETS.md.

## Branch protection rationale

main stays green through the public CI checks; force pushes are blocked so history remains the audit trail. The release environment carries the only human-approval gate because that is where credentials and published artifacts live.

## Public CI on main

Pushes to main run the secret scan and the real-API e2e workflow. The e2e workflow skips its build and suite with a warning while the repository secret DEEPSEEK_API_KEY_EXTERNAL is unset, and runs them with the key once the secret exists. The upstream workflows whose push triggers name master (ci, sandbox, release, release-vendor, landlock-run, docs-pages) do not trigger on main; their pull-request triggers may reference upstream organization runner pools and are not adapted for public pull requests. Required status checks in the branch ruleset stay unset until the public CI check names are decided.

## Applied at first publication

The public repository https://github.com/Alexmen97/deepseek-harness-app was created empty and received the complete local history on main. Enabled: Issues, Discussions, private vulnerability reporting, Dependabot alerts, and secret scanning with push protection. The topics are the nine listed above. The ruleset protect-main prevents force pushes and deletion on main, with always-bypass for the maintainer; required status checks stay unset until public CI check names are decided. The environment release requires Alexmen97 as reviewer and permits self-approval because no second maintainer exists.
