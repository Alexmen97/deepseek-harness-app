/** Locale bundles for the agent-preset settings row, hero chip, header label, and management section. */

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | 'title' | 'description' | 'loading' | 'error' | 'userTrust' | 'seatHint' | 'headerHint'
  | 'nav' | 'sectionIntro' | 'builtIn' | 'setDefault' | 'view'
  | 'presetStandardName' | 'presetStandardDescription'
  | 'presetCodeName' | 'presetCodeDescription'
  | 'presetMinimalName' | 'presetMinimalDescription'
  | 'presetCordisName' | 'presetCordisDescription'
  | 'duplicate' | 'duplicateUnavailable' | 'delete' | 'presetId' | 'presetIdPlaceholder' | 'copyOf'
  | 'displayName' | 'displayNamePlaceholder'
  | 'inUse' | 'noDescription' | 'builtInGroup' | 'customGroup'
  | 'brokenBadge' | 'brokenNoCopy'
  | 'composition' | 'cancel' | 'close' | 'retry'
  | 'copyTitle' | 'copyIntro' | 'create' | 'creating' | 'creatorDraft'
  | 'openLocation' | 'showLocation' | 'revealedPathLabel'
  | 'idRequired' | 'idInvalid' | 'idTaken'
  | 'deleteTitle' | 'deleteDescription' | 'deleteConfirm' | 'deleting'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  title: 'Agent preset',
  description: 'Applies to sessions you start from now on. Running sessions keep the preset they began with.',
  loading: 'Loading presets…',
  error: 'Could not load agent presets.',
  userTrust: 'Custom',
  seatHint: 'Agent preset for the session you are about to start',
  headerHint: 'The agent preset this session runs, fixed when it started',
  nav: 'Agent presets',
  sectionIntro:
    'A preset is the plugin composition one session\'s agent runs — its tools, prompt, and capabilities. '
    + 'Duplicate an existing one and make it yours, or let the agent draft one for you in Creator mode.',
  builtIn: 'Built-in',
  setDefault: 'Set as default',
  view: 'View',
  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.',
  presetCodeName: 'PTC mode',
  presetCodeDescription:
    'All Standard mode capabilities, with tools exposed through the Code Mode SDK so the model can combine multi-step operations in one TypeScript program.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'Two-tool coding agent with persistent bash and str_replace_editor.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.',
  duplicate: 'Duplicate',
  duplicateUnavailable: 'This deployment has no writable preset directory',
  delete: 'Delete',
  presetId: 'Identifier',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Name',
  displayNamePlaceholder: 'Shown in the picker; defaults to the identifier',
  inUse: 'In use',
  builtInGroup: 'Built-in',
  customGroup: 'Custom',
  noDescription: 'No description.',
  brokenBadge: 'Failed to load',
  brokenNoCopy: 'A preset that failed to load cannot be duplicated',
  copyOf: 'Copied from',
  composition: 'Composition (agent.cordis.yml)',
  cancel: 'Cancel',
  close: 'Close',
  retry: 'Retry',
  copyTitle: 'Duplicate preset',
  copyIntro:
    'The whole preset is copied on this machine. The identifier becomes its directory name and cannot '
    + 'be changed later; everything else is edited in the preset\'s own files.',
  create: 'Create',
  creating: 'Creating…',
  creatorDraft: 'Draft a custom preset with Creator mode',
  openLocation: 'Open folder',
  showLocation: 'Show location',
  revealedPathLabel: 'Preset files:',
  idRequired: 'Give the preset an identifier.',
  idInvalid: 'Use lowercase letters, digits, and hyphens, starting with a letter or digit.',
  idTaken: 'A preset with this identifier already exists.',
  deleteTitle: 'Delete this preset?',
  deleteDescription:
    'The preset directory is deleted. Sessions already running on it keep working; new sessions cannot select it.',
  deleteConfirm: 'Delete',
  deleting: 'Deleting…',
}

