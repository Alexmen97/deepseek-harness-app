/** `question` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'error.incomplete': '请先完成这道问题。',
  'error.unanswered': '请选择一个选项或填写自定义答案。',
  'nav.prev': '上一题',
  'nav.next': '下一题',
  'nav.minimize': '收起问题卡片',
  'nav.maximize': '展开问题卡片',
  'nav.cancel': '放弃整组问题',
  'option.recommended': '推荐',
  'custom.placeholder': '输入你的答案',
  'action.skip': '跳过本题',
  'action.next': '下一题',
  'plan.header': '计划待审',
  'plan.approve': '确认执行',
  'plan.decline': '拒绝',
  'plan.discuss': '去聊天里说',
} satisfies Record<string, string>

/** The question namespace key union. */
export type QuestionKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'error.incomplete': 'Please complete this question first.',
  'error.unanswered': 'Please select an option or enter a custom answer.',
  'nav.prev': 'Previous question',
  'nav.next': 'Next question',
  'nav.minimize': 'Collapse the question card',
  'nav.maximize': 'Expand the question card',
  'nav.cancel': 'Dismiss all questions',
  'option.recommended': 'Recommended',
  'custom.placeholder': 'Type your answer',
  'action.skip': 'Skip this question',
  'action.next': 'Next',
  'plan.header': 'Plan review',
  'plan.approve': 'Approve',
  'plan.decline': 'Refuse',
  'plan.discuss': 'Chat about it',
} satisfies Record<QuestionKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'error.incomplete': 'Completa prima questa domanda.',
  'error.unanswered': 'Seleziona un’opzione o scrivi una risposta personalizzata.',
  'nav.prev': 'Domanda precedente',
  'nav.next': 'Domanda successiva',
  'nav.minimize': 'Comprimi la scheda domanda',
  'nav.maximize': 'Espandi la scheda domanda',
  'nav.cancel': 'Ignora tutte le domande',
  'option.recommended': 'Consigliato',
  'custom.placeholder': 'Scrivi la tua risposta',
  'action.skip': 'Salta questa domanda',
  'action.next': 'Avanti',
  'plan.header': 'Revisione del piano',
  'plan.approve': 'Approva',
  'plan.decline': 'Rifiuta',
  'plan.discuss': 'Discutine in chat',
} satisfies Record<QuestionKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'error.incomplete': 'Completa primero esta pregunta.',
  'error.unanswered': 'Selecciona una opción o escribe una respuesta personalizada.',
  'nav.prev': 'Pregunta anterior',
  'nav.next': 'Pregunta siguiente',
  'nav.minimize': 'Contraer la tarjeta de pregunta',
  'nav.maximize': 'Expandir la tarjeta de pregunta',
  'nav.cancel': 'Descartar todas las preguntas',
  'option.recommended': 'Recomendado',
  'custom.placeholder': 'Escribe tu respuesta',
  'action.skip': 'Saltar esta pregunta',
  'action.next': 'Siguiente',
  'plan.header': 'Revisión del plan',
  'plan.approve': 'Aprobar',
  'plan.decline': 'Rechazar',
  'plan.discuss': 'Comentarlo en el chat',
} satisfies Record<QuestionKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'error.incomplete': 'Veuillez d’abord compléter cette question.',
  'error.unanswered': 'Sélectionnez une option ou saisissez une réponse personnalisée.',
  'nav.prev': 'Question précédente',
  'nav.next': 'Question suivante',
  'nav.minimize': 'Réduire la carte de question',
  'nav.maximize': 'Développer la carte de question',
  'nav.cancel': 'Ignorer toutes les questions',
  'option.recommended': 'Recommandé',
  'custom.placeholder': 'Saisissez votre réponse',
  'action.skip': 'Ignorer cette question',
  'action.next': 'Suivant',
  'plan.header': 'Examen du plan',
  'plan.approve': 'Approuver',
  'plan.decline': 'Refuser',
  'plan.discuss': 'En discuter dans le chat',
} satisfies Record<QuestionKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'error.incomplete': 'Bitte vervollständigen Sie zuerst diese Frage.',
  'error.unanswered': 'Wählen Sie eine Option oder geben Sie eine eigene Antwort ein.',
  'nav.prev': 'Vorherige Frage',
  'nav.next': 'Nächste Frage',
  'nav.minimize': 'Fragenkarte einklappen',
  'nav.maximize': 'Fragenkarte ausklappen',
  'nav.cancel': 'Alle Fragen verwerfen',
  'option.recommended': 'Empfohlen',
  'custom.placeholder': 'Antwort eingeben',
  'action.skip': 'Diese Frage überspringen',
  'action.next': 'Weiter',
  'plan.header': 'Planprüfung',
  'plan.approve': 'Genehmigen',
  'plan.decline': 'Ablehnen',
  'plan.discuss': 'Im Chat besprechen',
} satisfies Record<QuestionKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'error.incomplete': 'Complete esta pergunta primeiro.',
  'error.unanswered': 'Selecione uma opção ou digite uma resposta personalizada.',
  'nav.prev': 'Pergunta anterior',
  'nav.next': 'Próxima pergunta',
  'nav.minimize': 'Recolher o cartão de pergunta',
  'nav.maximize': 'Expandir o cartão de pergunta',
  'nav.cancel': 'Descartar todas as perguntas',
  'option.recommended': 'Recomendado',
  'custom.placeholder': 'Digite sua resposta',
  'action.skip': 'Pular esta pergunta',
  'action.next': 'Próxima',
  'plan.header': 'Revisão do plano',
  'plan.approve': 'Aprovar',
  'plan.decline': 'Recusar',
  'plan.discuss': 'Conversar sobre isso no chat',
} satisfies Record<QuestionKey, string>
