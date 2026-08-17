/**
 * Desktop-only UI strings, English canonical and Italian. Upstream strings
 * stay inside the upstream locale mechanism; this table covers only the
 * surfaces the desktop owns (onboarding, runtime status, settings seats,
 * failure and diagnostics copy).
 *
 * @module @deepseek-ai/dsh-desktop-client/ui/strings
 */

import { useSyncExternalStore } from 'react'
import { desktopLocale, type DesktopLanguage } from '../locale.ts'

export type DesktopStringKey =
  | 'onboarding.welcome.title'
  | 'onboarding.welcome.body'
  | 'onboarding.welcome.continue'
  | 'onboarding.provider.title'
  | 'onboarding.provider.apiKey'
  | 'onboarding.provider.baseUrl'
  | 'onboarding.provider.save'
  | 'onboarding.back'
  | 'onboarding.workspace.title'
  | 'onboarding.workspace.body'
  | 'onboarding.workspace.pick'
  | 'status.starting'
  | 'status.running'
  | 'status.restarting'
  | 'status.stopped'
  | 'status.failed'
  | 'status.stopping'
  | 'failure.title'
  | 'failure.restart'
  | 'failure.logs'
  | 'settings.language'
  | 'settings.language.system'
  | 'settings.language.english'
  | 'settings.language.italian'
  | 'settings.advanced'
  | 'settings.desktopVersion'
  | 'settings.harnessVersion'
  | 'settings.protocol'
  | 'settings.runtimeState'
  | 'settings.restart'
  | 'settings.logs'
  | 'settings.diagnostics'
  | 'settings.title'
  | 'settings.close'
  | 'credentials.title'
  | 'credentials.configured'
  | 'credentials.notConfigured'
  | 'credentials.replace'
  | 'credentials.replacePlaceholder'
  | 'credentials.replaceSave'
  | 'credentials.remove'
  | 'credentials.removeConfirm'
  | 'credentials.removeConfirmYes'
  | 'credentials.removeConfirmNo'
  | 'settings.baseUrl'
  | 'settings.baseUrlPlaceholder'
  | 'settings.baseUrlSave'
  | 'settings.baseUrlInvalid'
  | 'settings.copy'
  | 'notification.approval'
  | 'notification.approvalBody'
  | 'notification.question'
  | 'notification.questionBody'
  | 'notification.taskCompleted'
  | 'notification.taskCompletedBody'
  | 'notification.runtimeFailed'
  | 'notification.runtimeFailedBody'
  | 'error.credentialEmpty'
  | 'error.unknown'

const en: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': 'Welcome to Harness Desktop',
  'onboarding.welcome.body': 'AI coding powered by DeepSeek Harness. Unofficial desktop client.',
  'onboarding.welcome.continue': 'Continue',
  'onboarding.provider.title': 'Connect DeepSeek',
  'onboarding.provider.apiKey': 'API Key',
  'onboarding.provider.baseUrl': 'Base URL (optional)',
  'onboarding.provider.save': 'Save to Keychain',
  'onboarding.back': 'Back',
  'onboarding.workspace.title': 'Choose a project',
  'onboarding.workspace.body': 'Select the folder Harness will work in. The native macOS picker opens next.',
  'onboarding.workspace.pick': 'Open Folder Picker',
  'status.starting': 'Starting Harness…',
  'status.running': 'Connected',
  'status.restarting': 'Restarting Harness…',
  'status.stopped': 'Harness stopped',
  'status.failed': 'Harness unavailable',
  'status.stopping': 'Stopping Harness…',
  'failure.title': 'Harness stopped unexpectedly.',
  'failure.restart': 'Restart Harness',
  'failure.logs': 'Open Logs',
  'settings.language': 'Language',
  'settings.language.system': 'System',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italiano',
  'settings.advanced': 'Advanced',
  'settings.desktopVersion': 'Desktop version',
  'settings.harnessVersion': 'Harness version',
  'settings.protocol': 'Desktop protocol',
  'settings.runtimeState': 'Runtime state',
  'settings.restart': 'Restart Harness',
  'settings.logs': 'Open Logs',
  'settings.diagnostics': 'Copy Diagnostics',
  'settings.title': 'Settings',
  'settings.close': 'Close',
  'credentials.title': 'DeepSeek Credentials',
  'credentials.configured': 'API key configured in the macOS Keychain.',
  'credentials.notConfigured': 'No API key configured.',
  'credentials.replace': 'Replace API Key',
  'credentials.replacePlaceholder': 'New API key',
  'credentials.replaceSave': 'Save',
  'credentials.remove': 'Remove API Key',
  'credentials.removeConfirm': 'Remove the stored API key? The assistant will stop authenticating until a new key is saved.',
  'credentials.removeConfirmYes': 'Remove',
  'credentials.removeConfirmNo': 'Cancel',
  'settings.baseUrl': 'Base URL',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': 'Save',
  'settings.baseUrlInvalid': 'The Base URL must use https://',
  'settings.copy': 'Copy',
  'notification.approval': 'Approval required',
  'notification.approvalBody': 'Harness is waiting for a permission decision.',
  'notification.question': 'Input required',
  'notification.questionBody': 'Harness asked a question and is waiting for an answer.',
  'notification.taskCompleted': 'Task completed',
  'notification.taskCompletedBody': 'The assistant finished the current task.',
  'notification.runtimeFailed': 'Harness stopped unexpectedly',
  'notification.runtimeFailedBody': 'Open Harness Desktop for recovery options.',
  'error.credentialEmpty': 'API key must not be empty',
  'error.unknown': 'Something went wrong',
}