/** Simplified Chinese copy. */
export const zh: Record<AgentPresetSettingsKey, string> = {
  title: 'Agent 预设',
  description: '对此后新建的会话生效。运行中的会话保持它开始时的预设。',
  loading: '正在加载预设…',
  error: '无法加载 Agent 预设。',
  userTrust: '自定义',
  seatHint: '即将开始的这个会话所用的 Agent 预设',
  headerHint: '本会话运行的 Agent 预设，开始时即固定',
  nav: 'Agent 预设',
  sectionIntro: '预设即一个会话的 Agent 所运行的插件组装 —— 它的工具、提示词与能力。复制一份既有预设改成自己的，或用「创造模式」让 Agent 帮你创建。',
  builtIn: '内置',
  setDefault: '设为默认',
  view: '查看',
  presetStandardName: '标准模式',
  presetStandardDescription: '功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。',
  presetCodeName: 'PTC 模式',
  presetCodeDescription: '具备标准模式的全部能力，并通过 Code Mode SDK 呈现工具，让模型用一个 TypeScript 程序组合多步操作。',
  presetMinimalName: '极简模式',
  presetMinimalDescription: '仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。',
  presetCordisName: '创造模式',
  presetCordisDescription: '用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。',
  duplicate: '复制',
  duplicateUnavailable: '此部署未配置可写的预设目录',
  delete: '删除',
  presetId: '标识符',
  presetIdPlaceholder: 'my-agent',
  displayName: '名称',
  displayNamePlaceholder: '选择器中显示的名字，缺省用标识符',
  inUse: '当前使用',
  builtInGroup: '内置',
  customGroup: '自定义',
  noDescription: '暂无描述。',
  brokenBadge: '加载失败',
  brokenNoCopy: '预设加载失败，不能复制',
  copyOf: '复制自',
  composition: '组装（agent.cordis.yml）',
  cancel: '取消',
  close: '关闭',
  retry: '重试',
  copyTitle: '复制预设',
  copyIntro: '整个预设会在本机复制一份。标识符将成为目录名，事后无法更改；其余内容之后直接在预设自己的文件里编辑。',
  create: '创建',
  creating: '正在创建…',
  creatorDraft: '用「创造模式」创作自定义预设',
  openLocation: '打开目录',
  showLocation: '查看路径',
  revealedPathLabel: '预设文件：',
  idRequired: '请填写标识符。',
  idInvalid: '只能使用小写字母、数字与连字符，且以字母或数字开头。',
  idTaken: '该标识符已被占用。',
  deleteTitle: '删除该预设？',
  deleteDescription: '预设目录将被删除。已在其上运行的会话不受影响；新会话将无法再选择它。',
  deleteConfirm: '删除',
  deleting: '正在删除…',
}

/** Preset roster fields needed to resolve Web display copy. */
export interface PresetDisplaySource {
  /** Stable preset id. */
  readonly id: string
  /** Whether the deployment ships the preset or the user owns it. */
  readonly trust: 'system' | 'user'
  /** Unlocalized name published by the preset. */
  readonly name?: string
  /** Unlocalized description published by the preset. */
  readonly description?: string
}

/** Display copy resolved for the active Web locale. */
export interface PresetDisplayText {
  /** Localized built-in name or the preset's own fallback name. */
  readonly name: string
  /** Localized built-in description or the preset's own description. */
  readonly description?: string
}

interface PresetLocaleKeys {
  readonly name: AgentPresetSettingsKey
  readonly description: AgentPresetSettingsKey
}

const BUILT_IN_PRESET_KEYS: Readonly<Partial<Record<string, PresetLocaleKeys>>> = {
  standard: { name: 'presetStandardName', description: 'presetStandardDescription' },
  code: { name: 'presetCodeName', description: 'presetCodeDescription' },
  minimal: { name: 'presetMinimalName', description: 'presetMinimalDescription' },
  cordis: { name: 'presetCordisName', description: 'presetCordisDescription' },
}

