/**
 * Production bindings: the Tauri IPC transport and host capabilities.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  installDesktopBindings,
  type DesktopBindings,
  type DesktopRuntimeFrame,
  type DesktopRuntimeLifecycle,
} from '@deepseek-ai/dsh-desktop-client'

/** Build and install the production Tauri bindings before the shell boots. */
export function installTauriBindings(): void {
  const bindings: DesktopBindings = {
    transport: {
      request: async (request) => {
        const result = await invoke<unknown>('rpc_request', {
          requestId: crypto.randomUUID(),
          generation: request.generation,
          method: request.method,
          rpcId: request.rpcId,
          payload: request.payload,
        })
        return result
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
      diagnostics: async () => ({ summary: await invoke<string>('diagnostics') }),
    },
  }
  installDesktopBindings(bindings)
}

/** Ask the Rust manager to start the runtime (fire and forget before boot). */
export function requestRuntimeStart(): void {
  void invoke('runtime_start').catch((error: unknown) => {
    console.error('[desktop] runtime_start failed:', error)
  })
}
