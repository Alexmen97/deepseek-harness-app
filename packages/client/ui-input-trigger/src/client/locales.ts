/**
 * `slash.menu` namespace dictionaries: group titles keyed by source name
 * (the lookup chain returns the key itself, so an unknown source shows its
 * raw name), the pending row, and the listbox aria label.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'command': '命令',
  'skill': '技能',
  'subagent': '子智能体',
  'loading': '正在加载…',
  'suggestions.aria': '触发候选建议',
} satisfies Record<string, string>

/** The slash.menu namespace key union. */
export type MenuKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'command': 'Commands',
  'skill': 'Skills',
  'subagent': 'Subagents',
  'loading': 'Loading…',
  'suggestions.aria': 'Trigger suggestions',
} satisfies Record<MenuKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'command': 'Comandi',
  'skill': 'Competenze',
  'subagent': 'Subagenti',
  'loading': 'Caricamento…',
  'suggestions.aria': 'Suggerimenti trigger',
} satisfies Record<MenuKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'command': 'Comandos',
  'skill': 'Habilidades',
  'subagent': 'Subagentes',
  'loading': 'Cargando…',
  'suggestions.aria': 'Sugerencias de activación',
} satisfies Record<MenuKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'command': 'Commandes',
  'skill': 'Compétences',
  'subagent': 'Sous-agents',
  'loading': 'Chargement…',
  'suggestions.aria': 'Suggestions de déclenchement',
} satisfies Record<MenuKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'command': 'Befehle',
  'skill': 'Skills',
  'subagent': 'Subagenten',
  'loading': 'Wird geladen…',
  'suggestions.aria': 'Auslöser-Vorschläge',
} satisfies Record<MenuKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'command': 'Comandos',
  'skill': 'Habilidades',
  'subagent': 'Subagentes',
  'loading': 'Carregando…',
  'suggestions.aria': 'Sugestões de gatilho',
} satisfies Record<MenuKey, string>
