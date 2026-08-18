/** `deliverables` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'deliverables'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'produced.label': '产物',
  'produced.moreOne': '+ 1 个文件',
  'produced.more': '+ {count} 个文件',
  'produced.open': '打开 {name}',
  'produced.showInFolder': '在文件夹中显示',
}

/** English dictionary (same key set). */
export const en: Record<DeliverablesKey, string> = {
  'produced.label': 'Produced',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} files',
  'produced.open': 'Open {name}',
  'produced.showInFolder': 'Show in folder',
}

/** Union of this namespace's dictionary keys. */
export type DeliverablesKey = keyof typeof zh

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'produced.label': 'Prodotti',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} file',
  'produced.open': 'Apri {name}',
  'produced.showInFolder': 'Mostra nella cartella',
} satisfies Record<DeliverablesKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'produced.label': 'Entregables',
  'produced.moreOne': '+ 1 archivo',
  'produced.more': '+ {count} archivos',
  'produced.open': 'Abrir {name}',
  'produced.showInFolder': 'Mostrar en la carpeta',
} satisfies Record<DeliverablesKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'produced.label': 'Livrables',
  'produced.moreOne': '+ 1 fichier',
  'produced.more': '+ {count} fichiers',
  'produced.open': 'Ouvrir {name}',
  'produced.showInFolder': 'Afficher dans le dossier',
} satisfies Record<DeliverablesKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'produced.label': 'Ergebnisse',
  'produced.moreOne': '+ 1 Datei',
  'produced.more': '+ {count} Dateien',
  'produced.open': '{name} öffnen',
  'produced.showInFolder': 'Im Ordner anzeigen',
} satisfies Record<DeliverablesKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'produced.label': 'Entregas',
  'produced.moreOne': '+ 1 arquivo',
  'produced.more': '+ {count} arquivos',
  'produced.open': 'Abrir {name}',
  'produced.showInFolder': 'Mostrar na pasta',
} satisfies Record<DeliverablesKey, string>

/** it dictionary, checked complete against the zh key set. */
