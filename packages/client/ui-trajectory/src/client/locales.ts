/** `trajectory` namespace dictionaries (view tab label + toolbar strings). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'trajectory'

/** The trajectory dictionary key set (the source of truth for both locales). */
export type TrajectoryKey =
  | 'view.trajectory'
  | 'toolbar.aria'
  | 'toolbar.duration'
  | 'toolbar.useActualDuration'
  | 'toolbar.useEqualWidth'
  | 'toolbar.actualTime'
  | 'toolbar.turns'
  | 'toolbar.expandTurns'
  | 'toolbar.collapseTurns'
  | 'toolbar.calls'
  | 'toolbar.expandCalls'
  | 'toolbar.collapseCalls'
  | 'toolbar.search'
  | 'toolbar.searchPlaceholder'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The trajectory view tab label and toolbar strings. */
    'trajectory': TrajectoryKey
  }
}

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh: Record<TrajectoryKey, string> = {
  'view.trajectory': '轨迹',
  'toolbar.aria': '轨迹工具栏',
  'toolbar.duration': 'Duration',
  'toolbar.useActualDuration': 'Use actual duration',
  'toolbar.useEqualWidth': 'Use equal-width operations',
  'toolbar.actualTime': '实际时间',
  'toolbar.turns': 'Turns',
  'toolbar.expandTurns': 'Expand turns',
  'toolbar.collapseTurns': 'Collapse turns',
  'toolbar.calls': 'Calls',
  'toolbar.expandCalls': 'Expand calls',
  'toolbar.collapseCalls': 'Collapse calls',
  'toolbar.search': '搜索轨迹',
  'toolbar.searchPlaceholder': '搜索',
}

/** English dictionary. */
export const en: Record<TrajectoryKey, string> = {
  'view.trajectory': 'Trajectory',
  'toolbar.aria': 'Trajectory toolbar',
  'toolbar.duration': 'Duration',
  'toolbar.useActualDuration': 'Use actual duration',
  'toolbar.useEqualWidth': 'Use equal-width operations',
  'toolbar.actualTime': 'Actual time',
  'toolbar.turns': 'Turns',
  'toolbar.expandTurns': 'Expand turns',
  'toolbar.collapseTurns': 'Collapse turns',
  'toolbar.calls': 'Calls',
  'toolbar.expandCalls': 'Expand calls',
  'toolbar.collapseCalls': 'Collapse calls',
  'toolbar.search': 'Search trajectory',
  'toolbar.searchPlaceholder': 'Search',
}

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  'view.trajectory': 'Traiettoria',
  'toolbar.aria': 'Barra strumenti traiettoria',
  'toolbar.duration': 'Durata',
  'toolbar.useActualDuration': 'Usa durata effettiva',
  'toolbar.useEqualWidth': 'Usa operazioni a larghezza uniforme',
  'toolbar.actualTime': 'Tempo effettivo',
  'toolbar.turns': 'Turni',
  'toolbar.expandTurns': 'Espandi turni',
  'toolbar.collapseTurns': 'Comprimi turni',
  'toolbar.calls': 'Chiamate',
  'toolbar.expandCalls': 'Espandi chiamate',
  'toolbar.collapseCalls': 'Comprimi chiamate',
  'toolbar.search': 'Cerca nella traiettoria',
  'toolbar.searchPlaceholder': 'Cerca',
} satisfies Record<TrajectoryKey, string>

/** es dictionary, checked complete against the zh key set. */
export const es = {
  'view.trajectory': 'Trayectoria',
  'toolbar.aria': 'Barra de herramientas de trayectoria',
  'toolbar.duration': 'Duración',
  'toolbar.useActualDuration': 'Usar duración real',
  'toolbar.useEqualWidth': 'Usar operaciones de ancho uniforme',
  'toolbar.actualTime': 'Tiempo real',
  'toolbar.turns': 'Turnos',
  'toolbar.expandTurns': 'Expandir turnos',
  'toolbar.collapseTurns': 'Contraer turnos',
  'toolbar.calls': 'Llamadas',
  'toolbar.expandCalls': 'Expandir llamadas',
  'toolbar.collapseCalls': 'Contraer llamadas',
  'toolbar.search': 'Buscar en la trayectoria',
  'toolbar.searchPlaceholder': 'Buscar',
} satisfies Record<TrajectoryKey, string>

/** fr dictionary, checked complete against the zh key set. */
export const fr = {
  'view.trajectory': 'Trajectoire',
  'toolbar.aria': 'Barre d’outils de trajectoire',
  'toolbar.duration': 'Durée',
  'toolbar.useActualDuration': 'Utiliser la durée réelle',
  'toolbar.useEqualWidth': 'Utiliser des opérations de largeur égale',
  'toolbar.actualTime': 'Temps réel',
  'toolbar.turns': 'Tours',
  'toolbar.expandTurns': 'Développer les tours',
  'toolbar.collapseTurns': 'Réduire les tours',
  'toolbar.calls': 'Appels',
  'toolbar.expandCalls': 'Développer les appels',
  'toolbar.collapseCalls': 'Réduire les appels',
  'toolbar.search': 'Rechercher dans la trajectoire',
  'toolbar.searchPlaceholder': 'Rechercher',
} satisfies Record<TrajectoryKey, string>

/** de dictionary, checked complete against the zh key set. */
export const de = {
  'view.trajectory': 'Verlauf',
  'toolbar.aria': 'Verlaufs-Symbolleiste',
  'toolbar.duration': 'Dauer',
  'toolbar.useActualDuration': 'Tatsächliche Dauer verwenden',
  'toolbar.useEqualWidth': 'Gleich breite Operationen verwenden',
  'toolbar.actualTime': 'Tatsächliche Zeit',
  'toolbar.turns': 'Runden',
  'toolbar.expandTurns': 'Runden erweitern',
  'toolbar.collapseTurns': 'Runden einklappen',
  'toolbar.calls': 'Aufrufe',
  'toolbar.expandCalls': 'Aufrufe erweitern',
  'toolbar.collapseCalls': 'Aufrufe einklappen',
  'toolbar.search': 'Verlauf durchsuchen',
  'toolbar.searchPlaceholder': 'Suchen',
} satisfies Record<TrajectoryKey, string>

/** ptBr dictionary, checked complete against the zh key set. */
export const ptBr = {
  'view.trajectory': 'Trajetória',
  'toolbar.aria': 'Barra de ferramentas da trajetória',
  'toolbar.duration': 'Duração',
  'toolbar.useActualDuration': 'Usar duração real',
  'toolbar.useEqualWidth': 'Usar operações de largura igual',
  'toolbar.actualTime': 'Tempo real',
  'toolbar.turns': 'Turnos',
  'toolbar.expandTurns': 'Expandir turnos',
  'toolbar.collapseTurns': 'Recolher turnos',
  'toolbar.calls': 'Chamadas',
  'toolbar.expandCalls': 'Expandir chamadas',
  'toolbar.collapseCalls': 'Recolher chamadas',
  'toolbar.search': 'Pesquisar na trajetória',
  'toolbar.searchPlaceholder': 'Pesquisar',
} satisfies Record<TrajectoryKey, string>

/** it dictionary, checked complete against the zh key set. */