/**
 * Resolve preset display copy without making user-authored metadata translatable.
 * @param preset - roster row whose copy is being rendered.
 * @param t - active Web locale lookup.
 * @returns localized copy for a known shipped preset, otherwise file metadata.
 */
export function presetDisplayText(
  preset: PresetDisplaySource,
  t: (key: AgentPresetSettingsKey) => string,
): PresetDisplayText {
  const keys = preset.trust === 'system' ? BUILT_IN_PRESET_KEYS[preset.id] : undefined
  if (keys !== undefined) return { name: t(keys.name), description: t(keys.description) }
  return {
    name: preset.name ?? preset.id,
    ...preset.description === undefined ? {} : { description: preset.description },
  }
}

/** Italian dictionary, complete against the canonical key set. */
export const it = {
  title: 'Preset agente',
  description: 'Si applica alle sessioni avviate da ora in poi. Le sessioni in esecuzione mantengono il preset con cui sono iniziate.',
  loading: 'Caricamento preset…',
  error: 'Impossibile caricare i preset agente.',
  userTrust: 'Personalizzato',
  seatHint: 'Preset agente per la sessione che stai per avviare',
  headerHint: 'Il preset agente di questa sessione, fissato all’avvio',
  nav: 'Preset agente',
  sectionIntro: 'Un preset è la composizione di plugin su cui gira l’agente di una sessione: strumenti, prompt e capacità. Duplica un preset esistente e personalizzalo, oppure lascia che l’agente ne abbozzi uno in modalità Creatore.',
  builtIn: 'Integrato',
  setDefault: 'Imposta come predefinito',
  view: 'Visualizza',
  presetStandardName: 'Modalità standard',
  presetStandardDescription: 'Agente di codifica completo con modifica file, shell, ricerca file e web, skill, pianificazione, obiettivi, subagenti e flussi di lavoro.',
  presetCodeName: 'Modalità PTC',
  presetCodeDescription: 'Tutte le capacità della modalità Standard, con strumenti esposti tramite il Code Mode SDK, così il modello può combinare operazioni a più passi in un unico programma TypeScript.',
  presetMinimalName: 'Modalità minima',
  presetMinimalDescription: 'Agente di codifica a due strumenti con bash persistente e str_replace_editor.',
  presetCordisName: 'Modalità Creatore',
  presetCordisDescription: 'Pensata per creare preset agente personalizzati: tutte le capacità della modalità Standard più ispezione runtime, esperimenti sui plugin e guida alla creazione di preset.',
  duplicate: 'Duplica',
  duplicateUnavailable: 'Questa distribuzione non ha una directory preset scrivibile',
  delete: 'Elimina',
  presetId: 'Identificatore',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Nome',
  displayNamePlaceholder: 'Mostrato nel selettore; se vuoto usa l’identificatore',
  inUse: 'In uso',
  builtInGroup: 'Integrati',
  customGroup: 'Personalizzati',
  noDescription: 'Nessuna descrizione.',
  brokenBadge: 'Caricamento non riuscito',
  brokenNoCopy: 'Un preset che non è stato caricato non può essere duplicato',
  copyOf: 'Copiato da',
  composition: 'Composizione (agent.cordis.yml)',
  cancel: 'Annulla',
  close: 'Chiudi',
  retry: 'Riprova',
  copyTitle: 'Duplica preset',
  copyIntro: 'L’intero preset viene copiato su questa macchina. L’identificatore diventa il nome della directory e non potrà essere cambiato; tutto il resto si modifica nei file del preset.',
  create: 'Crea',
  creating: 'Creazione…',
  creatorDraft: 'Crea un preset personalizzato con la modalità Creatore',
  openLocation: 'Apri cartella',
  showLocation: 'Mostra posizione',
  revealedPathLabel: 'File del preset:',
  idRequired: 'Assegna un identificatore al preset.',
  idInvalid: 'Usa lettere minuscole, cifre e trattini, iniziando con una lettera o una cifra.',
  idTaken: 'Esiste già un preset con questo identificatore.',
  deleteTitle: 'Eliminare questo preset?',
  deleteDescription: 'La directory del preset verrà eliminata. Le sessioni già avviate continuano a funzionare; le nuove sessioni non potranno più selezionarlo.',
  deleteConfirm: 'Elimina',
  deleting: 'Eliminazione…',
} satisfies Record<AgentPresetSettingsKey, string>

