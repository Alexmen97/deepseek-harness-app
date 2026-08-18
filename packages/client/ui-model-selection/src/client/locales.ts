/**
 * `model` namespace dictionaries.
 *
 * `trigger.selectAria` reads identically to `trigger.fallback` today and is
 * still a separate key: the visible fallback label and the accessible name of
 * an unset trigger are free to diverge per locale, and folding it into
 * `trigger.aria` would announce the degenerate "Select model, current Select
 * model".
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'command.description': '选择本会话使用的模型',
  'option.loadError': '目录加载失败：{message}',
  'trigger.fallback': '选择模型',
  'trigger.selectAria': '选择模型',
  'trigger.aria': '选择模型，当前 {model}',
  'trigger.ariaEffort': '选择模型，当前 {model}，推理等级 {effort}',
  'menu.aria': '模型与推理等级',
  'menu.model': '模型',
  'menu.effort': '推理等级',
  'effort.providerDefault': 'Default',
  'status.loading': '正在刷新模型列表…',
  'error.action': '模型操作失败：{message}',
  'action.reload': '重新加载',
  'warning.groupLoad': '{name} 加载失败：{message}',
  'empty.models': '没有可用的模型。',
  'blocked.composer': '当前模型不可用，请先选择模型',
  'empty.efforts': '当前模型未提供推理等级。',
} satisfies Record<string, string>

/** The model namespace key union. */
export type ModelKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'command.description': 'Select the model for this conversation',
  'option.loadError': 'Catalog failed to load: {message}',
  'trigger.fallback': 'Select model',
  'trigger.selectAria': 'Select model',
  'trigger.aria': 'Select model, current {model}',
  'trigger.ariaEffort': 'Select model, current {model}, reasoning effort {effort}',
  'menu.aria': 'Model and reasoning effort',
  'menu.model': 'Model',
  'menu.effort': 'Effort',
  'effort.providerDefault': 'Default',
  'status.loading': 'Refreshing model list…',
  'error.action': 'Model operation failed: {message}',
  'action.reload': 'Reload',
  'warning.groupLoad': '{name} failed to load: {message}',
  'empty.models': 'No models available.',
  'blocked.composer': 'This model is unavailable — select one to continue',
  'empty.efforts': 'This model provides no reasoning effort levels.',
} satisfies Record<ModelKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'command.description': 'Seleziona il modello per questa conversazione',
  'option.loadError': 'Caricamento catalogo non riuscito: {message}',
  'trigger.fallback': 'Seleziona modello',
  'trigger.selectAria': 'Seleziona modello',
  'trigger.aria': 'Seleziona modello, attuale {model}',
  'trigger.ariaEffort': 'Seleziona modello, attuale {model}, livello di ragionamento {effort}',
  'menu.aria': 'Modello e livello di ragionamento',
  'menu.model': 'Modello',
  'menu.effort': 'Livello',
  'effort.providerDefault': 'Default',
  'status.loading': 'Aggiornamento elenco modelli…',
  'error.action': 'Operazione sul modello non riuscita: {message}',
  'action.reload': 'Ricarica',
  'warning.groupLoad': '{name}: caricamento non riuscito: {message}',
  'empty.models': 'Nessun modello disponibile.',
  'blocked.composer': 'Questo modello non è disponibile: selezionane uno per continuare',
  'empty.efforts': 'Questo modello non offre livelli di ragionamento.',
} satisfies Record<ModelKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'command.description': 'Selecciona el modelo de esta conversación',
  'option.loadError': 'Error al cargar el catálogo: {message}',
  'trigger.fallback': 'Seleccionar modelo',
  'trigger.selectAria': 'Seleccionar modelo',
  'trigger.aria': 'Seleccionar modelo, actual {model}',
  'trigger.ariaEffort': 'Seleccionar modelo, actual {model}, esfuerzo de razonamiento {effort}',
  'menu.aria': 'Modelo y esfuerzo de razonamiento',
  'menu.model': 'Modelo',
  'menu.effort': 'Esfuerzo',
  'effort.providerDefault': 'Predeterminado',
  'status.loading': 'Actualizando la lista de modelos…',
  'error.action': 'Error en la operación del modelo: {message}',
  'action.reload': 'Recargar',
  'warning.groupLoad': '{name}: error al cargar: {message}',
  'empty.models': 'No hay modelos disponibles.',
  'blocked.composer': 'Este modelo no está disponible: selecciona uno para continuar',
  'empty.efforts': 'Este modelo no ofrece niveles de esfuerzo de razonamiento.',
} satisfies Record<ModelKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'command.description': 'Sélectionner le modèle de cette conversation',
  'option.loadError': 'Échec du chargement du catalogue : {message}',
  'trigger.fallback': 'Sélectionner un modèle',
  'trigger.selectAria': 'Sélectionner un modèle',
  'trigger.aria': 'Sélectionner un modèle, actuel {model}',
  'trigger.ariaEffort': 'Sélectionner un modèle, actuel {model}, niveau de raisonnement {effort}',
  'menu.aria': 'Modèle et niveau de raisonnement',
  'menu.model': 'Modèle',
  'menu.effort': 'Niveau',
  'effort.providerDefault': 'Par défaut',
  'status.loading': 'Actualisation de la liste des modèles…',
  'error.action': 'Échec de l’opération sur le modèle : {message}',
  'action.reload': 'Recharger',
  'warning.groupLoad': 'Échec du chargement de {name} : {message}',
  'empty.models': 'Aucun modèle disponible.',
  'blocked.composer': 'Ce modèle est indisponible : sélectionnez-en un pour continuer',
  'empty.efforts': 'Ce modèle ne propose aucun niveau de raisonnement.',
} satisfies Record<ModelKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'command.description': 'Modell für diese Unterhaltung auswählen',
  'option.loadError': 'Katalog konnte nicht geladen werden: {message}',
  'trigger.fallback': 'Modell auswählen',
  'trigger.selectAria': 'Modell auswählen',
  'trigger.aria': 'Modell auswählen, aktuell {model}',
  'trigger.ariaEffort': 'Modell auswählen, aktuell {model}, Denkaufwand {effort}',
  'menu.aria': 'Modell und Denkaufwand',
  'menu.model': 'Modell',
  'menu.effort': 'Aufwand',
  'effort.providerDefault': 'Standard',
  'status.loading': 'Modellliste wird aktualisiert…',
  'error.action': 'Modellvorgang fehlgeschlagen: {message}',
  'action.reload': 'Neu laden',
  'warning.groupLoad': '{name} konnte nicht geladen werden: {message}',
  'empty.models': 'Keine Modelle verfügbar.',
  'blocked.composer': 'Dieses Modell ist nicht verfügbar — wählen Sie eines aus',
  'empty.efforts': 'Dieses Modell bietet keine Denkaufwand-Stufen.',
} satisfies Record<ModelKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'command.description': 'Selecione o modelo desta conversa',
  'option.loadError': 'Falha ao carregar o catálogo: {message}',
  'trigger.fallback': 'Selecionar modelo',
  'trigger.selectAria': 'Selecionar modelo',
  'trigger.aria': 'Selecionar modelo, atual {model}',
  'trigger.ariaEffort': 'Selecionar modelo, atual {model}, esforço de raciocínio {effort}',
  'menu.aria': 'Modelo e esforço de raciocínio',
  'menu.model': 'Modelo',
  'menu.effort': 'Esforço',
  'effort.providerDefault': 'Padrão',
  'status.loading': 'Atualizando lista de modelos…',
  'error.action': 'Falha na operação do modelo: {message}',
  'action.reload': 'Recarregar',
  'warning.groupLoad': 'Falha ao carregar {name}: {message}',
  'empty.models': 'Nenhum modelo disponível.',
  'blocked.composer': 'Este modelo está indisponível: selecione um para continuar',
  'empty.efforts': 'Este modelo não oferece níveis de esforço de raciocínio.',
} satisfies Record<ModelKey, string>

/** it dictionary, checked complete against the zh key set. */
