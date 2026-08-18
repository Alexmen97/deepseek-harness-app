# GitHub repository strategy

Recommendation: an independent public repository named DeepSeek Harness App (slug deepseek-harness-app), derived from the upstream checkout, with the original upstream preserved as the git remote named upstream.

## Why not a GitHub fork?

A fork relationship would pin the desktop project to the upstream repository identity: the fork banner, upstream-centric README expectations, and upstream-tagged releases would all point users at the Harness engine rather than the desktop application. The desktop project has its own release versioning, its own issue flow, and its own download artifacts, none of which fit a fork's presentation. GitHub forks also complicate independent release permissions and discussions for a project with a different product identity.

## Why retain the upstream history?

The full upstream git history stays in the repository: it preserves attribution, makes upstream merges and blame meaningful, and keeps the derivation transparent. The desktop commits sit on top of the pinned upstream base; nothing is squashed into an initial commit.

## Remote layout after repository creation

```text
upstream  https://github.com/deepseek-ai/deepseek-harness.git
origin    https://github.com/<owner>/deepseek-harness-app.git
```

See docs/project/UPSTREAM-WORKFLOW.md for the migration and sync procedure. The repository is not created or pushed in M3.
