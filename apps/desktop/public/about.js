const invoke = window.__TAURI_INTERNALS__.invoke

async function main() {
  let info = null
  try {
    info = await invoke('about_info')
  } catch (error) {
    console.error('about: about_info failed:', error)
  }
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
