/** `workflowRun` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'workflowRun'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'run.title': '{name}',
  'run.members.one': '{count} 个成员',
  'run.members.other': '{count} 个成员',
  'run.empty': '没有启动成员',
  'phase.unassigned': '未分阶段',
  'phase.empty': '空阶段名',
  'statusCount.running': '运行中 {count}',
  'statusCount.completed': '已完成 {count}',
  'statusCount.failed': '失败 {count}',
  'statusCount.cancelled': '已取消 {count}',
  'statusCount.interrupted': '已中断 {count}',
  'member.empty': '空成员名',
  'member.open': '打开 {name}',
  'status.running': '运行中',
  'status.completed': '已完成',
  'status.failed': '失败',
  'status.cancelled': '已取消',
  'status.interrupted': '已中断',
}

/** English dictionary (same key set). */
export const en: Record<WorkflowRunKey, string> = {
  'run.title': '{name}',
  'run.members.one': '{count} member',
  'run.members.other': '{count} members',
  'run.empty': 'No members started',
  'phase.unassigned': 'Unphased',
  'phase.empty': 'Empty phase name',
  'statusCount.running': 'Running {count}',
  'statusCount.completed': 'Completed {count}',
  'statusCount.failed': 'Failed {count}',
  'statusCount.cancelled': 'Cancelled {count}',
  'statusCount.interrupted': 'Interrupted {count}',
  'member.empty': 'Empty member name',
  'member.open': 'Open {name}',
  'status.running': 'Running',
  'status.completed': 'Completed',
  'status.failed': 'Failed',
  'status.cancelled': 'Cancelled',
  'status.interrupted': 'Interrupted',
}

/** Union of this namespace's dictionary keys. */
export type WorkflowRunKey = keyof typeof zh

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'run.title': '{name}',
  'run.members.one': '{count} membro',
  'run.members.other': '{count} membri',
  'run.empty': 'Nessun membro avviato',
  'phase.unassigned': 'Senza fase',
  'phase.empty': 'Nome fase vuoto',
  'statusCount.running': 'In esecuzione {count}',
  'statusCount.completed': 'Completati {count}',
  'statusCount.failed': 'Non riusciti {count}',
  'statusCount.cancelled': 'Annullati {count}',
  'statusCount.interrupted': 'Interrotti {count}',
  'member.empty': 'Nome membro vuoto',
  'member.open': 'Apri {name}',
  'status.running': 'In esecuzione',
  'status.completed': 'Completato',
  'status.failed': 'Non riuscito',
  'status.cancelled': 'Annullato',
  'status.interrupted': 'Interrotto',
} satisfies Record<WorkflowRunKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'run.title': '{name}',
  'run.members.one': '{count} miembro',
  'run.members.other': '{count} miembros',
  'run.empty': 'No se inició ningún miembro',
  'phase.unassigned': 'Sin fase',
  'phase.empty': 'Nombre de fase vacío',
  'statusCount.running': 'Ejecutándose {count}',
  'statusCount.completed': 'Completados {count}',
  'statusCount.failed': 'Fallidos {count}',
  'statusCount.cancelled': 'Cancelados {count}',
  'statusCount.interrupted': 'Interrumpidos {count}',
  'member.empty': 'Nombre de miembro vacío',
  'member.open': 'Abrir {name}',
  'status.running': 'Ejecutándose',
  'status.completed': 'Completado',
  'status.failed': 'Fallido',
  'status.cancelled': 'Cancelado',
  'status.interrupted': 'Interrumpido',
} satisfies Record<WorkflowRunKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'run.title': '{name}',
  'run.members.one': '{count} membre',
  'run.members.other': '{count} membres',
  'run.empty': 'Aucun membre démarré',
  'phase.unassigned': 'Sans phase',
  'phase.empty': 'Nom de phase vide',
  'statusCount.running': 'En cours {count}',
  'statusCount.completed': 'Terminés {count}',
  'statusCount.failed': 'Échoués {count}',
  'statusCount.cancelled': 'Annulés {count}',
  'statusCount.interrupted': 'Interrompus {count}',
  'member.empty': 'Nom de membre vide',
  'member.open': 'Ouvrir {name}',
  'status.running': 'En cours',
  'status.completed': 'Terminé',
  'status.failed': 'Échoué',
  'status.cancelled': 'Annulé',
  'status.interrupted': 'Interrompu',
} satisfies Record<WorkflowRunKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'run.title': '{name}',
  'run.members.one': '{count} Mitglied',
  'run.members.other': '{count} Mitglieder',
  'run.empty': 'Keine Mitglieder gestartet',
  'phase.unassigned': 'Ohne Phase',
  'phase.empty': 'Leerer Phasenname',
  'statusCount.running': 'Läuft {count}',
  'statusCount.completed': 'Abgeschlossen {count}',
  'statusCount.failed': 'Fehlgeschlagen {count}',
  'statusCount.cancelled': 'Abgebrochen {count}',
  'statusCount.interrupted': 'Unterbrochen {count}',
  'member.empty': 'Leerer Mitgliedsname',
  'member.open': '{name} öffnen',
  'status.running': 'Läuft',
  'status.completed': 'Abgeschlossen',
  'status.failed': 'Fehlgeschlagen',
  'status.cancelled': 'Abgebrochen',
  'status.interrupted': 'Unterbrochen',
} satisfies Record<WorkflowRunKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'run.title': '{name}',
  'run.members.one': '{count} membro',
  'run.members.other': '{count} membros',
  'run.empty': 'Nenhum membro iniciado',
  'phase.unassigned': 'Sem fase',
  'phase.empty': 'Nome de fase vazio',
  'statusCount.running': 'Em execução {count}',
  'statusCount.completed': 'Concluídos {count}',
  'statusCount.failed': 'Com falha {count}',
  'statusCount.cancelled': 'Cancelados {count}',
  'statusCount.interrupted': 'Interrompidos {count}',
  'member.empty': 'Nome de membro vazio',
  'member.open': 'Abrir {name}',
  'status.running': 'Em execução',
  'status.completed': 'Concluído',
  'status.failed': 'Com falha',
  'status.cancelled': 'Cancelado',
  'status.interrupted': 'Interrompido',
} satisfies Record<WorkflowRunKey, string>