const it: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': 'Benvenuto in Harness Desktop',
  'onboarding.welcome.body': 'Programmazione con AI basata su DeepSeek Harness. Client desktop non ufficiale.',
  'onboarding.welcome.continue': 'Continua',
  'onboarding.provider.title': 'Connetti DeepSeek',
  'onboarding.provider.apiKey': 'Chiave API',
  'onboarding.provider.baseUrl': 'Base URL (facoltativa)',
  'onboarding.provider.save': 'Salva nel Portachiavi',
  'onboarding.back': 'Indietro',
  'onboarding.workspace.title': 'Scegli un progetto',
  'onboarding.workspace.body': 'Seleziona la cartella in cui Harness lavorerà. Si apre il selettore nativo di macOS.',
  'onboarding.workspace.pick': 'Apri selettore cartella',
  'status.starting': 'Avvio di Harness…',
  'status.running': 'Connesso',
  'status.restarting': 'Riavvio di Harness…',
  'status.stopped': 'Harness fermo',
  'status.failed': 'Harness non disponibile',
  'status.stopping': 'Arresto di Harness…',
  'failure.title': 'Harness si è arrestato in modo imprevisto.',
  'failure.restart': 'Riavvia Harness',
  'failure.logs': 'Apri i log',
  'settings.language': 'Lingua',
  'settings.language.system': 'Sistema',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italiano',
  'settings.advanced': 'Avanzate',
  'settings.desktopVersion': 'Versione desktop',
  'settings.harnessVersion': 'Versione Harness',
  'settings.protocol': 'Protocollo desktop',
  'settings.runtimeState': 'Stato runtime',
  'settings.restart': 'Riavvia Harness',
  'settings.logs': 'Apri i log',
  'settings.diagnostics': 'Copia diagnostica',
  'settings.title': 'Impostazioni',
  'settings.close': 'Chiudi',
  'credentials.title': 'Credenziali DeepSeek',
  'credentials.configured': 'Chiave API configurata nel Portachiavi di macOS.',
  'credentials.notConfigured': 'Nessuna chiave API configurata.',
  'credentials.replace': 'Sostituisci chiave API',
  'credentials.replacePlaceholder': 'Nuova chiave API',
  'credentials.replaceSave': 'Salva',
  'credentials.remove': 'Rimuovi chiave API',
  'credentials.removeConfirm': 'Rimuovere la chiave API salvata? L’assistente smetterà di autenticarsi finché non viene salvata una nuova chiave.',
  'credentials.removeConfirmYes': 'Rimuovi',
  'credentials.removeConfirmNo': 'Annulla',
  'settings.baseUrl': 'Base URL',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': 'Salva',
  'settings.baseUrlInvalid': 'La Base URL deve usare https://',
  'settings.copy': 'Copia',
  'notification.approval': 'Approvazione richiesta',
  'notification.approvalBody': 'Harness attende una decisione sui permessi.',
  'notification.question': 'Risposta richiesta',
  'notification.questionBody': 'Harness ha posto una domanda e attende una risposta.',
  'notification.taskCompleted': 'Attività completata',
  'notification.taskCompletedBody': 'L’assistente ha completato l’attività corrente.',
  'notification.runtimeFailed': 'Harness si è arrestato in modo imprevisto',
  'notification.runtimeFailedBody': 'Apri Harness Desktop per le opzioni di ripristino.',
  'error.credentialEmpty': 'La chiave API non può essere vuota',
  'error.unknown': 'Si è verificato un errore',
}

/** Translate one desktop key for a language. */
export function desktopText(language: DesktopLanguage, key: DesktopStringKey): string {
  return (language === 'it' ? it : en)[key]
}

/** React seat over the desktop language store. */
export function useDesktopStrings(): { language: DesktopLanguage; t: (key: DesktopStringKey) => string } {
  const language = useSyncExternalStore(
    listener => desktopLocale.subscribe(() => { listener() }),
    () => desktopLocale.get(),
  )
  return { language, t: key => desktopText(language, key) }
}

/**
 * Live macOS appearance for the desktop-owned surfaces. The upstream theme
 * system owns the product UI; this hook only keeps the onboarding and
 * settings dialogs readable under both appearances.
 */
export function useDesktopAppearance(): 'light' | 'dark' {
  const resolve = (): 'light' | 'dark' => {
    if (typeof window.matchMedia !== 'function') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return useSyncExternalStore(
    (listener) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const query = window.matchMedia('(prefers-color-scheme: dark)')
      query.addEventListener('change', listener)
      return () => { query.removeEventListener('change', listener) }
    },
    resolve,
  )
}

/** Dialog palette for the current appearance. */
export function desktopPalette(appearance: 'light' | 'dark'): {
  dialog: string
  text: string
  muted: string
  input: string
  inputBorder: string
  code: string
} {
  return appearance === 'dark'
    ? {
      dialog: '#1e2026',
      text: '#e8eaef',
      muted: '#9aa1ad',
      input: '#17181d',
      inputBorder: '#3a3f49',
      code: '#17181d',
    }
    : {
      dialog: '#ffffff',
      text: '#181a20',
      muted: '#4a4f59',
      input: '#ffffff',
      inputBorder: '#d0d4dc',
      code: '#f4f5f7',
    }
}
