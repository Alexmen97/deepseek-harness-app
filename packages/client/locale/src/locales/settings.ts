/** `settings.locale` namespace dictionaries (the Language row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'language.title': '语言',
} satisfies Record<string, string>

/** The settings.locale namespace key union. */
export type SettingsLocaleKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'language.title': 'Language',
} satisfies Record<SettingsLocaleKey, string>

/** Italian dictionary, checked complete against the zh key set. */
export const it = {
  'language.title': 'Lingua',
} satisfies Record<SettingsLocaleKey, string>

/** Spanish dictionary, checked complete against the zh key set. */
export const es = {
  'language.title': 'Idioma',
} satisfies Record<SettingsLocaleKey, string>

/** French dictionary, checked complete against the zh key set. */
export const fr = {
  'language.title': 'Langue',
} satisfies Record<SettingsLocaleKey, string>

/** German dictionary, checked complete against the zh key set. */
export const de = {
  'language.title': 'Sprache',
} satisfies Record<SettingsLocaleKey, string>

/** Brazilian Portuguese dictionary, checked complete against the zh key set. */
export const ptBr = {
  'language.title': 'Idioma',
} satisfies Record<SettingsLocaleKey, string>
