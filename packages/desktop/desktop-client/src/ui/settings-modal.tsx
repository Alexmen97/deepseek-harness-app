/**
 * Desktop settings modal: language, DeepSeek credentials (status / replace /
 * remove with confirmation), the provider Base URL, and the diagnostics
 * surface. Opened by the native Settings menu item and from onboarding.
 *
 * @module @deepseek-ai/dsh-desktop-client/ui/settings-modal
 */

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { desktopBindings } from '../transport.ts'
import { desktopLocale, type DesktopLanguageSetting } from '../locale.ts'
import { desktopPalette, useDesktopAppearance, useDesktopStrings } from './strings.ts'

const CREDENTIAL_REF = 'DEEPSEEK_API_KEY'

/** The shared language selector (System plus the seven shipped languages). */
export function LanguageSelect(props: { setting: DesktopLanguageSetting; onSelect(next: DesktopLanguageSetting): void }): ReactElement {
  const { t } = useDesktopStrings()
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
    <select
      aria-label={t('settings.language')}
      style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #c7cbd4', background: '#fff', fontSize: '0.9rem' }}
      value={props.setting}
      onChange={(event) => { props.onSelect(event.target.value as DesktopLanguageSetting) }}
    >
      {options.map(option => (
        <option key={option.id} value={option.id}>{option.label}</option>
      ))}
    </select>
  )
}

interface DesktopSettingsModalProps {
  open: boolean
  onClose: () => void
}

/** The desktop-owned settings dialog (menu Settings). */
export function DesktopSettingsModal({ open, onClose }: DesktopSettingsModalProps): ReactElement | null {
  const host = desktopBindings().host
  const { t } = useDesktopStrings()
  const appearance = useDesktopAppearance()
  const palette = desktopPalette(appearance)
  const [configured, setConfigured] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [diagnostics, setDiagnostics] = useState('')

  useEffect(() => {
    if (!open) return
    let active = true
    setError(undefined)
    setConfirmingRemove(false)
    void Promise.all([
      host.credentialStatus(CREDENTIAL_REF),
      host.prefsGet('deepseekBaseUrl'),
      host.diagnostics().then(summary => Object.entries(summary).map(([key, value]) => key + ': ' + value).join('\n')),
    ]).then(([credential, savedBaseUrl, summary]) => {
      if (!active) return
      setConfigured(credential.configured)
      setBaseUrl(savedBaseUrl ?? '')
      setDiagnostics(summary)
    }, (failure: unknown) => {
      if (!active) return
      setError(failure instanceof Error ? failure.message : String(failure))
    })
    return () => { active = false }
  }, [host, open])

  if (!open) return null

  const replaceKey = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      if (apiKey.trim() === '') throw new Error(t('error.credentialEmpty'))
      await host.credentialSet(CREDENTIAL_REF, apiKey.trim())
      setApiKey('')
      setConfigured(true)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const removeKey = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      await host.credentialDelete(CREDENTIAL_REF)
      setConfigured(false)
      setConfirmingRemove(false)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const saveBaseUrl = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      const value = baseUrl.trim()
      if (value !== '' && !value.startsWith('https://')) throw new Error(t('settings.baseUrlInvalid'))
      await host.prefsSet('deepseekBaseUrl', value)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const section: CSSProperties = { margin: '0 0 1.2rem' }
  const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0' }
  const button: CSSProperties = {
    padding: '0.45rem 0.9rem', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: '#2f6fed', color: '#fff', fontSize: '0.9rem', fontWeight: 600,
  }
  const input: CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.6rem', borderRadius: 8,
    border: '1px solid #d0d4dc', fontSize: '0.9rem', margin: '0.35rem 0 0.5rem',
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t('settings.title')} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,22,28,0.45)', zIndex: 1100 }}>
      <div style={{ width: 460, background: palette.dialog, color: palette.text, borderRadius: 14, padding: '1.6rem 1.8rem', boxShadow: '0 18px 60px rgba(0,0,0,0.28)', maxHeight: '86vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{t('settings.title')}</h2>
          <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={onClose}>{t('settings.close')}</button>
        </div>
        <section style={section}>
          <div style={row}>
            <span style={{ fontSize: '0.9rem' }}>{t('settings.language')}</span>
            <LanguageSelect
              setting={desktopLocale.getSetting()}
              onSelect={(next) => { void desktopLocale.set(next) }}
            />
          </div>
        </section>
        <section style={section}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{t('credentials.title')}</h3>
          <p style={{ color: palette.muted, fontSize: '0.85rem' }}>{configured ? t('credentials.configured') : t('credentials.notConfigured')}</p>
          <input style={{ ...input, background: palette.input, borderColor: palette.inputBorder, color: palette.text }} type="password" autoComplete="off" aria-label={t('credentials.replace')} placeholder={t('credentials.replacePlaceholder')} value={apiKey} onChange={(event) => { setApiKey(event.target.value) }} />
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button style={button} disabled={busy} onClick={() => { void replaceKey() }}>{t('credentials.replaceSave')}</button>
            {configured && !confirmingRemove && (
              <button style={{ ...button, background: 'transparent', color: '#b3261e' }} disabled={busy} onClick={() => { setConfirmingRemove(true) }}>{t('credentials.remove')}</button>
            )}
            {confirmingRemove && (
              <>
                <span style={{ fontSize: '0.85rem', color: '#b3261e' }}>{t('credentials.removeConfirm')}</span>
                <button style={{ ...button, background: '#b3261e' }} disabled={busy} onClick={() => { void removeKey() }}>{t('credentials.removeConfirmYes')}</button>
                <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={() => { setConfirmingRemove(false) }}>{t('credentials.removeConfirmNo')}</button>
              </>
            )}
          </div>
        </section>
        <section style={section}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{t('settings.baseUrl')}</h3>
          <input style={{ ...input, background: palette.input, borderColor: palette.inputBorder, color: palette.text }} type="text" value={baseUrl} placeholder={t('settings.baseUrlPlaceholder')} onChange={(event) => { setBaseUrl(event.target.value) }} />
          <button style={button} disabled={busy} onClick={() => { void saveBaseUrl() }}>{t('settings.baseUrlSave')}</button>
        </section>
        <section style={{ margin: 0 }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem' }}>
            <button style={button} onClick={() => { void host.restartRuntime() }}>{t('settings.restart')}</button>
            <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={() => { void host.openLogs() }}>{t('settings.logs')}</button>
            <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={() => { void navigator.clipboard.writeText(diagnostics) }}>{t('settings.copy')}</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', background: palette.code, padding: '0.8rem', borderRadius: 8, fontSize: '0.8rem', maxHeight: 180, overflow: 'auto' }}>{diagnostics}</pre>
        </section>
        {error !== undefined && <p style={{ color: '#b3261e', fontSize: '0.9rem' }} role="alert">{error}</p>}
      </div>
    </div>
  )
}