/** es copy, checked complete against the English key set. */
export const es = {
  title: 'Preset de agente',
  description: 'Se aplica a las sesiones que inicies a partir de ahora. Las sesiones en curso conservan el preset con el que comenzaron.',
  loading: 'Cargando presets…',
  error: 'No se pudieron cargar los presets de agente.',
  userTrust: 'Personalizado',
  seatHint: 'Preset de agente para la sesión que vas a iniciar',
  headerHint: 'El preset de agente de esta sesión, fijado al iniciarse',
  nav: 'Presets de agente',
  sectionIntro: 'Un preset es la composición de plugins con la que se ejecuta el agente de una sesión: sus herramientas, indicaciones y capacidades. Duplica uno existente y adáptalo, o deja que el agente redacte uno en el modo Creador.',
  builtIn: 'Integrado',
  setDefault: 'Establecer como predeterminado',
  view: 'Ver',
  presetStandardName: 'Modo estándar',
  presetStandardDescription: 'Agente de programación completo con edición de archivos, shell, búsqueda de archivos y web, habilidades, planificación, objetivos, subagentes y flujos de trabajo.',
  presetCodeName: 'Modo PTC',
  presetCodeDescription: 'Todas las capacidades del modo estándar, con las herramientas expuestas a través del Code Mode SDK para que el modelo combine operaciones de varios pasos en un solo programa TypeScript.',
  presetMinimalName: 'Modo mínimo',
  presetMinimalDescription: 'Agente de programación con dos herramientas: bash persistente y str_replace_editor.',
  presetCordisName: 'Modo Creador',
  presetCordisDescription: 'Diseñado para crear presets de agente personalizados: todas las capacidades del modo estándar más inspección en tiempo de ejecución, experimentos con plugins y guía para crear presets.',
  duplicate: 'Duplicar',
  duplicateUnavailable: 'Este despliegue no tiene un directorio de presets editable',
  delete: 'Eliminar',
  presetId: 'Identificador',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Nombre',
  displayNamePlaceholder: 'Se muestra en el selector; por defecto usa el identificador',
  inUse: 'En uso',
  builtInGroup: 'Integrados',
  customGroup: 'Personalizados',
  noDescription: 'Sin descripción.',
  brokenBadge: 'Error al cargar',
  brokenNoCopy: 'Un preset que no se pudo cargar no puede duplicarse',
  copyOf: 'Copiado de',
  composition: 'Composición (agent.cordis.yml)',
  cancel: 'Cancelar',
  close: 'Cerrar',
  retry: 'Reintentar',
  copyTitle: 'Duplicar preset',
  copyIntro: 'El preset completo se copia en esta máquina. El identificador se convierte en el nombre del directorio y no podrá cambiarse; todo lo demás se edita en los archivos del preset.',
  create: 'Crear',
  creating: 'Creando…',
  creatorDraft: 'Crea un preset personalizado con el modo Creador',
  openLocation: 'Abrir carpeta',
  showLocation: 'Mostrar ubicación',
  revealedPathLabel: 'Archivos del preset:',
  idRequired: 'Asigna un identificador al preset.',
  idInvalid: 'Usa letras minúsculas, números y guiones, empezando por una letra o un número.',
  idTaken: 'Ya existe un preset con este identificador.',
  deleteTitle: '¿Eliminar este preset?',
  deleteDescription: 'Se eliminará el directorio del preset. Las sesiones que ya se ejecutan sobre él siguen funcionando; las sesiones nuevas no podrán seleccionarlo.',
  deleteConfirm: 'Eliminar',
  deleting: 'Eliminando…',
} satisfies Record<AgentPresetSettingsKey, string>

