/** `feedback` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.like': '好的回答',
  'action.likeActive': '取消标记',
  'action.dislike': '有问题的回答',
  'action.dislikeActive': '取消标记',
  'note.open': '补充说明',
  'note.placeholder': '这条回答哪里好，或哪里有问题？（可选）',
  'note.save': '保存',
  'note.cancel': '取消',
  'note.aria': '反馈说明',
  'error.conflict': '这条反馈已在别处改动，已显示最新状态',
  'error.load': '反馈状态加载失败',
  'error.generic': '反馈保存失败',
} satisfies Record<string, string>

/** The feedback namespace key union. */
export type MessageFeedbackKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The per-message feedback controls' copy. */
    feedback: MessageFeedbackKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.like': 'Good response',
  'action.likeActive': 'Remove rating',
  'action.dislike': 'Bad response',
  'action.dislikeActive': 'Remove rating',
  'note.open': 'Add a note',
  'note.placeholder': 'What was good, or what went wrong? (optional)',
  'note.save': 'Save',
  'note.cancel': 'Cancel',
  'note.aria': 'Feedback note',
  'error.conflict': 'This feedback changed elsewhere; the latest state is shown',
  'error.load': 'Could not load feedback',
  'error.generic': 'Could not save feedback',
} satisfies Record<MessageFeedbackKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'action.like': 'Risposta utile',
  'action.likeActive': 'Rimuovi valutazione',
  'action.dislike': 'Risposta problematica',
  'action.dislikeActive': 'Rimuovi valutazione',
  'note.open': 'Aggiungi una nota',
  'note.placeholder': 'Cosa è andato bene o male? (facoltativo)',
  'note.save': 'Salva',
  'note.cancel': 'Annulla',
  'note.aria': 'Nota di feedback',
  'error.conflict': 'Il feedback è cambiato altrove; viene mostrato lo stato più recente',
  'error.load': 'Impossibile caricare il feedback',
  'error.generic': 'Impossibile salvare il feedback',
} satisfies Record<MessageFeedbackKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'action.like': 'Buena respuesta',
  'action.likeActive': 'Quitar calificación',
  'action.dislike': 'Mala respuesta',
  'action.dislikeActive': 'Quitar calificación',
  'note.open': 'Añadir una nota',
  'note.placeholder': '¿Qué estuvo bien o qué salió mal? (opcional)',
  'note.save': 'Guardar',
  'note.cancel': 'Cancelar',
  'note.aria': 'Nota de comentarios',
  'error.conflict': 'Este comentario cambió en otro lugar; se muestra el estado más reciente',
  'error.load': 'No se pudo cargar el comentario',
  'error.generic': 'No se pudo guardar el comentario',
} satisfies Record<MessageFeedbackKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'action.like': 'Bonne réponse',
  'action.likeActive': 'Retirer l’évaluation',
  'action.dislike': 'Mauvaise réponse',
  'action.dislikeActive': 'Retirer l’évaluation',
  'note.open': 'Ajouter une note',
  'note.placeholder': 'Qu’est-ce qui était bien ou qu’est-ce qui a mal tourné ? (facultatif)',
  'note.save': 'Enregistrer',
  'note.cancel': 'Annuler',
  'note.aria': 'Note de commentaire',
  'error.conflict': 'Ce commentaire a changé ailleurs ; l’état le plus récent est affiché',
  'error.load': 'Impossible de charger le commentaire',
  'error.generic': 'Impossible d’enregistrer le commentaire',
} satisfies Record<MessageFeedbackKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'action.like': 'Gute Antwort',
  'action.likeActive': 'Bewertung entfernen',
  'action.dislike': 'Schlechte Antwort',
  'action.dislikeActive': 'Bewertung entfernen',
  'note.open': 'Notiz hinzufügen',
  'note.placeholder': 'Was war gut oder was lief schief? (optional)',
  'note.save': 'Speichern',
  'note.cancel': 'Abbrechen',
  'note.aria': 'Feedback-Notiz',
  'error.conflict': 'Dieses Feedback wurde andernorts geändert; der neueste Stand wird angezeigt',
  'error.load': 'Feedback konnte nicht geladen werden',
  'error.generic': 'Feedback konnte nicht gespeichert werden',
} satisfies Record<MessageFeedbackKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'action.like': 'Boa resposta',
  'action.likeActive': 'Remover avaliação',
  'action.dislike': 'Resposta ruim',
  'action.dislikeActive': 'Remover avaliação',
  'note.open': 'Adicionar uma nota',
  'note.placeholder': 'O que foi bom ou o que deu errado? (opcional)',
  'note.save': 'Salvar',
  'note.cancel': 'Cancelar',
  'note.aria': 'Nota de feedback',
  'error.conflict': 'Este feedback mudou em outro lugar; o estado mais recente é exibido',
  'error.load': 'Não foi possível carregar o feedback',
  'error.generic': 'Não foi possível salvar o feedback',
} satisfies Record<MessageFeedbackKey, string>

/** it dictionary, checked complete against the zh key set. */
