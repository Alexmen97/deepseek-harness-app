/**
 * Desktop entry: installs the Tauri bindings, requests the runtime start,
 * boots the reused web shell over the desktop module table, and mounts the
 * desktop overlay (onboarding, connection status, crash recovery).
 */

import { createRoot } from 'react-dom/client'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AppWebEntry } from '@deepseek-ai/dsh-client-web'
import { DesktopOverlay } from '@deepseek-ai/dsh-desktop-client/src/ui/overlay'
import { installTauriBindings, requestRuntimeStart } from './tauri-bindings'
import { DESKTOP_ENTRY_IDS, DESKTOP_STATICS } from './desktop-modules'

const ROOT_ID = 'root'
const OVERLAY_ID = 'desktop-overlay'

/**
 * Top-level boundary for the desktop-only surface. A rendering exception
 * here must never destroy runtime ownership: Rust keeps owning the sidecar
 * while the interface shows a recoverable error screen.
 */
class DesktopErrorBoundary extends Component<{ children: ReactNode }, { error: Error | undefined }> {
  state: { error: Error | undefined } = { error: undefined }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[desktop] overlay rendering failed:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error !== undefined) {
      return (
        <div role="alert" style={{ padding: '2rem', fontFamily: 'system-ui', color: '#181a20', background: '#fff', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.3rem', marginTop: 0 }}>Harness Desktop hit a rendering error</h1>
          <p>The Harness runtime process remains owned by the desktop host. Reload the interface or inspect the logs.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f5f7', padding: '0.9rem', borderRadius: 8 }}>{String(this.state.error)}</pre>
          <button
            style={{ padding: '0.55rem 1.1rem', borderRadius: 8, border: 'none', background: '#2f6fed', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { location.reload() }}
          >
            Reload interface
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById(ROOT_ID)
if (root === null) throw new Error('desktop entry: #root element missing')
const overlay = document.getElementById(OVERLAY_ID)
if (overlay === null) throw new Error('desktop entry: #desktop-overlay element missing')

installTauriBindings()

// The desktop boot manifest: one entry per statically bundled client plugin.
// urls are synthetic keys the loadBundle seam maps back to the module table.
;(globalThis as unknown as { __DSH_BOOT__: unknown }).__DSH_BOOT__ = {
  rev: 'desktop-1',
  entries: DESKTOP_ENTRY_IDS.map(id => ({
    id,
    url: 'static://' + id,
    rev: 'desktop-1',
    inject: [],
    immediately: true,
  })),
}

// The shell kernel fetches nothing: every plugin resolves through the static
// module table via the bundle-load seam.
const entry = new AppWebEntry(root, {
  loadBundle: (url) => {
    const id = url.startsWith('static://') ? url.slice('static://'.length) : url
    const module = DESKTOP_STATICS[id]
    if (module === undefined) return Promise.reject(new Error('desktop static module not registered: ' + id))
    const moduleScope = globalThis as unknown as {
      __ModuleLoader__?: { load(handoff: { id: string; factory: () => Record<string, unknown> }): void }
    }
    const loader = moduleScope.__ModuleLoader__
    if (loader === undefined) return Promise.reject(new Error('module loader unavailable'))
    loader.load({ id, factory: () => module as Record<string, unknown> })
    return Promise.resolve()
  },
})
void entry.run()

const overlayRoot = createRoot(overlay)
overlayRoot.render(
  <DesktopErrorBoundary>
    <DesktopOverlay />
  </DesktopErrorBoundary>,
)

requestRuntimeStart()
