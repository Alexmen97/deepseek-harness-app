# Troubleshooting

## The runtime fails to start

Open Settings → Advanced → Copy Diagnostics and check the runtime state and generation. Restart Harness from the same section; Open Logs shows the desktop log store.

## Keychain issue

The first key access asks for Keychain authorization; choosing Allow (or Always Allow) once persists. Replacing or removing the key is available in the desktop settings dialog.

## No models

Confirm the credential is configured and the Base URL is reachable. The model list comes from the runtime, never a hardcoded catalog.

## Invalid API key

Replace the key in the desktop settings dialog and retry the turn.

## Application crash

The Harness runtime restarts automatically up to three times per minute; after that the recovery dialog offers Restart Harness and Open Logs. Copy Diagnostics includes no conversation content or credentials.

## Corrupted settings

The desktop preferences live in a small prefs.json under the application data directory. Remove it only while the app is closed; it contains no credentials.

## Workspace unavailable

Re-select the workspace with Session → Open Workspace…; the runtime restarts with the new working directory.

## Gatekeeper

Public releases are signed, notarized, and stapled, and Gatekeeper accepts them without special steps. Development builds are ad-hoc signed and are for the build machine only; do not disable Gatekeeper to run a release.
