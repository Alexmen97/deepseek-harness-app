/** Copy dictionaries for the plugin inventory Settings section. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  tab: '插件列表',
  loading: '正在读取插件…',
  error: '暂时无法读取插件。',
  retry: '重试',
  search: '搜索插件',
  catalog: '插件列表',
  empty: '暂无插件。',
  emptySearch: '没有匹配的插件。',
  enabledTag: '已启用',
  disabledTag: '已停用',
  configuration: '配置状态',
  cordis: 'Cordis 状态',
  unobserved: '未挂载',
  pending: '等待依赖',
  loadingPhase: '加载中',
  active: '已挂载',
  failed: '挂载失败',
  unloading: '卸载中',
} satisfies Record<string, string>

/** Plugin inventory locale key union. */
export type PluginInventoryLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  tab: 'Plugin list',
  loading: 'Reading plugins…',
  error: 'Plugins are temporarily unavailable.',
  retry: 'Retry',
  search: 'Search plugins',
  catalog: 'Plugin list',
  empty: 'No plugins are available.',
  emptySearch: 'No matching plugins.',
  enabledTag: 'Enabled',
  disabledTag: 'Disabled',
  configuration: 'Configuration',
  cordis: 'Cordis status',
  unobserved: 'Not mounted',
  pending: 'Waiting for dependencies',
  loadingPhase: 'Loading',
  active: 'Mounted',
  failed: 'Mount failed',
  unloading: 'Unloading',
} satisfies Record<PluginInventoryLocaleKey, string>

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'tab': 'Elenco plugin',
  'loading': 'Lettura plugin…',
  'error': 'Plugin temporaneamente non disponibili.',
  'retry': 'Riprova',
  'search': 'Cerca plugin',
  'catalog': 'Elenco plugin',
  'empty': 'Nessun plugin disponibile.',
  'emptySearch': 'Nessun plugin corrispondente.',
  'enabledTag': 'Abilitato',
  'disabledTag': 'Disabilitato',
  'configuration': 'Configurazione',
  'cordis': 'Stato Cordis',
  'unobserved': 'Non montato',
  'pending': 'In attesa delle dipendenze',
  'loadingPhase': 'Caricamento',
  'active': 'Montato',
  'failed': 'Montaggio non riuscito',
  'unloading': 'Smontaggio',
} satisfies Record<PluginInventoryLocaleKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'tab': 'Lista de complementos',
  'loading': 'Leyendo complementos…',
  'error': 'Los complementos no están disponibles temporalmente.',
  'retry': 'Reintentar',
  'search': 'Buscar complementos',
  'catalog': 'Lista de complementos',
  'empty': 'No hay complementos disponibles.',
  'emptySearch': 'No hay complementos que coincidan.',
  'enabledTag': 'Habilitado',
  'disabledTag': 'Deshabilitado',
  'configuration': 'Configuración',
  'cordis': 'Estado de Cordis',
  'unobserved': 'No montado',
  'pending': 'Esperando dependencias',
  'loadingPhase': 'Cargando',
  'active': 'Montado',
  'failed': 'Error al montar',
  'unloading': 'Descargando',
} satisfies Record<PluginInventoryLocaleKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'tab': 'Liste des plugins',
  'loading': 'Lecture des plugins…',
  'error': 'Les plugins sont temporairement indisponibles.',
  'retry': 'Réessayer',
  'search': 'Rechercher des plugins',
  'catalog': 'Liste des plugins',
  'empty': 'Aucun plugin disponible.',
  'emptySearch': 'Aucun plugin correspondant.',
  'enabledTag': 'Activé',
  'disabledTag': 'Désactivé',
  'configuration': 'Configuration',
  'cordis': 'État Cordis',
  'unobserved': 'Non monté',
  'pending': 'En attente des dépendances',
  'loadingPhase': 'Chargement',
  'active': 'Monté',
  'failed': 'Échec du montage',
  'unloading': 'Déchargement',
} satisfies Record<PluginInventoryLocaleKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'tab': 'Plugin-Liste',
  'loading': 'Plugins werden gelesen…',
  'error': 'Plugins sind vorübergehend nicht verfügbar.',
  'retry': 'Erneut versuchen',
  'search': 'Plugins durchsuchen',
  'catalog': 'Plugin-Liste',
  'empty': 'Keine Plugins verfügbar.',
  'emptySearch': 'Keine passenden Plugins.',
  'enabledTag': 'Aktiviert',
  'disabledTag': 'Deaktiviert',
  'configuration': 'Konfiguration',
  'cordis': 'Cordis-Status',
  'unobserved': 'Nicht eingehängt',
  'pending': 'Wartet auf Abhängigkeiten',
  'loadingPhase': 'Wird geladen',
  'active': 'Eingehängt',
  'failed': 'Einbinden fehlgeschlagen',
  'unloading': 'Wird entladen',
} satisfies Record<PluginInventoryLocaleKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'tab': 'Lista de plugins',
  'loading': 'Lendo plugins…',
  'error': 'Os plugins estão temporariamente indisponíveis.',
  'retry': 'Tentar novamente',
  'search': 'Pesquisar plugins',
  'catalog': 'Lista de plugins',
  'empty': 'Nenhum plugin disponível.',
  'emptySearch': 'Nenhum plugin correspondente.',
  'enabledTag': 'Ativado',
  'disabledTag': 'Desativado',
  'configuration': 'Configuração',
  'cordis': 'Status do Cordis',
  'unobserved': 'Não montado',
  'pending': 'Aguardando dependências',
  'loadingPhase': 'Carregando',
  'active': 'Montado',
  'failed': 'Falha ao montar',
  'unloading': 'Descarregando',
} satisfies Record<PluginInventoryLocaleKey, string>
