/** Locale namespace owned by Session export browser feedback. */
export const NS = 'session-log-download'

/** Simplified-Chinese Session export strings. */
export const zh = {
  'dialog.preparingTitle': '正在导出 Session',
  'dialog.preparingDescription': '正在准备包含当前 Session、子 Session 和附件的 ZIP 文件。',
  'dialog.successTitle': 'Session 导出已开始下载',
  'dialog.successDescription': '浏览器正在下载 Session ZIP 文件。',
  'dialog.errorTitle': 'Session 导出失败',
  'dialog.close': '关闭',
  'dialog.commandFailed': '无法启动 Session 导出。',
} as const

/** English Session export strings. */
export const en: Record<keyof typeof zh, string> = {
  'dialog.preparingTitle': 'Exporting Session',
  'dialog.preparingDescription': 'Preparing a ZIP containing this Session, its sub-Sessions, and attachments.',
  'dialog.successTitle': 'Session download started',
  'dialog.successDescription': 'The browser is downloading the Session ZIP.',
  'dialog.errorTitle': 'Session export failed',
  'dialog.close': 'Close',
  'dialog.commandFailed': 'Could not start the Session export.',
}

/** Stable locale keys consumed by the shared modal. */
export type SessionLogDownloadKey = keyof typeof zh

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'dialog.preparingTitle': 'Esportazione sessione',
  'dialog.preparingDescription': 'Preparazione di uno ZIP con questa sessione, le sue sottosessioni e gli allegati.',
  'dialog.successTitle': 'Download della sessione avviato',
  'dialog.successDescription': 'Il browser sta scaricando lo ZIP della sessione.',
  'dialog.errorTitle': 'Esportazione sessione non riuscita',
  'dialog.close': 'Chiudi',
  'dialog.commandFailed': 'Impossibile avviare l’esportazione della sessione.',
} satisfies Record<SessionLogDownloadKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'dialog.preparingTitle': 'Exportando sesión',
  'dialog.preparingDescription': 'Preparando un ZIP con esta sesión, sus subsessions y los archivos adjuntos.',
  'dialog.successTitle': 'Descarga de la sesión iniciada',
  'dialog.successDescription': 'El navegador está descargando el ZIP de la sesión.',
  'dialog.errorTitle': 'Error al exportar la sesión',
  'dialog.close': 'Cerrar',
  'dialog.commandFailed': 'No se pudo iniciar la exportación de la sesión.',
} satisfies Record<SessionLogDownloadKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'dialog.preparingTitle': 'Export de la session',
  'dialog.preparingDescription': 'Préparation d’un ZIP contenant cette session, ses sous-sessions et les pièces jointes.',
  'dialog.successTitle': 'Téléchargement de la session démarré',
  'dialog.successDescription': 'Le navigateur télécharge le ZIP de la session.',
  'dialog.errorTitle': 'Échec de l’export de la session',
  'dialog.close': 'Fermer',
  'dialog.commandFailed': 'Impossible de démarrer l’export de la session.',
} satisfies Record<SessionLogDownloadKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'dialog.preparingTitle': 'Sitzung wird exportiert',
  'dialog.preparingDescription': 'Ein ZIP mit dieser Sitzung, ihren Untersitzungen und Anhängen wird vorbereitet.',
  'dialog.successTitle': 'Download der Sitzung gestartet',
  'dialog.successDescription': 'Der Browser lädt das Sitzungs-ZIP herunter.',
  'dialog.errorTitle': 'Export der Sitzung fehlgeschlagen',
  'dialog.close': 'Schließen',
  'dialog.commandFailed': 'Export der Sitzung konnte nicht gestartet werden.',
} satisfies Record<SessionLogDownloadKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'dialog.preparingTitle': 'Exportando sessão',
  'dialog.preparingDescription': 'Preparando um ZIP com esta sessão, suas subsessões e anexos.',
  'dialog.successTitle': 'Download da sessão iniciado',
  'dialog.successDescription': 'O navegador está baixando o ZIP da sessão.',
  'dialog.errorTitle': 'Falha ao exportar a sessão',
  'dialog.close': 'Fechar',
  'dialog.commandFailed': 'Não foi possível iniciar a exportação da sessão.',
} satisfies Record<SessionLogDownloadKey, string>

/** it dictionary, checked complete against the zh key set. */
