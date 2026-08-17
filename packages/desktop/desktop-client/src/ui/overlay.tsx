/**
 * Desktop overlay: first-run onboarding (welcome, provider, workspace), the
 * runtime connection status, and the crash-recovery surface. Rendered by the
 * app entry beside the reused shell; the shell itself stays untouched.
 *
 * @module @deepseek-ai/dsh-desktop-client/ui/overlay
 */

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { desktopBindings, type DesktopRuntimeLifecycle } from '../transport.ts'

const CREDENTIAL_REF = 'DEEPSEEK_API_KEY'

/** Minimal three-step onboarding: welcome, provider, workspace. */
export function DesktopOverlay(): ReactElement {
  const host = desktopBindings().host
  const transport = desktopBindings().transport
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<string | undefined>(undefined)
  const [credentialConfigured, setCredentialConfigured] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [lifecycle, setLifecycle] = useState<DesktopRuntimeLifecycle>({ state: 'stopped', generation: 0 })

  useEffect(() => {
    let active = true
    void Promise.all([host.prefsGet('workspace'), host.credentialStatus(CREDENTIAL_REF)]).then(([savedWorkspace, credential]) => {
      if (!active) return
      setWorkspace(savedWorkspace)
      setCredentialConfigured(credential.configured)
      setLoading(false)
    }, (failure: unknown) => {
      if (!active) return
      setError(failure instanceof Error ? failure.message : String(failure))
      setLoading(false)
    })
    return () => { active = false }
  }, [host])

  useEffect(() => transport.subscribeState((next) => { setLifecycle(next) }), [transport])

  const needsOnboarding = !loading && (workspace === undefined || !credentialConfigured)

  const saveCredential = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      if (apiKey.trim() === '') throw new Error('API key must not be empty')
      await host.credentialSet(CREDENTIAL_REF, apiKey.trim())
      if (baseUrl.trim() !== '') await host.prefsSet('deepseekBaseUrl', baseUrl.trim())
      setCredentialConfigured(true)
      setApiKey('')
      setStep(2)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const pickWorkspace = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      const picked = await host.pickWorkspace()
      if (picked !== null) {
        await host.prefsSet('workspace', picked)
        setWorkspace(picked)
        // Onboarding completes here: the runtime relaunches with the picked
        // workspace as its cwd and the connected shell replaces the dialog.
        void host.restartRuntime()
      }
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const label: CSSProperties = { marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }
  const button: CSSProperties = {
    padding: '0.55rem 1.1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: '#2f6fed', color: '#fff', fontSize: '0.95rem', fontWeight: 600,
  }
  const input: CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: 8,
    border: '1px solid #d0d4dc', fontSize: '0.95rem', marginBottom: '0.9rem',
  }

  if (needsOnboarding) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,22,28,0.45)', zIndex: 1000 }}>
        <div style={{ width: 420, background: '#fff', color: '#181a20', borderRadius: 14, padding: '2rem', boxShadow: '0 18px 60px rgba(0,0,0,0.28)' }}>
          {step === 0 && (
            <section>
              <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Welcome to Harness Desktop</h1>
              <p style={{ color: '#4a4f59', lineHeight: 1.5 }}>AI coding powered by DeepSeek Harness. Unofficial desktop client.</p>
              <button style={button} onClick={() => { setStep(1) }}>Continue</button>
            </section>
          )}
          {step === 1 && (
            <section>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Connect DeepSeek</h2>
              <label style={label} htmlFor="desktop-api-key">API Key</label>
              <input id="desktop-api-key" style={input} type="password" autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value) }} placeholder="sk-..." />
              <label style={label} htmlFor="desktop-base-url">Base URL (optional)</label>
              <input id="desktop-base-url" style={input} type="text" value={baseUrl} onChange={(event) => { setBaseUrl(event.target.value) }} placeholder="https://api.deepseek.com" />
              <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                <button style={button} disabled={busy} onClick={() => { void saveCredential() }}>{busy ? 'Saving…' : 'Save to Keychain'}</button>
                <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={() => { setStep(0) }}>Back</button>
              </div>
            </section>
          )}
          {step === 2 && (
            <section>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Choose a project</h2>
              <p style={{ color: '#4a4f59' }}>Select the folder Harness will work in. The native macOS picker opens next.</p>
              <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                <button style={button} disabled={busy} onClick={() => { void pickWorkspace() }}>{busy ? 'Waiting…' : 'Open Folder Picker'}</button>
                <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={() => { setStep(1) }}>Back</button>
              </div>
            </section>
          )}
          {error !== undefined && <p style={{ color: '#b3261e', fontSize: '0.9rem' }} role="alert">{error}</p>}
        </div>
      </div>
    )
  }

  const stateLabel = {
    starting: 'Starting Harness…',
    running: 'Connected',
    restarting: 'Restarting Harness…',
    stopped: 'Harness stopped',
    failed: 'Harness unavailable',
    stopping: 'Stopping Harness…',
  }[lifecycle.state]
  return (
    <div aria-live="polite">
      <div style={{ position: 'fixed', top: 10, right: 12, zIndex: 900, display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: lifecycle.state === 'running' ? '#2e9e5b' : lifecycle.state === 'failed' ? '#b3261e' : '#d9a514' }} />
        <span>{stateLabel}</span>
      </div>
      {lifecycle.state === 'failed' && (
        <div role="alert" style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 950, background: '#fff', color: '#181a20', borderRadius: 12, padding: '1rem 1.3rem', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
          <span>Harness stopped unexpectedly.</span>
          <button style={button} onClick={() => { void host.restartRuntime() }}>Restart Harness</button>
          <button style={{ ...button, background: 'transparent', color: '#4a4f59' }} onClick={() => { void host.openLogs() }}>Open Logs</button>
        </div>
      )}
    </div>
  )
}
