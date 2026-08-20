/**
 * Production bindings: the Tauri IPC transport and host capabilities.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import {
  installDesktopBindings,
  type DesktopBindings,
  type DesktopGitError,
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

/** Normalize a rejected Tauri invoke into the typed git error contract. */
function parseGitError(error: unknown): DesktopGitError & Error {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const err = new Error((error as { message?: string }).message ?? 'the git operation failed') as DesktopGitError & Error
    err.code = (error as { code: string }).code
    const detail = (error as { detail?: string }).detail
    if (detail !== undefined) err.detail = detail
    return err
  }
  const message = error instanceof Error ? error.message : String(error)
  const trimmed = message.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<DesktopGitError>
      if (typeof parsed.code === 'string' && typeof parsed.message === 'string') {
        const err = new Error(parsed.message) as DesktopGitError & Error
        err.code = parsed.code
        if (parsed.detail !== undefined) err.detail = parsed.detail
        return err
      }
    } catch {
      // fall through to the generic category
    }
  }
  const err = new Error(trimmed !== '' ? trimmed : 'the git operation failed') as DesktopGitError & Error
  err.code = 'GIT_OPERATION_FAILED'
  return err
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
      fsList: async path => invoke('fs_list', { path }),
      fsReadText: async path => invoke('fs_read_text', { path }),
      revealInPath: async path => invoke('reveal_in_path', { path }),
      gitStatus: async () => invoke('git_status'),
      gitDiff: async () => invoke('git_diff'),
      gitStatusV2: async () => invoke('git_status_v2'),
      gitStageFile: async (path) => {
        try {
          await invoke('git_stage_file', { path })
        } catch (error) {
          throw parseGitError(error)
        }
      },
      gitUnstageFile: async (path) => {
        try {
          await invoke('git_unstage_file', { path })
        } catch (error) {
          throw parseGitError(error)
        }
      },
      gitDiscardFile: async (path) => {
        try {
          await invoke('git_discard_file', { path })
        } catch (error) {
          throw parseGitError(error)
        }
      },
      gitDiffFile: async (path, cached) => {
        try {
          return await invoke('git_diff_file', { path, cached })
        } catch (error) {
          throw parseGitError(error)
        }
      },
      gitStageHunk: async (request) => {
        try {
          return await invoke('git_stage_hunk', { req: request })
        } catch (error) {
          throw parseGitError(error)
        }
      },
      gitUnstageHunk: async (request) => {
        try {
          return await invoke('git_unstage_hunk', { req: request })
        } catch (error) {
          throw parseGitError(error)
        }
      },
      gitDiscardHunk: async (request) => {
        try {
          return await invoke('git_discard_hunk', { req: request })
        } catch (error) {
          throw parseGitError(error)
        }
      },
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
      runtimeStatus: async () => {
        const status = await invoke<{ state: string; generation: number }>('runtime_status')
        return { state: status.state as DesktopRuntimeLifecycle['state'], generation: status.generation }
      },
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
      subscribeWorkspaceChanged: (listener) => {
        const promise = listen<{ generation: number; paths: string[] }>('workspace://changed', (event) => {
          listener({ generation: event.payload.generation, paths: event.payload.paths })
        })
        let disposed = false
        return () => {
          if (disposed) return
          disposed = true
          void promise.then((unlisten) => { unlisten() })
        }
      },
      quitGuardArm: async (armed) => { await invoke('quit_guard_arm', { armed }) },
      subscribeQuitGuard: (listener) => {
        const promise = listen<{ generation: number }>('desktop://quit-guard', (event) => {
          listener(event.payload.generation)
        })
        let disposed = false
        return () => {
          if (disposed) return
          disposed = true
          void promise.then((unlisten) => { unlisten() })
        }
      },
      quitNow: async () => { await invoke('quit_now') },
      workspaceFiles: async () => await invoke<string[]>('workspace_files'),
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
