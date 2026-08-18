/** `job` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'job'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'count.live.one': '{count} 个后台任务运行中',
  'count.live.other': '{count} 个后台任务运行中',
  'count.idle.one': '{count} 个后台任务',
  'count.idle.other': '{count} 个后台任务',
  'list.aria': '后台任务',
  'status.running': '运行中',
  'status.stopping': '正在停止',
  'status.completed': '已完成',
  'status.killed': '已取消',
  'status.failed': '已失败',
  'duration.seconds': '{seconds}秒',
  'duration.minutes': '{minutes}分{seconds}秒',
  'duration.hours': '{hours}小时{minutes}分',
  'duration.title.live': '已运行 {duration}',
  'duration.title.done': '耗时 {duration}',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<JobKey, string> = {
  'count.live.one': '{count} background job running',
  'count.live.other': '{count} background jobs running',
  'count.idle.one': '{count} background job',
  'count.idle.other': '{count} background jobs',
  'list.aria': 'Background jobs',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'cancelled',
  'status.failed': 'failed',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Running for {duration}',
  'duration.title.done': 'Took {duration}',
}

/** Key domain of the `job` namespace (zh is the source of truth). */
export type JobKey = keyof typeof zh

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'count.live.one': '{count} attività in background in esecuzione',
  'count.live.other': '{count} attività in background in esecuzione',
  'count.idle.one': '{count} attività in background',
  'count.idle.other': '{count} attività in background',
  'list.aria': 'Attività in background',
  'status.running': 'in esecuzione',
  'status.stopping': 'arresto in corso',
  'status.completed': 'completata',
  'status.killed': 'annullata',
  'status.failed': 'non riuscita',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'In esecuzione da {duration}',
  'duration.title.done': 'Durata: {duration}',
} satisfies Record<JobKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'count.live.one': '{count} tarea en segundo plano ejecutándose',
  'count.live.other': '{count} tareas en segundo plano ejecutándose',
  'count.idle.one': '{count} tarea en segundo plano',
  'count.idle.other': '{count} tareas en segundo plano',
  'list.aria': 'Tareas en segundo plano',
  'status.running': 'ejecutándose',
  'status.stopping': 'deteniéndose',
  'status.completed': 'completada',
  'status.killed': 'cancelada',
  'status.failed': 'fallida',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'En ejecución desde {duration}',
  'duration.title.done': 'Duró {duration}',
} satisfies Record<JobKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'count.live.one': '{count} tâche d’arrière-plan en cours',
  'count.live.other': '{count} tâches d’arrière-plan en cours',
  'count.idle.one': '{count} tâche d’arrière-plan',
  'count.idle.other': '{count} tâches d’arrière-plan',
  'list.aria': 'Tâches d’arrière-plan',
  'status.running': 'en cours',
  'status.stopping': 'arrêt en cours',
  'status.completed': 'terminée',
  'status.killed': 'annulée',
  'status.failed': 'échouée',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'En cours depuis {duration}',
  'duration.title.done': 'A duré {duration}',
} satisfies Record<JobKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'count.live.one': '{count} Hintergrundauftrag wird ausgeführt',
  'count.live.other': '{count} Hintergrundaufträge werden ausgeführt',
  'count.idle.one': '{count} Hintergrundauftrag',
  'count.idle.other': '{count} Hintergrundaufträge',
  'list.aria': 'Hintergrundaufträge',
  'status.running': 'wird ausgeführt',
  'status.stopping': 'wird angehalten',
  'status.completed': 'abgeschlossen',
  'status.killed': 'abgebrochen',
  'status.failed': 'fehlgeschlagen',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Läuft seit {duration}',
  'duration.title.done': 'Dauerte {duration}',
} satisfies Record<JobKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'count.live.one': '{count} tarefa em segundo plano em execução',
  'count.live.other': '{count} tarefas em segundo plano em execução',
  'count.idle.one': '{count} tarefa em segundo plano',
  'count.idle.other': '{count} tarefas em segundo plano',
  'list.aria': 'Tarefas em segundo plano',
  'status.running': 'em execução',
  'status.stopping': 'parando',
  'status.completed': 'concluída',
  'status.killed': 'cancelada',
  'status.failed': 'falhou',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Em execução há {duration}',
  'duration.title.done': 'Levou {duration}',
} satisfies Record<JobKey, string>

/** it dictionary, checked complete against the zh key set. */
