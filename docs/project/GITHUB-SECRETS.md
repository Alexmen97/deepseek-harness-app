# GitHub secrets for releases

The secrets the release workflow needs once the repository exists. Values are never stored in this repository; they live in the GitHub environment named release and are only exposed to the release workflow.

| Secret / variable | Purpose |
|---|---|
| APPLE_CERTIFICATE_BASE64 | Developer ID Application certificate (.p12), base64-encoded |
| APPLE_CERTIFICATE_PASSWORD | The .p12 import password |
| APPLE_KEYCHAIN_PASSWORD | Password for the temporary CI keychain |
| APPLE_SIGNING_IDENTITY | The Developer ID Application identity string |
| APPLE_API_KEY | App Store Connect API key id (notarization) |
| APPLE_API_ISSUER | App Store Connect issuer id |
| APPLE_API_KEY_P8_BASE64 | App Store Connect API key (.p8), base64-encoded; the workflow decodes it on the runner |
| APPLE_ID | Apple ID for password-based notarization (alternative to the API key) |
| APPLE_APP_SPECIFIC_PASSWORD | App-specific password for password-based notarization |
| APPLE_TEAM_ID | Apple Developer team id for password-based notarization |
| GH_RELEASE_TOKEN | Optional fine-grained token with contents: write; the workflow otherwise uses the default GITHUB_TOKEN scoped to the publish job |

Password-based notarization with APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD is an accepted alternative to the API key. These credentials are used only to sign and notarize a direct GitHub Release; the application is not submitted to the Mac App Store. The release environment requires a reviewer approval before production releases; PR CI has no access to any of these secrets.
