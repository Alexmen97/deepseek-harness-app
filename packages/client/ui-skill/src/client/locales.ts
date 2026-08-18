/** `skill` namespace dictionaries for the dedicated tool row. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'skill'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'row.running': '正在加载 skill',
  'row.failed': 'skill 加载失败',
  'row.stopped': 'skill 加载已中止',
  'row.instructions': '说明',
  'menu.userOnly': '仅用户',
} satisfies Record<string, string>

/** The skill namespace key union. */
export type SkillKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'row.running': 'Loading skill',
  'row.failed': 'Skill load failed',
  'row.stopped': 'Skill load stopped',
  'row.instructions': 'Instructions',
  'menu.userOnly': 'user-only',
} satisfies Record<SkillKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'row.running': 'Caricamento skill',
  'row.failed': 'Caricamento skill non riuscito',
  'row.stopped': 'Caricamento skill interrotto',
  'row.instructions': 'Istruzioni',
  'menu.userOnly': 'solo utente',
} satisfies Record<SkillKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'row.running': 'Cargando skill',
  'row.failed': 'Error al cargar la skill',
  'row.stopped': 'Carga de la skill detenida',
  'row.instructions': 'Instrucciones',
  'menu.userOnly': 'solo usuario',
} satisfies Record<SkillKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'row.running': 'Chargement de la compétence',
  'row.failed': 'Échec du chargement de la compétence',
  'row.stopped': 'Chargement de la compétence arrêté',
  'row.instructions': 'Instructions',
  'menu.userOnly': 'utilisateur uniquement',
} satisfies Record<SkillKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'row.running': 'Skill wird geladen',
  'row.failed': 'Laden des Skills fehlgeschlagen',
  'row.stopped': 'Laden des Skills gestoppt',
  'row.instructions': 'Anweisungen',
  'menu.userOnly': 'nur Benutzer',
} satisfies Record<SkillKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'row.running': 'Carregando skill',
  'row.failed': 'Falha ao carregar a skill',
  'row.stopped': 'Carregamento da skill interrompido',
  'row.instructions': 'Instruções',
  'menu.userOnly': 'somente usuário',
} satisfies Record<SkillKey, string>

/** it dictionary, checked complete against the zh key set. */
