/**
 * Desktop-only UI strings for the seven shipped languages, English canonical.
 * Upstream strings stay inside the upstream locale mechanism; this table
 * covers only the surfaces the desktop owns (onboarding, runtime status,
 * settings seats, failure and diagnostics copy).
 *
 * @module @deepseek-ai/dsh-desktop-client/ui/strings
 */

import { useSyncExternalStore } from 'react'
import { desktopLocale, type DesktopLanguage } from '../locale.ts'

/** Every desktop-owned UI string key, English canonical and seven locales. */
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
  | 'settings.language.chinese'
  | 'settings.language.spanish'
  | 'settings.language.french'
  | 'settings.language.german'
  | 'settings.language.portuguese'
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

/** English canonical desktop dictionary. */
export const en: Record<DesktopStringKey, string> = {
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
  'settings.language.chinese': '中文',
  'settings.language.spanish': 'Español',
  'settings.language.french': 'Français',
  'settings.language.german': 'Deutsch',
  'settings.language.portuguese': 'Português (Brasil)',
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

/** Italian dictionary, complete against the English key set. */
export const it: Record<DesktopStringKey, string> = {
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
  'settings.language.chinese': '中文',
  'settings.language.spanish': 'Español',
  'settings.language.french': 'Français',
  'settings.language.german': 'Deutsch',
  'settings.language.portuguese': 'Português (Brasil)',
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

/** Chinese dictionary, complete against the English key set. */
export const zh: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': '欢迎使用 Harness Desktop',
  'onboarding.welcome.body': '基于 DeepSeek Harness 的 AI 编程。非官方桌面客户端。',
  'onboarding.welcome.continue': '继续',
  'onboarding.provider.title': '连接 DeepSeek',
  'onboarding.provider.apiKey': 'API 密钥',
  'onboarding.provider.baseUrl': 'Base URL（可选）',
  'onboarding.provider.save': '保存到钥匙串',
  'onboarding.back': '返回',
  'onboarding.workspace.title': '选择项目',
  'onboarding.workspace.body': '选择 Harness 的工作目录。接下来会打开 macOS 原生文件夹选择器。',
  'onboarding.workspace.pick': '打开文件夹选择器',
  'status.starting': '正在启动 Harness…',
  'status.running': '已连接',
  'status.restarting': '正在重启 Harness…',
  'status.stopped': 'Harness 已停止',
  'status.failed': 'Harness 不可用',
  'status.stopping': '正在停止 Harness…',
  'failure.title': 'Harness 意外停止。',
  'failure.restart': '重启 Harness',
  'failure.logs': '打开日志',
  'settings.language': '语言',
  'settings.language.system': '跟随系统',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italiano',
  'settings.language.chinese': '中文',
  'settings.language.spanish': 'Español',
  'settings.language.french': 'Français',
  'settings.language.german': 'Deutsch',
  'settings.language.portuguese': 'Português (Brasil)',
  'settings.advanced': '高级',
  'settings.desktopVersion': '桌面版本',
  'settings.harnessVersion': 'Harness 版本',
  'settings.protocol': '桌面协议',
  'settings.runtimeState': '运行时状态',
  'settings.restart': '重启 Harness',
  'settings.logs': '打开日志',
  'settings.diagnostics': '复制诊断信息',
  'settings.title': '设置',
  'settings.close': '关闭',
  'credentials.title': 'DeepSeek 凭据',
  'credentials.configured': 'API 密钥已保存在 macOS 钥匙串中。',
  'credentials.notConfigured': '尚未配置 API 密钥。',
  'credentials.replace': '更换 API 密钥',
  'credentials.replacePlaceholder': '新 API 密钥',
  'credentials.replaceSave': '保存',
  'credentials.remove': '删除 API 密钥',
  'credentials.removeConfirm': '删除已保存的 API 密钥？在保存新密钥之前，助手将无法进行身份验证。',
  'credentials.removeConfirmYes': '删除',
  'credentials.removeConfirmNo': '取消',
  'settings.baseUrl': 'Base URL',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': '保存',
  'settings.baseUrlInvalid': 'Base URL 必须以 https:// 开头',
  'settings.copy': '复制',
  'notification.approval': '需要批准',
  'notification.approvalBody': 'Harness 正在等待权限决定。',
  'notification.question': '需要输入',
  'notification.questionBody': 'Harness 提出了一个问题，正在等待回答。',
  'notification.taskCompleted': '任务已完成',
  'notification.taskCompletedBody': '助手已完成当前任务。',
  'notification.runtimeFailed': 'Harness 意外停止',
  'notification.runtimeFailedBody': '打开 Harness Desktop 查看恢复选项。',
  'error.credentialEmpty': 'API 密钥不能为空',
  'error.unknown': '出了点问题',
}
/** Spanish dictionary, complete against the English key set. */
export const es: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': 'Bienvenido a Harness Desktop',
  'onboarding.welcome.body': 'Programación con IA basada en DeepSeek Harness. Cliente de escritorio no oficial.',
  'onboarding.welcome.continue': 'Continuar',
  'onboarding.provider.title': 'Conectar DeepSeek',
  'onboarding.provider.apiKey': 'Clave de API',
  'onboarding.provider.baseUrl': 'URL base (opcional)',
  'onboarding.provider.save': 'Guardar en el llavero',
  'onboarding.back': 'Atrás',
  'onboarding.workspace.title': 'Elige un proyecto',
  'onboarding.workspace.body': 'Selecciona la carpeta en la que trabajará Harness. Se abrirá el selector nativo de macOS.',
  'onboarding.workspace.pick': 'Abrir selector de carpeta',
  'status.starting': 'Iniciando Harness…',
  'status.running': 'Conectado',
  'status.restarting': 'Reiniciando Harness…',
  'status.stopped': 'Harness detenido',
  'status.failed': 'Harness no disponible',
  'status.stopping': 'Deteniendo Harness…',
  'failure.title': 'Harness se detuvo inesperadamente.',
  'failure.restart': 'Reiniciar Harness',
  'failure.logs': 'Abrir registros',
  'settings.language': 'Idioma',
  'settings.language.system': 'Sistema',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italiano',
  'settings.language.chinese': 'Chino',
  'settings.language.spanish': 'Español',
  'settings.language.french': 'Francés',
  'settings.language.german': 'Alemán',
  'settings.language.portuguese': 'Portugués (Brasil)',
  'settings.advanced': 'Avanzado',
  'settings.desktopVersion': 'Versión de escritorio',
  'settings.harnessVersion': 'Versión de Harness',
  'settings.protocol': 'Protocolo de escritorio',
  'settings.runtimeState': 'Estado del tiempo de ejecución',
  'settings.restart': 'Reiniciar Harness',
  'settings.logs': 'Abrir registros',
  'settings.diagnostics': 'Copiar diagnóstico',
  'settings.title': 'Ajustes',
  'settings.close': 'Cerrar',
  'credentials.title': 'Credenciales de DeepSeek',
  'credentials.configured': 'Clave de API guardada en el llavero de macOS.',
  'credentials.notConfigured': 'No hay ninguna clave de API configurada.',
  'credentials.replace': 'Reemplazar clave de API',
  'credentials.replacePlaceholder': 'Nueva clave de API',
  'credentials.replaceSave': 'Guardar',
  'credentials.remove': 'Eliminar clave de API',
  'credentials.removeConfirm': '¿Eliminar la clave de API guardada? El asistente dejará de autenticarse hasta que se guarde una nueva clave.',
  'credentials.removeConfirmYes': 'Eliminar',
  'credentials.removeConfirmNo': 'Cancelar',
  'settings.baseUrl': 'URL base',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': 'Guardar',
  'settings.baseUrlInvalid': 'La URL base debe usar https://',
  'settings.copy': 'Copiar',
  'notification.approval': 'Aprobación requerida',
  'notification.approvalBody': 'Harness espera una decisión de permisos.',
  'notification.question': 'Se requiere una respuesta',
  'notification.questionBody': 'Harness hizo una pregunta y espera una respuesta.',
  'notification.taskCompleted': 'Tarea completada',
  'notification.taskCompletedBody': 'El asistente terminó la tarea actual.',
  'notification.runtimeFailed': 'Harness se detuvo inesperadamente',
  'notification.runtimeFailedBody': 'Abre Harness Desktop para ver las opciones de recuperación.',
  'error.credentialEmpty': 'La clave de API no puede estar vacía',
  'error.unknown': 'Algo salió mal',
}
/** French dictionary, complete against the English key set. */
export const fr: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': 'Bienvenue dans Harness Desktop',
  'onboarding.welcome.body': 'Programmation assistée par IA avec DeepSeek Harness. Client de bureau non officiel.',
  'onboarding.welcome.continue': 'Continuer',
  'onboarding.provider.title': 'Connecter DeepSeek',
  'onboarding.provider.apiKey': 'Clé API',
  'onboarding.provider.baseUrl': 'URL de base (facultatif)',
  'onboarding.provider.save': 'Enregistrer dans le trousseau',
  'onboarding.back': 'Retour',
  'onboarding.workspace.title': 'Choisir un projet',
  'onboarding.workspace.body': 'Sélectionnez le dossier dans lequel Harness travaillera. Le sélecteur natif de macOS s’ouvre ensuite.',
  'onboarding.workspace.pick': 'Ouvrir le sélecteur de dossier',
  'status.starting': 'Démarrage de Harness…',
  'status.running': 'Connecté',
  'status.restarting': 'Redémarrage de Harness…',
  'status.stopped': 'Harness arrêté',
  'status.failed': 'Harness indisponible',
  'status.stopping': 'Arrêt de Harness…',
  'failure.title': 'Harness s’est arrêté de manière inattendue.',
  'failure.restart': 'Redémarrer Harness',
  'failure.logs': 'Ouvrir les journaux',
  'settings.language': 'Langue',
  'settings.language.system': 'Système',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italiano',
  'settings.language.chinese': 'Chinois',
  'settings.language.spanish': 'Espagnol',
  'settings.language.french': 'Français',
  'settings.language.german': 'Allemand',
  'settings.language.portuguese': 'Portugais (Brésil)',
  'settings.advanced': 'Avancé',
  'settings.desktopVersion': 'Version du bureau',
  'settings.harnessVersion': 'Version de Harness',
  'settings.protocol': 'Protocole du bureau',
  'settings.runtimeState': 'État du moteur d’exécution',
  'settings.restart': 'Redémarrer Harness',
  'settings.logs': 'Ouvrir les journaux',
  'settings.diagnostics': 'Copier le diagnostic',
  'settings.title': 'Réglages',
  'settings.close': 'Fermer',
  'credentials.title': 'Identifiants DeepSeek',
  'credentials.configured': 'Clé API enregistrée dans le trousseau de macOS.',
  'credentials.notConfigured': 'Aucune clé API configurée.',
  'credentials.replace': 'Remplacer la clé API',
  'credentials.replacePlaceholder': 'Nouvelle clé API',
  'credentials.replaceSave': 'Enregistrer',
  'credentials.remove': 'Supprimer la clé API',
  'credentials.removeConfirm': 'Supprimer la clé API enregistrée ? L’assistant cessera de s’authentifier jusqu’à l’enregistrement d’une nouvelle clé.',
  'credentials.removeConfirmYes': 'Supprimer',
  'credentials.removeConfirmNo': 'Annuler',
  'settings.baseUrl': 'URL de base',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': 'Enregistrer',
  'settings.baseUrlInvalid': 'L’URL de base doit utiliser https://',
  'settings.copy': 'Copier',
  'notification.approval': 'Approbation requise',
  'notification.approvalBody': 'Harness attend une décision concernant les autorisations.',
  'notification.question': 'Réponse requise',
  'notification.questionBody': 'Harness a posé une question et attend une réponse.',
  'notification.taskCompleted': 'Tâche terminée',
  'notification.taskCompletedBody': 'L’assistant a terminé la tâche en cours.',
  'notification.runtimeFailed': 'Harness s’est arrêté de manière inattendue',
  'notification.runtimeFailedBody': 'Ouvrez Harness Desktop pour les options de récupération.',
  'error.credentialEmpty': 'La clé API ne peut pas être vide',
  'error.unknown': 'Une erreur est survenue',
}
/** German dictionary, complete against the English key set. */
export const de: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': 'Willkommen bei Harness Desktop',
  'onboarding.welcome.body': 'KI-gestütztes Programmieren mit DeepSeek Harness. Inoffizieller Desktop-Client.',
  'onboarding.welcome.continue': 'Weiter',
  'onboarding.provider.title': 'DeepSeek verbinden',
  'onboarding.provider.apiKey': 'API-Schlüssel',
  'onboarding.provider.baseUrl': 'Basis-URL (optional)',
  'onboarding.provider.save': 'Im Schlüsselbund speichern',
  'onboarding.back': 'Zurück',
  'onboarding.workspace.title': 'Projekt auswählen',
  'onboarding.workspace.body': 'Wählen Sie den Ordner, in dem Harness arbeiten soll. Als Nächstes öffnet sich die native macOS-Auswahl.',
  'onboarding.workspace.pick': 'Ordnerauswahl öffnen',
  'status.starting': 'Harness wird gestartet…',
  'status.running': 'Verbunden',
  'status.restarting': 'Harness wird neu gestartet…',
  'status.stopped': 'Harness angehalten',
  'status.failed': 'Harness nicht verfügbar',
  'status.stopping': 'Harness wird angehalten…',
  'failure.title': 'Harness wurde unerwartet beendet.',
  'failure.restart': 'Harness neu starten',
  'failure.logs': 'Protokolle öffnen',
  'settings.language': 'Sprache',
  'settings.language.system': 'System',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italienisch',
  'settings.language.chinese': 'Chinesisch',
  'settings.language.spanish': 'Spanisch',
  'settings.language.french': 'Französisch',
  'settings.language.german': 'Deutsch',
  'settings.language.portuguese': 'Portugiesisch (Brasilien)',
  'settings.advanced': 'Erweitert',
  'settings.desktopVersion': 'Desktop-Version',
  'settings.harnessVersion': 'Harness-Version',
  'settings.protocol': 'Desktop-Protokoll',
  'settings.runtimeState': 'Laufzeitstatus',
  'settings.restart': 'Harness neu starten',
  'settings.logs': 'Protokolle öffnen',
  'settings.diagnostics': 'Diagnose kopieren',
  'settings.title': 'Einstellungen',
  'settings.close': 'Schließen',
  'credentials.title': 'DeepSeek-Anmeldedaten',
  'credentials.configured': 'API-Schlüssel im macOS-Schlüsselbund gespeichert.',
  'credentials.notConfigured': 'Kein API-Schlüssel konfiguriert.',
  'credentials.replace': 'API-Schlüssel ersetzen',
  'credentials.replacePlaceholder': 'Neuer API-Schlüssel',
  'credentials.replaceSave': 'Speichern',
  'credentials.remove': 'API-Schlüssel entfernen',
  'credentials.removeConfirm': 'Gespeicherten API-Schlüssel entfernen? Der Assistent kann sich erst wieder authentifizieren, wenn ein neuer Schlüssel gespeichert wurde.',
  'credentials.removeConfirmYes': 'Entfernen',
  'credentials.removeConfirmNo': 'Abbrechen',
  'settings.baseUrl': 'Basis-URL',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': 'Speichern',
  'settings.baseUrlInvalid': 'Die Basis-URL muss https:// verwenden',
  'settings.copy': 'Kopieren',
  'notification.approval': 'Genehmigung erforderlich',
  'notification.approvalBody': 'Harness wartet auf eine Berechtigungsentscheidung.',
  'notification.question': 'Eingabe erforderlich',
  'notification.questionBody': 'Harness hat eine Frage gestellt und wartet auf eine Antwort.',
  'notification.taskCompleted': 'Aufgabe abgeschlossen',
  'notification.taskCompletedBody': 'Der Assistent hat die aktuelle Aufgabe abgeschlossen.',
  'notification.runtimeFailed': 'Harness wurde unerwartet beendet',
  'notification.runtimeFailedBody': 'Öffnen Sie Harness Desktop für Wiederherstellungsoptionen.',
  'error.credentialEmpty': 'Der API-Schlüssel darf nicht leer sein',
  'error.unknown': 'Etwas ist schiefgelaufen',
}
/** Brazilian Portuguese dictionary, complete against the English key set. */
export const ptBr: Record<DesktopStringKey, string> = {
  'onboarding.welcome.title': 'Bem-vindo ao Harness Desktop',
  'onboarding.welcome.body': 'Programação com IA baseada no DeepSeek Harness. Cliente de desktop não oficial.',
  'onboarding.welcome.continue': 'Continuar',
  'onboarding.provider.title': 'Conectar o DeepSeek',
  'onboarding.provider.apiKey': 'Chave de API',
  'onboarding.provider.baseUrl': 'URL base (opcional)',
  'onboarding.provider.save': 'Salvar nas Chaves',
  'onboarding.back': 'Voltar',
  'onboarding.workspace.title': 'Escolher um projeto',
  'onboarding.workspace.body': 'Selecione a pasta em que o Harness vai trabalhar. O seletor nativo do macOS será aberto em seguida.',
  'onboarding.workspace.pick': 'Abrir seletor de pasta',
  'status.starting': 'Iniciando o Harness…',
  'status.running': 'Conectado',
  'status.restarting': 'Reiniciando o Harness…',
  'status.stopped': 'Harness parado',
  'status.failed': 'Harness indisponível',
  'status.stopping': 'Parando o Harness…',
  'failure.title': 'O Harness parou inesperadamente.',
  'failure.restart': 'Reiniciar o Harness',
  'failure.logs': 'Abrir registros',
  'settings.language': 'Idioma',
  'settings.language.system': 'Sistema',
  'settings.language.english': 'English',
  'settings.language.italian': 'Italiano',
  'settings.language.chinese': 'Chinês',
  'settings.language.spanish': 'Espanhol',
  'settings.language.french': 'Francês',
  'settings.language.german': 'Alemão',
  'settings.language.portuguese': 'Português (Brasil)',
  'settings.advanced': 'Avançado',
  'settings.desktopVersion': 'Versão do desktop',
  'settings.harnessVersion': 'Versão do Harness',
  'settings.protocol': 'Protocolo do desktop',
  'settings.runtimeState': 'Estado do tempo de execução',
  'settings.restart': 'Reiniciar o Harness',
  'settings.logs': 'Abrir registros',
  'settings.diagnostics': 'Copiar diagnóstico',
  'settings.title': 'Ajustes',
  'settings.close': 'Fechar',
  'credentials.title': 'Credenciais do DeepSeek',
  'credentials.configured': 'Chave de API salva nas Chaves do macOS.',
  'credentials.notConfigured': 'Nenhuma chave de API configurada.',
  'credentials.replace': 'Substituir chave de API',
  'credentials.replacePlaceholder': 'Nova chave de API',
  'credentials.replaceSave': 'Salvar',
  'credentials.remove': 'Remover chave de API',
  'credentials.removeConfirm': 'Remover a chave de API salva? O assistente deixará de autenticar até que uma nova chave seja salva.',
  'credentials.removeConfirmYes': 'Remover',
  'credentials.removeConfirmNo': 'Cancelar',
  'settings.baseUrl': 'URL base',
  'settings.baseUrlPlaceholder': 'https://api.deepseek.com',
  'settings.baseUrlSave': 'Salvar',
  'settings.baseUrlInvalid': 'A URL base deve usar https://',
  'settings.copy': 'Copiar',
  'notification.approval': 'Aprovação necessária',
  'notification.approvalBody': 'O Harness está aguardando uma decisão de permissão.',
  'notification.question': 'Resposta necessária',
  'notification.questionBody': 'O Harness fez uma pergunta e está aguardando uma resposta.',
  'notification.taskCompleted': 'Tarefa concluída',
  'notification.taskCompletedBody': 'O assistente concluiu a tarefa atual.',
  'notification.runtimeFailed': 'O Harness parou inesperadamente',
  'notification.runtimeFailedBody': 'Abra o Harness Desktop para ver as opções de recuperação.',
  'error.credentialEmpty': 'A chave de API não pode estar vazia',
  'error.unknown': 'Algo deu errado',
}

/**
 * Translate one desktop key for a language.
 * @param language - the resolved desktop language.
 * @param key - the desktop string key.
 * @returns the translated string.
 */
export function desktopText(language: DesktopLanguage, key: DesktopStringKey): string {
  const dicts: Record<DesktopLanguage, Record<DesktopStringKey, string>> = { en, zh, it, es, fr, de, 'pt-BR': ptBr }
  return dicts[language][key]
}

/**
 * React seat over the desktop language store.
 * @returns the live language and its translation function.
 */
export function useDesktopStrings(): { language: DesktopLanguage; t: (key: DesktopStringKey) => string } {
  const language = useSyncExternalStore(
    listener => desktopLocale.subscribe(() => { listener() }),
    () => desktopLocale.get(),
  )
  return { language, t: key => desktopText(language, key) }
}

/**
 * Live macOS appearance for the desktop-owned surfaces.
 * @returns the current light or dark appearance, following system changes.
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

/**
 * Dialog palette for the current appearance.
 * @param appearance - the current light or dark appearance.
 * @returns the color tokens for the desktop dialogs.
 */
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
