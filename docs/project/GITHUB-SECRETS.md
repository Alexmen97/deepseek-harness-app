# GitHub secrets for releases

Operational guide for configuring Apple Developer ID signing and notarization for the GitHub Release pipeline. Values live only in the GitHub environment named release, never in this repository. The application is distributed directly through GitHub Releases; the Mac App Store is not used, and the App Store Connect credentials serve only as authentication for Apple notarization.

## 1. Apple Developer Program membership

The maintainer needs an Apple Developer Program membership (the paid individual or organization program). The membership provides the team id and access to the certificates and keys needed below. No App Store product page, bundle registration, or App Store Connect app record is required for this pipeline.

## 2. Developer ID Application certificate

Create one Developer ID Application certificate, either from Xcode (Settings → Accounts → Manage Certificates → Developer ID Application) or from the Apple Developer portal. The identity is what codesign uses to sign the app with Hardened Runtime; the notarization credentials below authorize the signature with Apple.

## 3. Export the certificate and private key as .p12

Open Keychain Access, select the Developer ID Application certificate, expand it to show the private key, and choose File → Export Items → Personal Information Exchange (.p12). Set a strong export password; that password becomes APPLE_CERTIFICATE_PASSWORD.

## 4. Encode the .p12 for the GitHub secret

Encode the exported file to a single base64 line and paste it into the secret APPLE_CERTIFICATE_BASE64:

```sh
base64 -i certificate.p12 | pbcopy
```

Never commit the .p12, the .p8, or their base64 encodings; the repository ignores these files and CI runs gitleaks on every push and pull request.

## 5. App Store Connect API key for notarization (preferred)

In App Store Connect: Users and Access → Integrations → App Store Connect API → Team Keys. Create a Team Key with the Developer (or App Manager) role, and download the .p8 file once; Apple shows its contents only at creation time. The workflow passes its id with notarytool, so this is an App Store Connect key id — not a DeepSeek API key and not a notarization password.

Alternative: password-based notarization with an Apple ID, an app-specific password created at appleid.apple.com, and the team id. Only one authentication pair is required; when both exist the workflow prefers the API key.

## 6. Secrets in the environment release

Create these secrets in the GitHub environment release (Settings → Environments → release). The environment already requires the Alexmen97 reviewer and permits self-approval because no second maintainer exists.

| Secret | Value | When required |
|---|---|---|
| APPLE_CERTIFICATE_BASE64 | base64-encoded .p12 | signing |
| APPLE_CERTIFICATE_PASSWORD | the .p12 export password | signing |
| APPLE_KEYCHAIN_PASSWORD | a fresh random password for the temporary CI keychain | signing |
| APPLE_SIGNING_IDENTITY | the exact codesign identity string, see below | signing |
| APPLE_API_KEY | App Store Connect API key id | notarization, API-key path |
| APPLE_API_ISSUER | App Store Connect issuer id | notarization, API-key path |
| APPLE_API_KEY_P8_BASE64 | base64-encoded .p8 private key | notarization, API-key path |
| APPLE_ID | Apple ID | alternative notarization |
| APPLE_APP_SPECIFIC_PASSWORD | app-specific password | alternative notarization |
| APPLE_TEAM_ID | 10-character Apple Developer team id | alternative notarization |

APPLE_SIGNING_IDENTITY is the exact string security find-identity -v -p codesigning reports for the imported certificate, in the form Developer ID Application: <Name> (<TEAMID>), for example Developer ID Application: Alex Doe (ABCDE12345).

## 7. How the workflow consumes them

The release workflow reads the secrets only inside the environment-gated jobs: it decodes the .p12 into a temporary build.keychain on the ephemeral runner, unlocks it, verifies the identity with security find-identity, signs with Hardened Runtime, submits the archive to notarytool, staples the result, and runs spctl. The runner is destroyed after the job, which removes the temporary keychain; the workflow never echoes secret values into logs. A tag release fails before any Release is created when signing or notarization credentials are absent, while a dry-run dispatch produces an unsigned development artifact without publication.
