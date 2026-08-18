# User guide

## Installation

Download the latest DeepSeek-Harness-App-v<version>-macOS-arm64.dmg from GitHub Releases, open it, drag the application to Applications, and launch it from Finder. No Node, npm, pnpm, or Homebrew installation is required.

## First run

The onboarding asks for the DeepSeek API key and a project folder. The key is stored in the macOS Keychain and never shown again; the folder is the workspace the agent works in.

## Sessions

Use New Session to start a conversation, the sidebar to switch and resume sessions, and the composer to prompt. Streaming responses, tool calls, and their results render in the conversation view.

## Approvals and questions

When the agent needs permission or an answer, a card appears in the conversation. Allow or Reject the request, or answer the question; the agent continues from the response.

## Attachments

Paste or drop images into the composer, or use Session → Attach Image… for the native picker. The upstream limits apply (5 MiB per image, 20 images, 100 MiB per message).

## Models and settings

The Models page shows the runtime-reported providers and models. The desktop settings dialog manages the language (System/English/Italiano), the API key (replace/remove), the Base URL, and the diagnostics. Settings → Advanced shows versions, runtime state, and the log actions.

## Troubleshooting

See docs/TROUBLESHOOTING.md.
