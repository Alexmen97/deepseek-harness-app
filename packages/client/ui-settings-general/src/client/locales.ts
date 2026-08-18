/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
} satisfies Record<SettingsKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'trigger': 'Impostazioni',
  'title': 'Impostazioni',
  'close': 'Chiudi',
  'openDocument': 'Apri file di configurazione',
  'openDocument.error': 'Impossibile aprire il file di configurazione',
  'general.nav': 'Generali',
} satisfies Record<SettingsKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'trigger': 'Ajustes',
  'title': 'Ajustes',
  'close': 'Cerrar',
  'openDocument': 'Abrir archivo de configuración',
  'openDocument.error': 'No se pudo abrir el archivo de configuración',
  'general.nav': 'General',
} satisfies Record<SettingsKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'trigger': 'Réglages',
  'title': 'Réglages',
  'close': 'Fermer',
  'openDocument': 'Ouvrir le fichier de configuration',
  'openDocument.error': 'Impossible d’ouvrir le fichier de configuration',
  'general.nav': 'Général',
} satisfies Record<SettingsKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'trigger': 'Einstellungen',
  'title': 'Einstellungen',
  'close': 'Schließen',
  'openDocument': 'Konfigurationsdatei öffnen',
  'openDocument.error': 'Konfigurationsdatei konnte nicht geöffnet werden',
  'general.nav': 'Allgemein',
} satisfies Record<SettingsKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'trigger': 'Ajustes',
  'title': 'Ajustes',
  'close': 'Fechar',
  'openDocument': 'Abrir arquivo de configuração',
  'openDocument.error': 'Não foi possível abrir o arquivo de configuração',
  'general.nav': 'Geral',
} satisfies Record<SettingsKey, string>

/** it dictionary, checked complete against the zh key set. */
