/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new': '新会话',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
} satisfies Record<SidebarKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'session.new': 'Nuova sessione',
  'session.new.label': 'Nuova sessione',
  'toggle.open': 'Apri barra laterale',
  'toggle.collapse': 'Comprimi barra laterale',
} satisfies Record<SidebarKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'session.new': 'Nueva sesión',
  'session.new.label': 'Nueva sesión',
  'toggle.open': 'Abrir barra lateral',
  'toggle.collapse': 'Contraer barra lateral',
} satisfies Record<SidebarKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'session.new': 'Nouvelle session',
  'session.new.label': 'Nouvelle session',
  'toggle.open': 'Ouvrir la barre latérale',
  'toggle.collapse': 'Réduire la barre latérale',
} satisfies Record<SidebarKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'session.new': 'Neue Sitzung',
  'session.new.label': 'Neue Sitzung',
  'toggle.open': 'Seitenleiste öffnen',
  'toggle.collapse': 'Seitenleiste einklappen',
} satisfies Record<SidebarKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'session.new': 'Nova sessão',
  'session.new.label': 'Nova sessão',
  'toggle.open': 'Abrir barra lateral',
  'toggle.collapse': 'Recolher barra lateral',
} satisfies Record<SidebarKey, string>

/** it dictionary, checked complete against the zh key set. */
