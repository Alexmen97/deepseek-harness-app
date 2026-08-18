/** `settings.theme` namespace dictionaries (the Appearance row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'appearance.title': '外观',
  'appearance.light': '浅色',
  'appearance.dark': '深色',
  'appearance.system': '跟随系统',
} satisfies Record<string, string>

/** The settings.theme namespace key union. */
export type ThemeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'appearance.title': 'Appearance',
  'appearance.light': 'Light',
  'appearance.dark': 'Dark',
  'appearance.system': 'System',
} satisfies Record<ThemeKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'appearance.title': 'Aspetto',
  'appearance.light': 'Chiaro',
  'appearance.dark': 'Scuro',
  'appearance.system': 'Sistema',
} satisfies Record<ThemeKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'appearance.title': 'Apariencia',
  'appearance.light': 'Claro',
  'appearance.dark': 'Oscuro',
  'appearance.system': 'Sistema',
} satisfies Record<ThemeKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'appearance.title': 'Apparence',
  'appearance.light': 'Clair',
  'appearance.dark': 'Sombre',
  'appearance.system': 'Système',
} satisfies Record<ThemeKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'appearance.title': 'Darstellung',
  'appearance.light': 'Hell',
  'appearance.dark': 'Dunkel',
  'appearance.system': 'System',
} satisfies Record<ThemeKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'appearance.title': 'Aparência',
  'appearance.light': 'Claro',
  'appearance.dark': 'Escuro',
  'appearance.system': 'Sistema',
} satisfies Record<ThemeKey, string>

/** it dictionary, checked complete against the zh key set. */
