import type { CommonKey } from './zh.ts'

/** it base dictionary for the common namespace, checked complete against the zh key set. */
export const it = {
  'ok': 'OK',
  'cancel': 'Annulla',
  'close': 'Chiudi',
  'copy': 'Copia',
  'copied': 'Copiato',
  'retry': 'Riprova',
  'loading': 'Caricamento…',
  'load.failed': 'Caricamento non riuscito',
  'submit': 'Invia',
  'submitting': 'Invio…',
  'next': 'Avanti',
  'previous': 'Precedente',
  'skip': 'Salta',
  'delete': 'Elimina',
  'edit': 'Modifica',
  'save': 'Salva',
  'search': 'Cerca',
  'more': 'Altro',
  'collapse': 'Comprimi',
  'expand': 'Espandi',
  'back': 'Indietro',
  'unknown': 'Sconosciuto',
  'none': 'Nessuno',
  'truncated': 'Troncato',
} satisfies Record<CommonKey, string>
