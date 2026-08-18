# Security policy

## Supported versions

The current macOS preview release line. Older preview builds are not
supported; the pinned Harness Engine version is named in each release.

## Reporting a vulnerability

Report vulnerabilities through GitHub private vulnerability reporting on the
public repository (enable it in repository settings after creation). Do not
disclose the vulnerability publicly before triage. Include the app version,
the Harness Engine version, the macOS version, and sanitized diagnostics;
never include API keys or other secrets.

## Secret handling

The application stores the DeepSeek API key only in the macOS Keychain. Do
not open issues or pull requests that contain API keys, signing
credentials, or certificates. See PRIVACY.md for the data flow.
