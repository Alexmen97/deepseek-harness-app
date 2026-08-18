/** `goal` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'phase.active': '进行中的目标',
  'phase.paused': '已暂停的目标',
  'phase.blocked': '受阻的目标',
  'objective.aria': '目标内容',
  'commandInput.aria': '命令输入',
  'action.save': '保存目标',
  'action.cancel': '取消编辑',
  'action.pause': '暂停目标',
  'action.resume': '恢复目标',
  'action.edit': '编辑目标',
  'action.clear': '清除目标',
} satisfies Record<string, string>

/** The goal namespace key union. */
export type GoalKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'phase.active': 'Ongoing Goal',
  'phase.paused': 'Paused Goal',
  'phase.blocked': 'Blocked Goal',
  'objective.aria': 'Goal objective',
  'commandInput.aria': 'Command input',
  'action.save': 'Save goal',
  'action.cancel': 'Cancel edit',
  'action.pause': 'Pause goal',
  'action.resume': 'Resume goal',
  'action.edit': 'Edit goal',
  'action.clear': 'Clear goal',
} satisfies Record<GoalKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'phase.active': 'Obiettivo in corso',
  'phase.paused': 'Obiettivo in pausa',
  'phase.blocked': 'Obiettivo bloccato',
  'objective.aria': 'Obiettivo',
  'commandInput.aria': 'Input comandi',
  'action.save': 'Salva obiettivo',
  'action.cancel': 'Annulla modifica',
  'action.pause': 'Metti in pausa',
  'action.resume': 'Riprendi obiettivo',
  'action.edit': 'Modifica obiettivo',
  'action.clear': 'Cancella obiettivo',
} satisfies Record<GoalKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'phase.active': 'Objetivo en curso',
  'phase.paused': 'Objetivo en pausa',
  'phase.blocked': 'Objetivo bloqueado',
  'objective.aria': 'Objetivo',
  'commandInput.aria': 'Entrada de comandos',
  'action.save': 'Guardar objetivo',
  'action.cancel': 'Cancelar edición',
  'action.pause': 'Pausar objetivo',
  'action.resume': 'Reanudar objetivo',
  'action.edit': 'Editar objetivo',
  'action.clear': 'Borrar objetivo',
} satisfies Record<GoalKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'phase.active': 'Objectif en cours',
  'phase.paused': 'Objectif en pause',
  'phase.blocked': 'Objectif bloqué',
  'objective.aria': 'Objectif',
  'commandInput.aria': 'Saisie de commande',
  'action.save': 'Enregistrer l’objectif',
  'action.cancel': 'Annuler la modification',
  'action.pause': 'Mettre en pause',
  'action.resume': 'Reprendre l’objectif',
  'action.edit': 'Modifier l’objectif',
  'action.clear': 'Effacer l’objectif',
} satisfies Record<GoalKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'phase.active': 'Laufendes Ziel',
  'phase.paused': 'Pausiertes Ziel',
  'phase.blocked': 'Blockiertes Ziel',
  'objective.aria': 'Ziel',
  'commandInput.aria': 'Befehlseingabe',
  'action.save': 'Ziel speichern',
  'action.cancel': 'Bearbeitung abbrechen',
  'action.pause': 'Ziel pausieren',
  'action.resume': 'Ziel fortsetzen',
  'action.edit': 'Ziel bearbeiten',
  'action.clear': 'Ziel löschen',
} satisfies Record<GoalKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'phase.active': 'Objetivo em andamento',
  'phase.paused': 'Objetivo em pausa',
  'phase.blocked': 'Objetivo bloqueado',
  'objective.aria': 'Objetivo',
  'commandInput.aria': 'Entrada de comando',
  'action.save': 'Salvar objetivo',
  'action.cancel': 'Cancelar edição',
  'action.pause': 'Pausar objetivo',
  'action.resume': 'Retomar objetivo',
  'action.edit': 'Editar objetivo',
  'action.clear': 'Limpar objetivo',
} satisfies Record<GoalKey, string>

/** it dictionary, checked complete against the zh key set. */
