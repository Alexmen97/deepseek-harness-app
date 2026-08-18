# Privacy

- The DeepSeek API key is stored only in the macOS Keychain under the
  application service namespace; the frontend never reads it back.
- Session and conversation data are stored locally under the application
  data directory, owned by Harness persistence.
- Prompts, attachments, and session content are sent to the configured
  model provider (DeepSeek or a custom Base URL) over the network. Data
  does leave the Mac by design.
- No telemetry, no analytics, and no automatic crash uploads exist. Crash
  logs, when produced, stay local and contain no conversation content or
  credentials.
- Attachments selected for a prompt are sent to the configured provider as
  part of the request, matching the upstream Harness behavior.
