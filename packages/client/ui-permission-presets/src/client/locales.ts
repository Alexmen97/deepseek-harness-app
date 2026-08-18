/** `settings.permission` namespace dictionaries (the Permission row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '权限',
  'description': '选择新会话的默认权限模式',
  'loading': '加载中',
  'unavailable': '不可用',
  'confirm.title': '确认启用 Full access？',
  'confirm.description': '启用 Full access 后，新会话将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任后续任务时使用。',
  'confirm.acknowledge': '我已了解风险，并愿意继续',
  'confirm.cancel': '取消',
  'confirm.enable': '启用 Full access',
} satisfies Record<string, string>

/** The settings.permission namespace key union. */
export type PermissionSettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'title': 'Permission',
  'description': 'Choose the default permission mode for new sessions',
  'loading': 'Loading',
  'unavailable': 'Unavailable',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access lets new sessions reduce confirmation steps and perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust subsequent tasks.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
} satisfies Record<PermissionSettingsKey, string>

/** Simplified Chinese dictionary for the current-session popup gate. */
export const accessZh = {
  'confirm.title': '确认启用 Full access？',
  'confirm.description': '启用 Full access 后，agent 将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。',
  'confirm.acknowledge': '我已了解风险，并愿意继续',
  'confirm.cancel': '取消',
  'confirm.enable': '启用 Full access',
} satisfies Record<string, string>

/** Current-session popup-gate key union. */
export type PermissionAccessKey = keyof typeof accessZh

/** English dictionary for the current-session popup gate. */
export const accessEn = {
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
} satisfies Record<PermissionAccessKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'title': 'Permessi',
  'description': 'Scegli la modalità di permesso predefinita per le nuove sessioni',
  'loading': 'Caricamento',
  'unavailable': 'Non disponibile',
  'confirm.title': 'Abilitare Full access?',
  'confirm.description': 'Full access consente alle nuove sessioni di ridurre i passaggi di conferma ed eseguire più azioni direttamente, incluse operazioni sensibili, modifiche ai file o comandi esterni. Usalo solo se ti fidi delle attività successive.',
  'confirm.acknowledge': 'Ho capito i rischi e voglio continuare',
  'confirm.cancel': 'Annulla',
  'confirm.enable': 'Abilita Full access',
} satisfies Record<PermissionSettingsKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'title': 'Permisos',
  'description': 'Elige el modo de permisos predeterminado para las sesiones nuevas',
  'loading': 'Cargando',
  'unavailable': 'No disponible',
  'confirm.title': '¿Habilitar Full access?',
  'confirm.description': 'Full access permite que las sesiones nuevas reduzcan los pasos de confirmación y realicen más acciones directamente, incluidas operaciones sensibles, cambios de archivos o comandos externos. Úsalo solo cuando confíes en las tareas siguientes.',
  'confirm.acknowledge': 'Entiendo los riesgos y quiero continuar',
  'confirm.cancel': 'Cancelar',
  'confirm.enable': 'Habilitar Full access',
} satisfies Record<PermissionSettingsKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'title': 'Permissions',
  'description': 'Choisissez le mode de permission par défaut des nouvelles sessions',
  'loading': 'Chargement',
  'unavailable': 'Indisponible',
  'confirm.title': 'Activer Full access ?',
  'confirm.description': 'Full access permet aux nouvelles sessions de réduire les étapes de confirmation et d’effectuer davantage d’actions directement, y compris des opérations sensibles, des modifications de fichiers ou des commandes externes. Ne l’utilisez que si vous faites confiance aux tâches suivantes.',
  'confirm.acknowledge': 'Je comprends les risques et je souhaite continuer',
  'confirm.cancel': 'Annuler',
  'confirm.enable': 'Activer Full access',
} satisfies Record<PermissionSettingsKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'title': 'Berechtigungen',
  'description': 'Standard-Berechtigungsmodus für neue Sitzungen wählen',
  'loading': 'Wird geladen',
  'unavailable': 'Nicht verfügbar',
  'confirm.title': 'Full access aktivieren?',
  'confirm.description': 'Mit Full access reduzieren neue Sitzungen Bestätigungsschritte und führen mehr Aktionen direkt aus, einschließlich sensibler Vorgänge, Dateiänderungen oder externer Befehle. Nur verwenden, wenn Sie den nachfolgenden Aufgaben vertrauen.',
  'confirm.acknowledge': 'Ich verstehe die Risiken und möchte fortfahren',
  'confirm.cancel': 'Abbrechen',
  'confirm.enable': 'Full access aktivieren',
} satisfies Record<PermissionSettingsKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'title': 'Permissões',
  'description': 'Escolha o modo de permissão padrão para novas sessões',
  'loading': 'Carregando',
  'unavailable': 'Indisponível',
  'confirm.title': 'Ativar Full access?',
  'confirm.description': 'O Full access permite que novas sessões reduzam as etapas de confirmação e executem mais ações diretamente, incluindo operações sensíveis, alterações de arquivos ou comandos externos. Use somente quando confiar nas tarefas seguintes.',
  'confirm.acknowledge': 'Entendo os riscos e quero continuar',
  'confirm.cancel': 'Cancelar',
  'confirm.enable': 'Ativar Full access',
} satisfies Record<PermissionSettingsKey, string>

