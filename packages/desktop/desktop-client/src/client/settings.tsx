/**
 * Desktop settings plugin: registers an Advanced section in the upstream
 * settings panel with versions, runtime state, Restart Harness, Open Logs,
 * and Copy Diagnostics (secrets removed).
 *
 * @module @deepseek-ai/dsh-desktop-client/client/settings
 */

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { DesktopHostService } from './host.ts'

export const name = 'desktop-settings'
export const inject = ['slots', 'desktopHost']

interface AdvancedInjected {
  host: DesktopHostService
}

/** One desktop-owned settings section (versions, runtime, diagnostics). */
function AdvancedSection(props: { host: DesktopHostService }): ReactElement {
  const host = props.host
  const [lifecycle, setLifecycle] = useState(host.getLifecycle())
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({})
  useEffect(() => host.onLifecycle(() => { setLifecycle(host.getLifecycle()) }), [host])
  const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', fontSize: '0.9rem' }
  const action: CSSProperties = {
    padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #c7cbd4', background: '#fff', cursor: 'pointer',
  }
  return (
    <section aria-label="Advanced">
      <div style={row}><span>Desktop version</span><span>0.1.0</span></div>
      <div style={row}><span>Harness version</span><span>0.1.0-rc.7</span></div>
      <div style={row}><span>Desktop protocol</span><span>1</span></div>
      <div style={row}><span>Runtime state</span><span>{lifecycle.state} (generation {lifecycle.generation})</span></div>
      <div style={{ display: 'flex', gap: '0.6rem', padding: '0.6rem 0' }}>
        <button style={action} onClick={() => { void host.restartRuntime() }}>Restart Harness</button>
        <button style={action} onClick={() => { void host.openLogs() }}>Open Logs</button>
        <button style={action} onClick={() => { void host.diagnostics().then(setDiagnostics).then(() => navigator.clipboard.writeText(Object.entries(diagnostics).map(([key, value]) => key + ': ' + value).join('\n'))) }}>
          Copy Diagnostics
        </button>
      </div>
    </section>
  )
}

/** Register the Advanced section in the upstream settings panel. */
export function apply(ctx: Context): void {
  const host = ctx.desktopHost
  const injected = (): AdvancedInjected => ({ host })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'advanced',
    order: 90,
    label: () => 'Advanced',
    inject: injected,
  }, AdvancedSection))
}
