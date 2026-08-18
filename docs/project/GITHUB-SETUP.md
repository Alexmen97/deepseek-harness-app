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

Pushes to main run the desktop validation workflow, the secret scan, and the real-API e2e workflow. The desktop validation workflow runs its checks job on pushes to main and on pull requests touching desktop paths; its unsigned and signed release builds run only on pull requests. The e2e workflow skips its build and suite with a warning while the repository secret DEEPSEEK_API_KEY_EXTERNAL is unset, and runs them with the key once the secret exists.

## Workflow disposition

Upstream workflows that depend on DeepSeek organization infrastructure are disabled in the public repository through the workflow-disable setting, so pull requests never queue on private runners. They stay in the source tree for upstream history and can be re-enabled when their documented condition changes.

| Workflow | Disposition |
|---|---|
| Desktop | works on the public repository; push to main, desktop pull requests, manual dispatch |
| Secret scan | works; every push and pull request |
| E2E (real DeepSeek API) | adapted; the keyless preflight skips with a warning |
| Desktop release | works; v* tag or manual dispatch, fail-closed without signing and notarization credentials |
| CI | upstream-only: enterprise and self-hosted runner pools |
| Sandbox | upstream-only |
| Release (dsh), Release (vendor), Release (Python), Build single-exe | upstream-only: npm and PyPI release machinery |
| Landlock Run, Landlock Run Release | upstream-only: native landlock subtree |
| Deploy documentation | deferred until GitHub Pages is configured |
| E2E (E2B sandbox), E2E (pi-ai provider) | upstream-only: manual real-API suites |
| Issue lifecycle, Issue policy | upstream-only: organization label automation |
| Expected filenames | upstream-only: naming policy for upstream packages |

## Required checks on main

The branch ruleset requires the desktop validation checks job and the secret scan gitleaks job before merging pull requests. Both run on GitHub-hosted runners and pass without private credentials. The e2e job stays non-blocking while it is keyless.

## Applied at first publication

The public repository https://github.com/Alexmen97/deepseek-harness-app was created empty and received the complete local history on main. Enabled: Issues, Discussions, private vulnerability reporting, Dependabot alerts, and secret scanning with push protection. The topics are the nine listed above. The ruleset protect-main prevents force pushes and deletion on main, with always-bypass for the maintainer; required status checks stay unset until public CI check names are decided. The environment release requires Alexmen97 as reviewer and permits self-approval because no second maintainer exists.
