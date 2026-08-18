/** `plan` namespace dictionaries (the composer plan chip's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'chip.on.aria': 'plan mode 已开启，按下关闭',
  'chip.on.title': 'plan mode 已开启 — 点击关闭（/plan off）',
  'chip.off.aria': 'plan mode 已关闭，按下开启',
  'chip.off.title': 'plan mode 已关闭 — 点击开启（/plan）',
} satisfies Record<string, string>

/** The plan namespace key union. */
export type PlanKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'chip.on.aria': 'Plan mode on, press to turn off',
  'chip.on.title': 'Plan mode on — click to turn off (/plan off)',
  'chip.off.aria': 'Plan mode off, press to turn on',
  'chip.off.title': 'Plan mode off — click to turn on (/plan)',
} satisfies Record<PlanKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'chip.on.aria': 'Modalità piano attiva, premi per disattivare',
  'chip.on.title': 'Modalità piano attiva — clicca per disattivare (/plan off)',
  'chip.off.aria': 'Modalità piano disattivata, premi per attivare',
  'chip.off.title': 'Modalità piano disattivata — clicca per attivare (/plan)',
} satisfies Record<PlanKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'chip.on.aria': 'Modo plan activado, pulsa para desactivar',
  'chip.on.title': 'Modo plan activado: haz clic para desactivarlo (/plan off)',
  'chip.off.aria': 'Modo plan desactivado, pulsa para activar',
  'chip.off.title': 'Modo plan desactivado: haz clic para activarlo (/plan)',
} satisfies Record<PlanKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'chip.on.aria': 'Mode plan activé, appuyez pour désactiver',
  'chip.on.title': 'Mode plan activé — cliquez pour désactiver (/plan off)',
  'chip.off.aria': 'Mode plan désactivé, appuyez pour activer',
  'chip.off.title': 'Mode plan désactivé — cliquez pour activer (/plan)',
} satisfies Record<PlanKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'chip.on.aria': 'Plan-Modus aktiv, zum Deaktivieren drücken',
  'chip.on.title': 'Plan-Modus aktiv — zum Deaktivieren klicken (/plan off)',
  'chip.off.aria': 'Plan-Modus inaktiv, zum Aktivieren drücken',
  'chip.off.title': 'Plan-Modus inaktiv — zum Aktivieren klicken (/plan)',
} satisfies Record<PlanKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'chip.on.aria': 'Modo plano ativado, pressione para desativar',
  'chip.on.title': 'Modo plano ativado — clique para desativar (/plan off)',
  'chip.off.aria': 'Modo plano desativado, pressione para ativar',
  'chip.off.title': 'Modo plano desativado — clique para ativar (/plan)',
} satisfies Record<PlanKey, string>

/** it dictionary, checked complete against the zh key set. */
