/** `command` namespace dictionaries (the popupSelect shell's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'search.placeholder': '搜索…',
  'search.aria': '筛选选项',
  'status.loading': '正在加载选项…',
  'status.applying': '正在应用…',
  'status.empty': '无选项',
  'overlay.aria': '/{command} 选项',
  'listbox.aria': '/{command} 匹配项',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
} satisfies Record<CommandKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'search.placeholder': 'Cerca…',
  'search.aria': 'Filtra opzioni',
  'status.loading': 'Caricamento opzioni…',
  'status.applying': 'Applicazione…',
  'status.empty': 'Nessuna opzione',
  'overlay.aria': 'Opzioni /{command}',
  'listbox.aria': 'Corrispondenze /{command}',
} satisfies Record<CommandKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'search.placeholder': 'Buscar…',
  'search.aria': 'Filtrar opciones',
  'status.loading': 'Cargando opciones…',
  'status.applying': 'Aplicando…',
  'status.empty': 'Sin opciones',
  'overlay.aria': 'Opciones de /{command}',
  'listbox.aria': 'Coincidencias de /{command}',
} satisfies Record<CommandKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'search.placeholder': 'Rechercher…',
  'search.aria': 'Filtrer les options',
  'status.loading': 'Chargement des options…',
  'status.applying': 'Application…',
  'status.empty': 'Aucune option',
  'overlay.aria': 'Options /{command}',
  'listbox.aria': 'Correspondances /{command}',
} satisfies Record<CommandKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'search.placeholder': 'Suchen…',
  'search.aria': 'Optionen filtern',
  'status.loading': 'Optionen werden geladen…',
  'status.applying': 'Wird angewendet…',
  'status.empty': 'Keine Optionen',
  'overlay.aria': '/{command}-Optionen',
  'listbox.aria': '/{command}-Treffer',
} satisfies Record<CommandKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'search.placeholder': 'Pesquisar…',
  'search.aria': 'Filtrar opções',
  'status.loading': 'Carregando opções…',
  'status.applying': 'Aplicando…',
  'status.empty': 'Nenhuma opção',
  'overlay.aria': 'Opções de /{command}',
  'listbox.aria': 'Correspondências de /{command}',
} satisfies Record<CommandKey, string>

/** it dictionary, checked complete against the zh key set. */
