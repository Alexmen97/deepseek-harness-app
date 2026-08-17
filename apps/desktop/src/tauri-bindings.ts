/**
 * Production bindings: the Tauri IPC transport and host capabilities.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import {
  installDesktopBindings,
  type DesktopBindings,
  type DesktopRuntimeFrame,
  type DesktopRuntimeLifecycle,
} from '@deepseek-ai/dsh-desktop-client'

/** Ask for macOS notification permission once, lazily, on the first notify. */
async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (await isPermissionGranted()) return true
    return (await requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/** Parse the Rust multiline summary into a stable key/value record. */
function parseDiagnostics(summary: string): Record<string, string> {
  const record: Record<string, string> = {}
  for (const line of summary.split('\n')) {
    const at = line.indexOf(':')
    if (at < 0) continue
    record[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return record
}

/** Build and install the production Tauri bindings before the shell boots. */
export function installTauriBindings(): void {
  const bindings: DesktopBindings = {
    transport: {
      request: async (request) => {
        try {
          const result = await invoke<unknown>('rpc_request', {
            requestId: crypto.randomUUID(),
            generation: request.generation,
            method: request.method,
            rpcId: request.rpcId,
            payload: request.payload,
          })
          return result
        } catch (error) {
          window.dispatchEvent(new CustomEvent('desktop:notice', {
            detail: 'rpc ' + request.method + ' failed: ' + (error instanceof Error ? error.message : String(error)),
          }))
          throw error
        }
      },
      subscribeFrames: (handler) => {
        const promise = listen<DesktopRuntimeFrame>('runtime://frame', (event) => { handler(event.payload) })
        let disposed = false
        return () => {
          if (disposed) return
          disposed = true
          void promise.then((unlisten) => { unlisten() })
        }
      },
      subscribeState: (handler) => {
        const promise = listen<DesktopRuntimeLifecycle>('runtime://state', (event) => { handler(event.payload) })
        let disposed = false
        return () => {
          if (disposed) return
          disposed = true
          void promise.then((unlisten) => { unlisten() })
        }
      },
    },
    host: {
      pickWorkspace: async () => invoke<string | null>('pick_workspace'),
      credentialStatus: async ref => invoke('credential_status', { reference: ref }),
      credentialSet: async (ref, value) => invoke('credential_set', { reference: ref, value }),
      credentialDelete: async ref => invoke('credential_delete', { reference: ref }),
      openLogs: async () => invoke('open_logs'),
      openExternal: async url => invoke('open_external', { url }),
      prefsGet: async key => invoke<string | undefined>('prefs_get', { key }),
      prefsSet: async (key, value) => invoke('prefs_set', { key, value }),
      restartRuntime: async () => invoke('runtime_restart'),
      stopRuntime: async () => invoke('runtime_stop'),
      diagnostics: async () => parseDiagnostics(await invoke<string>('diagnostics')),
      setMenuLanguage: async language => invoke('menu_set_language', { language }),
      notify: async (_kind, title, body) => {
        if (!(await ensureNotificationPermission())) return
        sendNotification({ title, body })
      },
      pickAttachments: async () => invoke('pick_attachments'),
      subscribeFocus: (listener) => {
        const promises = [
          listen('tauri://focus', () => { listener(true) }),
          listen('tauri://blur', () => { listener(false) }),
        ]
        let disposed = false
        return () => {
          if (disposed) return
          disposed = true
          void Promise.all(promises).then((unlistens) => {
            for (const unlisten of unlistens) unlisten()
          })
        }
      },
    },
  }
  installDesktopBindings(bindings)
  // Native menu selections become window events: the desktop host plugin and
  // the overlay own the WebView-side actions.
  const MENU_EVENTS: Array<[string, string]> = [
    ['menu://new-session', 'desktop:menu-new-session'],
    ['menu://open-workspace', 'desktop:menu-open-workspace'],
    ['menu://restart-harness', 'desktop:menu-restart-harness'],
    ['menu://show-logs', 'desktop:menu-show-logs'],
    ['menu://attach-file', 'desktop:menu-attach-file'],
    ['menu://settings', 'desktop:menu-settings'],
  ]
  for (const [tauriEvent, domEvent] of MENU_EVENTS) {
    void listen(tauriEvent, () => {
      window.dispatchEvent(new CustomEvent(domEvent))
    })
  }
  // Manager lifecycle logs share the bounded desktop log store.
  void listen<{ line: string }>('runtime://log', (event) => {
    void invoke('log_line', { line: event.payload.line }).catch(() => {})
  })
}

/** Ask the Rust manager to start the runtime (fire and forget before boot). */
export function requestRuntimeStart(): void {
  void invoke('runtime_start').catch((error: unknown) => {
    console.error('[desktop] runtime_start failed:', error)
  })
}
