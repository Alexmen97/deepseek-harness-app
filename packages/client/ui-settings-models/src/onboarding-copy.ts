/** Durable settings namespace for product-wide GUI onboarding facts. */
export const WELCOME_NOTICE_SETTINGS_NAMESPACE = 'ui-onboarding'

/** Field storing the last welcome notice version the user acknowledged. */
export const WELCOME_NOTICE_ACK_FIELD = 'welcomeNoticeVersion'

/**
 * Bump only when the notice changes materially and every user should see it
 * again. The acknowledgement is compared for exact equality.
 */
export const WELCOME_NOTICE_VERSION = '2026-08-13.1'

/** The complete editable internal-testing notice in both supported GUI locales. */
export const WELCOME_NOTICE_COPY = {
  zh: {
    title: '内测声明',
    body: 'DeepSeek Harness 目前的 0.1 版本仍处在面向 Harness 开发者进行测试的阶段，还有许多地方需要持续改进和打磨，希望听取广大开发者的反馈建议。预计 DeepSeek Harness 的核心插件以及基础 API 都会在接下来的一段时间内快速迭代、持续演化。\n\n我们期待与全球开发者一起，在开源、开放、可复用、可组合的基础设施之上，共同探索智能上限。欢迎全球 Harness 开发者加入 DSH 插件生态。',
    continueLabel: '继续',
  },
  en: {
    title: 'Internal Testing Notice',
    body: "DeepSeek Harness 0.1 remains in testing for Harness developers. Many areas need further improvement, and we welcome feedback from the developer community. DeepSeek Harness's core plugins and foundational APIs will continue to evolve rapidly over the coming months.\n\nWe look forward to exploring the limits of intelligence with developers around the world, building on open-source, open, reusable, and composable infrastructure. We welcome Harness developers everywhere to join the DSH plugin ecosystem.",
    continueLabel: 'Continue',
  },
  it: {
    title: 'Avviso di test interno',
    body: "DeepSeek Harness 0.1 è ancora in fase di test per gli sviluppatori Harness. Molte aree richiedono ulteriori miglioramenti e accogliamo con favore i feedback della community di sviluppatori. I plugin principali e le API di base di DeepSeek Harness continueranno a evolvere rapidamente nei prossimi mesi.\n\nNon vediamo l'ora di esplorare i limiti dell'intelligenza insieme agli sviluppatori di tutto il mondo, costruendo su un'infrastruttura open source, aperta, riutilizzabile e componibile. Diamo il benvenuto a tutti gli sviluppatori Harness nell'ecosistema di plugin DSH.",
    continueLabel: 'Continua',
  },
  es: {
    title: 'Aviso de pruebas internas',
    body: 'DeepSeek Harness 0.1 sigue en fase de pruebas para los desarrolladores de Harness. Muchas áreas necesitan mejoras y agradecemos los comentarios de la comunidad. Los plugins principales y las API básicas de DeepSeek Harness evolucionarán rápidamente en los próximos meses.\n\nEsperamos explorar los límites de la inteligencia con desarrolladores de todo el mundo, sobre una infraestructura abierta, de código abierto, reutilizable y componible. Invitamos a los desarrolladores de Harness de todas partes a unirse al ecosistema de plugins DSH.',
    continueLabel: 'Continuar',
  },
  fr: {
    title: 'Avis de test interne',
    body: "DeepSeek Harness 0.1 reste en phase de test pour les développeurs Harness. De nombreux aspects demandent encore des améliorations, et nous accueillons avec plaisir les retours de la communauté. Les plugins principaux et les API fondamentales de DeepSeek Harness continueront d'évoluer rapidement au cours des prochains mois.\n\nNous avons hâte d'explorer les limites de l'intelligence avec les développeurs du monde entier, sur une infrastructure open source, ouverte, réutilisable et composable. Nous invitons tous les développeurs Harness à rejoindre l'écosystème de plugins DSH.",
    continueLabel: 'Continuer',
  },
  de: {
    title: 'Hinweis zum internen Test',
    body: 'DeepSeek Harness 0.1 befindet sich noch in der Testphase für Harness-Entwickler. Viele Bereiche müssen weiter verbessert werden, und wir freuen uns über Feedback aus der Entwickler-Community. Die Kern-Plugins und grundlegenden APIs von DeepSeek Harness werden sich in den kommenden Monaten rasch weiterentwickeln.\n\nWir freuen uns darauf, gemeinsam mit Entwicklern weltweit die Grenzen der Intelligenz zu erkunden – auf offener, quelloffener, wiederverwendbarer und komponierbarer Infrastruktur. Wir laden Harness-Entwickler überall ein, dem DSH-Plugin-Ökosystem beizutreten.',
    continueLabel: 'Weiter',
  },
  'pt-BR': {
    title: 'Aviso de teste interno',
    body: 'O DeepSeek Harness 0.1 continua em testes para desenvolvedores do Harness. Muitas áreas ainda precisam de melhorias, e agradecemos o feedback da comunidade. Os plugins principais e as APIs fundamentais do DeepSeek Harness continuarão evoluindo rapidamente nos próximos meses.\n\nEsperamos explorar os limites da inteligência com desenvolvedores de todo o mundo, sobre uma infraestrutura de código aberto, aberta, reutilizável e combinável. Convidamos desenvolvedores do Harness de todos os lugares a entrar no ecossistema de plugins DSH.',
    continueLabel: 'Continuar',
  },
} as const