/** fr copy, checked complete against the English key set. */
export const fr = {
  title: 'Preset d’agent',
  description: 'S’applique aux sessions que vous démarrez désormais. Les sessions en cours conservent le preset avec lequel elles ont commencé.',
  loading: 'Chargement des presets…',
  error: 'Impossible de charger les presets d’agent.',
  userTrust: 'Personnalisé',
  seatHint: 'Preset d’agent pour la session que vous allez démarrer',
  headerHint: 'Le preset d’agent de cette session, fixé à son démarrage',
  nav: 'Presets d’agent',
  sectionIntro: 'Un preset est la composition de plugins sur laquelle tourne l’agent d’une session : ses outils, son prompt et ses capacités. Dupliquez-en un et adaptez-le, ou laissez l’agent en ébaucher un en mode Créateur.',
  builtIn: 'Intégré',
  setDefault: 'Définir par défaut',
  view: 'Voir',
  presetStandardName: 'Mode standard',
  presetStandardDescription: 'Agent de codage complet avec modification de fichiers, shell, recherche de fichiers et web, compétences, planification, objectifs, sous-agents et workflows.',
  presetCodeName: 'Mode PTC',
  presetCodeDescription: 'Toutes les capacités du mode standard, avec des outils exposés via le Code Mode SDK afin que le modèle combine des opérations en plusieurs étapes dans un seul programme TypeScript.',
  presetMinimalName: 'Mode minimal',
  presetMinimalDescription: 'Agent de codage à deux outils avec bash persistant et str_replace_editor.',
  presetCordisName: 'Mode Créateur',
  presetCordisDescription: 'Conçu pour créer des presets d’agent personnalisés : toutes les capacités du mode standard plus l’inspection de l’exécution, des expériences de plugins et des conseils de création de presets.',
  duplicate: 'Dupliquer',
  duplicateUnavailable: 'Ce déploiement n’a pas de répertoire de presets inscriptible',
  delete: 'Supprimer',
  presetId: 'Identifiant',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Nom',
  displayNamePlaceholder: 'Affiché dans le sélecteur ; par défaut l’identifiant',
  inUse: 'En cours d’utilisation',
  builtInGroup: 'Intégrés',
  customGroup: 'Personnalisés',
  noDescription: 'Aucune description.',
  brokenBadge: 'Échec du chargement',
  brokenNoCopy: 'Un preset dont le chargement a échoué ne peut pas être dupliqué',
  copyOf: 'Copié depuis',
  composition: 'Composition (agent.cordis.yml)',
  cancel: 'Annuler',
  close: 'Fermer',
  retry: 'Réessayer',
  copyTitle: 'Dupliquer le preset',
  copyIntro: 'L’intégralité du preset est copiée sur cette machine. L’identifiant devient le nom du répertoire et ne pourra plus être modifié ; tout le reste se modifie dans les fichiers du preset.',
  create: 'Créer',
  creating: 'Création…',
  creatorDraft: 'Ébaucher un preset personnalisé avec le mode Créateur',
  openLocation: 'Ouvrir le dossier',
  showLocation: 'Afficher l’emplacement',
  revealedPathLabel: 'Fichiers du preset :',
  idRequired: 'Donnez un identifiant au preset.',
  idInvalid: 'Utilisez des lettres minuscules, des chiffres et des tirets, en commençant par une lettre ou un chiffre.',
  idTaken: 'Un preset avec cet identifiant existe déjà.',
  deleteTitle: 'Supprimer ce preset ?',
  deleteDescription: 'Le répertoire du preset sera supprimé. Les sessions déjà lancées dessus continuent de fonctionner ; les nouvelles sessions ne pourront plus le sélectionner.',
  deleteConfirm: 'Supprimer',
  deleting: 'Suppression…',
} satisfies Record<AgentPresetSettingsKey, string>

