import type { CommonKey } from './zh.ts'

/** de base dictionary for the common namespace, checked complete against the zh key set. */
export const de = {
  'ok': 'OK',
  'cancel': 'Abbrechen',
  'close': 'Schließen',
  'copy': 'Kopieren',
  'copied': 'Kopiert',
  'retry': 'Erneut versuchen',
  'loading': 'Wird geladen…',
  'load.failed': 'Laden fehlgeschlagen',
  'submit': 'Senden',
  'submitting': 'Wird gesendet…',
  'next': 'Weiter',
  'previous': 'Vorherige',
  'skip': 'Überspringen',
  'delete': 'Löschen',
  'edit': 'Bearbeiten',
  'save': 'Speichern',
  'search': 'Suchen',
  'more': 'Mehr',
  'collapse': 'Einklappen',
  'expand': 'Ausklappen',
  'back': 'Zurück',
  'unknown': 'Unbekannt',
  'none': 'Keine',
  'truncated': 'Abgeschnitten',
} satisfies Record<CommonKey, string>
