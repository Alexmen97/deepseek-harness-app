const invoke = window.__TAURI_INTERNALS__.invoke

const COPY = {
  en: {
    subtitle: 'Unofficial desktop client based on DeepSeek Harness.',
    desktopVersion: 'Desktop version',
    harnessVersion: 'Harness Engine version',
    protocolVersion: 'Desktop protocol version',
    architecture: 'Architecture',
    build: 'Build',
    repository: 'DeepSeek Harness Repository',
    licenses: 'Open Source Licenses',
    disclaimer: 'This desktop application is not an official DeepSeek product and does not imply DeepSeek endorsement.',
  },
  zh: {
    subtitle: '基于 DeepSeek Harness 的非官方桌面客户端。',
    desktopVersion: '桌面版本',
    harnessVersion: 'Harness 引擎版本',
    protocolVersion: '桌面协议版本',
    architecture: '架构',
    build: '构建',
    repository: 'DeepSeek Harness 仓库',
    licenses: '开源许可证',
    disclaimer: '此桌面应用并非 DeepSeek 官方产品，也不代表 DeepSeek 的认可。',
  },
  it: {
    subtitle: 'Client desktop non ufficiale basato su DeepSeek Harness.',
    desktopVersion: 'Versione desktop',
    harnessVersion: 'Versione motore Harness',
    protocolVersion: 'Versione protocollo desktop',
    architecture: 'Architettura',
    build: 'Build',
    repository: 'Repository DeepSeek Harness',
    licenses: 'Licenze open source',
    disclaimer: 'Questa applicazione desktop non è un prodotto ufficiale DeepSeek e non implica alcun riconoscimento da parte di DeepSeek.',
  },
  es: {
    subtitle: 'Cliente de escritorio no oficial basado en DeepSeek Harness.',
    desktopVersion: 'Versión de escritorio',
    harnessVersion: 'Versión del motor Harness',
    protocolVersion: 'Versión del protocolo de escritorio',
    architecture: 'Arquitectura',
    build: 'Compilación',
    repository: 'Repositorio de DeepSeek Harness',
    licenses: 'Licencias de código abierto',
    disclaimer: 'Esta aplicación de escritorio no es un producto oficial de DeepSeek y no implica el respaldo de DeepSeek.',
  },
  fr: {
    subtitle: 'Client de bureau non officiel basé sur DeepSeek Harness.',
    desktopVersion: 'Version du bureau',
    harnessVersion: 'Version du moteur Harness',
    protocolVersion: 'Version du protocole de bureau',
    architecture: 'Architecture',
    build: 'Build',
    repository: 'Dépôt DeepSeek Harness',
    licenses: 'Licences open source',
    disclaimer: 'Cette application de bureau n’est pas un produit officiel de DeepSeek et n’implique aucune approbation de DeepSeek.',
  },
  de: {
    subtitle: 'Inoffizieller Desktop-Client auf Basis von DeepSeek Harness.',
    desktopVersion: 'Desktop-Version',
    harnessVersion: 'Harness-Engine-Version',
    protocolVersion: 'Desktop-Protokollversion',
    architecture: 'Architektur',
    build: 'Build',
    repository: 'DeepSeek Harness Repository',
    licenses: 'Open-Source-Lizenzen',
    disclaimer: 'Diese Desktop-Anwendung ist kein offizielles DeepSeek-Produkt und impliziert keine Unterstützung durch DeepSeek.',
  },
  'pt-BR': {
    subtitle: 'Cliente de desktop não oficial baseado no DeepSeek Harness.',
    desktopVersion: 'Versão do desktop',
    harnessVersion: 'Versão do motor Harness',
    protocolVersion: 'Versão do protocolo de desktop',
    architecture: 'Arquitetura',
    build: 'Build',
    repository: 'Repositório do DeepSeek Harness',
    licenses: 'Licenças de código aberto',
    disclaimer: 'Este aplicativo de desktop não é um produto oficial da DeepSeek e não implica endosso da DeepSeek.',
  },
}

async function main() {
  let info = null
  try {
    info = await invoke('about_info')
  } catch (error) {
    console.error('about: about_info failed:', error)
  }
  const copy = COPY[info?.language] ?? COPY.en
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = copy[element.dataset.i18n] ?? ''
  }
  document.documentElement.lang = info?.language ?? 'en'
  const set = (id, value) => {
    const el = document.getElementById(id)
    if (el !== null) el.textContent = value
  }
  if (info !== null) {
    set('desktop-version', String(info.desktop_version))
    set('harness-version', String(info.harness_version))
    set('protocol-version', String(info.protocol_version))
    set('architecture', String(info.architecture))
    set('git', info.git === null ? '—' : String(info.git))
  }
  document.getElementById('repository')?.addEventListener('click', () => {
    void invoke('open_external', { url: 'https://github.com/deepseek-ai/deepseek-harness' })
  })
  document.getElementById('licenses')?.addEventListener('click', () => {
    void invoke('open_external', { url: 'https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE' })
  })
}

void main()