/** de copy, checked complete against the English key set. */
export const de = {
  title: 'Agent-Preset',
  description: 'Gilt für Sitzungen, die Sie ab jetzt starten. Laufende Sitzungen behalten ihr Start-Preset.',
  loading: 'Presets werden geladen…',
  error: 'Agent-Presets konnten nicht geladen werden.',
  userTrust: 'Benutzerdefiniert',
  seatHint: 'Agent-Preset für die Sitzung, die Sie gleich starten',
  headerHint: 'Das Agent-Preset dieser Sitzung, beim Start festgelegt',
  nav: 'Agent-Presets',
  sectionIntro: 'Ein Preset ist die Plugin-Zusammenstellung, auf der der Agent einer Sitzung läuft — seine Tools, Prompts und Fähigkeiten. Duplizieren Sie ein vorhandenes und passen Sie es an, oder lassen Sie den Agenten im Creator-Modus eines entwerfen.',
  builtIn: 'Integriert',
  setDefault: 'Als Standard festlegen',
  view: 'Ansehen',
  presetStandardName: 'Standardmodus',
  presetStandardDescription: 'Vollständiger Coding-Agent mit Dateibearbeitung, Shell, Datei- und Websuche, Skills, Planung, Zielen, Subagenten und Workflows.',
  presetCodeName: 'PTC-Modus',
  presetCodeDescription: 'Alle Fähigkeiten des Standardmodus, mit Tools über das Code Mode SDK, sodass das Modell mehrstufige Vorgänge in einem TypeScript-Programm kombinieren kann.',
  presetMinimalName: 'Minimalmodus',
  presetMinimalDescription: 'Coding-Agent mit zwei Tools: persistentem bash und str_replace_editor.',
  presetCordisName: 'Creator-Modus',
  presetCordisDescription: 'Für die Erstellung benutzerdefinierter Agent-Presets: alle Fähigkeiten des Standardmodus plus Laufzeitprüfung, Plugin-Experimente und Anleitung zum Erstellen von Presets.',
  duplicate: 'Duplizieren',
  duplicateUnavailable: 'Diese Bereitstellung hat kein beschreibbares Preset-Verzeichnis',
  delete: 'Löschen',
  presetId: 'Kennung',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Name',
  displayNamePlaceholder: 'Wird im Auswahlfeld angezeigt; standardmäßig die Kennung',
  inUse: 'In Verwendung',
  builtInGroup: 'Integriert',
  customGroup: 'Benutzerdefiniert',
  noDescription: 'Keine Beschreibung.',
  brokenBadge: 'Laden fehlgeschlagen',
  brokenNoCopy: 'Ein Preset, das nicht geladen werden konnte, kann nicht dupliziert werden',
  copyOf: 'Kopiert von',
  composition: 'Zusammenstellung (agent.cordis.yml)',
  cancel: 'Abbrechen',
  close: 'Schließen',
  retry: 'Erneut versuchen',
  copyTitle: 'Preset duplizieren',
  copyIntro: 'Das gesamte Preset wird auf diesem Rechner kopiert. Die Kennung wird zum Verzeichnisnamen und kann später nicht geändert werden; alles andere wird in den Preset-Dateien bearbeitet.',
  create: 'Erstellen',
  creating: 'Wird erstellt…',
  creatorDraft: 'Benutzerdefiniertes Preset im Creator-Modus entwerfen',
  openLocation: 'Ordner öffnen',
  showLocation: 'Ort anzeigen',
  revealedPathLabel: 'Preset-Dateien:',
  idRequired: 'Geben Sie dem Preset eine Kennung.',
  idInvalid: 'Verwenden Sie Kleinbuchstaben, Ziffern und Bindestriche, beginnend mit einem Buchstaben oder einer Ziffer.',
  idTaken: 'Ein Preset mit dieser Kennung existiert bereits.',
  deleteTitle: 'Dieses Preset löschen?',
  deleteDescription: 'Das Preset-Verzeichnis wird gelöscht. Bereits darauf laufende Sitzungen funktionieren weiter; neue Sitzungen können es nicht mehr auswählen.',
  deleteConfirm: 'Löschen',
  deleting: 'Wird gelöscht…',
} satisfies Record<AgentPresetSettingsKey, string>

