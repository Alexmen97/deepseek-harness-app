/**
 * Desktop settings plugin: the General Language row (System plus seven languages)
 * and the Advanced section (versions, runtime state, Restart Harness, Open
 * Logs, Copy Diagnostics with secrets removed).
 *
 * @module @deepseek-ai/dsh-desktop-client/client/settings
 */

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { DesktopHostService } from './host.ts'
import { desktopLocale, type DesktopLanguageSetting } from '../locale.ts'
import { useDesktopStrings } from '../ui/strings.ts'

export const name = 'desktop-settings'
export const inject = ['slots', 'desktopHost']

interface AdvancedInjected {
  host: DesktopHostService
}

interface LanguageRowInjected {
  getSetting(): DesktopLanguageSetting
  setSetting(next: DesktopLanguageSetting): Promise<void>
}

/** The General Language row: System plus the seven shipped languages. */
function DesktopLanguageRow(props: {
  getSetting(): DesktopLanguageSetting
  setSetting(next: DesktopLanguageSetting): Promise<void>
}): ReactElement {
  const { t } = useDesktopStrings()
  const [setting, setSettingState] = useState(props.getSetting())
  useEffect(() => desktopLocale.subscribe((_language, next) => { setSettingState(next) }), [])
  const options: Array<{ id: DesktopLanguageSetting; label: string }> = [
    { id: 'system', label: t('settings.language.system') },
    { id: 'en', label: t('settings.language.english') },
    { id: 'zh', label: t('settings.language.chinese') },
    { id: 'it', label: t('settings.language.italian') },
    { id: 'es', label: t('settings.language.spanish') },
    { id: 'fr', label: t('settings.language.french') },
    { id: 'de', label: t('settings.language.german') },
    { id: 'pt-BR', label: t('settings.language.portuguese') },
  ]
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0' }}>
      <span style={{ fontSize: '0.9rem' }}>{t('settings.language')}</span>
      <select
        aria-label={t('settings.language')}
        style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #c7cbd4', background: '#fff', fontSize: '0.9rem' }}
        value={setting}
        onChange={(event) => { void props.setSetting(event.target.value as DesktopLanguageSetting) }}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

/** One desktop-owned settings section (versions, runtime, diagnostics). */
function AdvancedSection(props: { host: DesktopHostService }): ReactElement {
  const host = props.host
  const { t } = useDesktopStrings()
  const [lifecycle, setLifecycle] = useState(host.getLifecycle())
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({})
  useEffect(() => host.onLifecycle(() => { setLifecycle(host.getLifecycle()) }), [host])
  useEffect(() => {
    let active = true
    void host.diagnostics().then((summary) => {
      if (active) setDiagnostics(summary)
    }, () => {})
    return () => { active = false }
  }, [host])
  const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', fontSize: '0.9rem' }
  const action: CSSProperties = {
    padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #c7cbd4', background: '#fff', cursor: 'pointer',
  }
  return (
    <section aria-label="Advanced">
      <div style={row}><span>{t('settings.desktopVersion')}</span><span>{diagnostics['Desktop version'] ?? '—'}</span></div>
      <div style={row}><span>{t('settings.harnessVersion')}</span><span>{diagnostics['Harness version'] ?? '—'}</span></div>
      <div style={row}><span>{t('settings.protocol')}</span><span>{diagnostics['Desktop protocol'] ?? '—'}</span></div>
      <div style={row}><span>{t('settings.runtimeState')}</span><span>{lifecycle.state} (generation {lifecycle.generation})</span></div>
      <div style={{ display: 'flex', gap: '0.6rem', padding: '0.6rem 0' }}>
        <button style={action} onClick={() => { void host.restartRuntime() }}>{t('settings.restart')}</button>
        <button style={action} onClick={() => { void host.openLogs() }}>{t('settings.logs')}</button>
        <button style={action} onClick={() => { void host.diagnostics().then(setDiagnostics).then(() => navigator.clipboard.writeText(Object.entries(diagnostics).map(([key, value]) => key + ': ' + value).join('\n'))) }}>
          {t('settings.diagnostics')}
        </button>
      </div>
    </section>
  )
}

/** Register the Language row and the Advanced section in the upstream settings panel. */
export function apply(ctx: Context): void {
  const host = ctx.desktopHost
  const injected = (): AdvancedInjected => ({ host })
  const languageInjected = (): LanguageRowInjected => ({
    getSetting: () => desktopLocale.getSetting(),
    setSetting: next => desktopLocale.set(next),
  })
  const registerLanguageRow = (): (() => void) => ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'desktop-language',
    order: -1,
    inject: languageInjected,
  }, DesktopLanguageRow))
  const registerAdvanced = (): (() => void) => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'advanced',
    order: 90,
    label: () => (desktopLocale.get() === 'it' ? 'Avanzate' : 'Advanced'),
    inject: injected,
  }, AdvancedSection))
  let languageRow = registerLanguageRow()
  let advanced = registerAdvanced()
  // The section title is rendered once per registration; re-register on
  // language change so the navigation label follows the desktop language.
  ctx.effect(() => {
    const unsubscribe = desktopLocale.subscribe(() => {
      languageRow()
      advanced()
      languageRow = registerLanguageRow()
      advanced = registerAdvanced()
    })
    return () => {
      unsubscribe()
      languageRow()
      advanced()
    }
  }, 'desktop-settings language rows')
}