/** accessIt dictionary, checked complete against the zh key set. */
export const accessIt = {
  'confirm.title': 'Abilitare Full access?',
  'confirm.description': 'Full access riduce i passaggi di conferma e consente all’agente di eseguire più azioni direttamente, incluse operazioni sensibili, modifiche ai file o comandi esterni. Usalo solo se ti fidi dell’attività corrente.',
  'confirm.acknowledge': 'Ho capito i rischi e voglio continuare',
  'confirm.cancel': 'Annulla',
  'confirm.enable': 'Abilita Full access',
} satisfies Record<PermissionAccessKey, string>

/** accessEs dictionary, checked complete against the zh key set. */
export const accessEs = {
  'confirm.title': '¿Habilitar Full access?',
  'confirm.description': 'Full access reduce los pasos de confirmación y permite que el agente realice más acciones directamente, incluidas operaciones sensibles, cambios de archivos o comandos externos. Úsalo solo cuando confíes en la tarea actual.',
  'confirm.acknowledge': 'Entiendo los riesgos y quiero continuar',
  'confirm.cancel': 'Cancelar',
  'confirm.enable': 'Habilitar Full access',
} satisfies Record<PermissionAccessKey, string>

/** accessFr dictionary, checked complete against the zh key set. */
export const accessFr = {
  'confirm.title': 'Activer Full access ?',
  'confirm.description': 'Full access réduit les étapes de confirmation et permet à l’agent d’effectuer davantage d’actions directement, y compris des opérations sensibles, des modifications de fichiers ou des commandes externes. Ne l’utilisez que si vous faites confiance à la tâche actuelle.',
  'confirm.acknowledge': 'Je comprends les risques et je souhaite continuer',
  'confirm.cancel': 'Annuler',
  'confirm.enable': 'Activer Full access',
} satisfies Record<PermissionAccessKey, string>

/** accessDe dictionary, checked complete against the zh key set. */
export const accessDe = {
  'confirm.title': 'Full access aktivieren?',
  'confirm.description': 'Mit Full access reduziert der Agent Bestätigungsschritte und führt mehr Aktionen direkt aus, einschließlich sensibler Vorgänge, Dateiänderungen oder externer Befehle. Nur verwenden, wenn Sie der aktuellen Aufgabe vertrauen.',
  'confirm.acknowledge': 'Ich verstehe die Risiken und möchte fortfahren',
  'confirm.cancel': 'Abbrechen',
  'confirm.enable': 'Full access aktivieren',
} satisfies Record<PermissionAccessKey, string>

/** accessPtBr dictionary, checked complete against the zh key set. */
export const accessPtBr = {
  'confirm.title': 'Ativar Full access?',
  'confirm.description': 'O Full access reduz as etapas de confirmação e permite que o agente execute mais ações diretamente, incluindo operações sensíveis, alterações de arquivos ou comandos externos. Use somente quando confiar na tarefa atual.',
  'confirm.acknowledge': 'Entendo os riscos e quero continuar',
  'confirm.cancel': 'Cancelar',
  'confirm.enable': 'Ativar Full access',
} satisfies Record<PermissionAccessKey, string>

/** it dictionary, checked complete against the zh key set. */