/** ptBr copy, checked complete against the English key set. */
export const ptBr = {
  title: 'Preset de agente',
  description: 'Aplica-se às sessões iniciadas a partir de agora. As sessões em andamento mantêm o preset com que começaram.',
  loading: 'Carregando presets…',
  error: 'Não foi possível carregar os presets de agente.',
  userTrust: 'Personalizado',
  seatHint: 'Preset de agente da sessão que você está prestes a iniciar',
  headerHint: 'O preset de agente desta sessão, fixado no início',
  nav: 'Presets de agente',
  sectionIntro: 'Um preset é a composição de plugins sobre a qual o agente de uma sessão roda: ferramentas, prompts e capacidades. Duplique um existente e adapte-o, ou deixe o agente rascunhar um no modo Criador.',
  builtIn: 'Integrado',
  setDefault: 'Definir como padrão',
  view: 'Ver',
  presetStandardName: 'Modo padrão',
  presetStandardDescription: 'Agente de codificação completo com edição de arquivos, shell, pesquisa de arquivos e web, habilidades, planejamento, objetivos, subagentes e fluxos de trabalho.',
  presetCodeName: 'Modo PTC',
  presetCodeDescription: 'Todas as capacidades do modo padrão, com ferramentas expostas pelo Code Mode SDK para o modelo combinar operações de várias etapas em um único programa TypeScript.',
  presetMinimalName: 'Modo mínimo',
  presetMinimalDescription: 'Agente de codificação com duas ferramentas: bash persistente e str_replace_editor.',
  presetCordisName: 'Modo Criador',
  presetCordisDescription: 'Feito para criar presets de agente personalizados: todas as capacidades do modo padrão mais inspeção em tempo de execução, experimentos com plugins e orientação para criar presets.',
  duplicate: 'Duplicar',
  duplicateUnavailable: 'Esta implantação não tem diretório de presets gravável',
  delete: 'Excluir',
  presetId: 'Identificador',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Nome',
  displayNamePlaceholder: 'Exibido no seletor; por padrão usa o identificador',
  inUse: 'Em uso',
  builtInGroup: 'Integrados',
  customGroup: 'Personalizados',
  noDescription: 'Sem descrição.',
  brokenBadge: 'Falha ao carregar',
  brokenNoCopy: 'Um preset que falhou ao carregar não pode ser duplicado',
  copyOf: 'Copiado de',
  composition: 'Composição (agent.cordis.yml)',
  cancel: 'Cancelar',
  close: 'Fechar',
  retry: 'Tentar novamente',
  copyTitle: 'Duplicar preset',
  copyIntro: 'O preset inteiro é copiado nesta máquina. O identificador vira o nome do diretório e não pode ser alterado depois; todo o resto é editado nos arquivos do preset.',
  create: 'Criar',
  creating: 'Criando…',
  creatorDraft: 'Rascunhe um preset personalizado com o modo Criador',
  openLocation: 'Abrir pasta',
  showLocation: 'Mostrar local',
  revealedPathLabel: 'Arquivos do preset:',
  idRequired: 'Dê um identificador ao preset.',
  idInvalid: 'Use letras minúsculas, números e hífens, começando com uma letra ou número.',
  idTaken: 'Já existe um preset com este identificador.',
  deleteTitle: 'Excluir este preset?',
  deleteDescription: 'O diretório do preset será excluído. As sessões já em execução continuam funcionando; novas sessões não poderão selecioná-lo.',
  deleteConfirm: 'Excluir',
  deleting: 'Excluindo…',
} satisfies Record<AgentPresetSettingsKey, string>
