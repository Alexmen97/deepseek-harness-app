/**
 * Desktop host plugin: exposes the native host capabilities and the runtime
 * lifecycle store to the client plugins (onboarding, picker, settings).
 *
 * @module @deepseek-ai/dsh-desktop-client/client/host
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { desktopBindings, type DesktopCredentialStatus, type DesktopRuntimeLifecycle } from '../transport.ts'
import { desktopLocale } from '../locale.ts'
import { desktopText, type DesktopStringKey } from '../ui/strings.ts'
import { notificationForFrame, notificationForFailedState } from './notifications.ts'

/** Observable desktop host face consumed by the onboarding and settings UI. */
export interface DesktopHostService {
  /** Latest runtime lifecycle snapshot. */
  getLifecycle(): DesktopRuntimeLifecycle
  /** Subscribe to lifecycle changes. */
  onLifecycle(listener: () => void): () => void
  /** Open the native macOS directory picker; null on cancellation. */
  pickWorkspace(): Promise<string | null>
  /** Report one credential's configured state; never the value. */
  credentialStatus(ref: string): Promise<DesktopCredentialStatus>
  /** Store one credential in the macOS Keychain. */
  credentialSet(ref: string, value: string): Promise<void>
  /** Delete one credential from the macOS Keychain. */
  credentialDelete(ref: string): Promise<void>
  /** Reveal the runtime logs. */
  openLogs(): Promise<void>
  /** Open an external URL in the system browser. */
  openExternal(url: string): Promise<void>
  /** Read one desktop preference. */
  prefsGet(key: string): Promise<string | undefined>
  /** Write one desktop preference. */
  prefsSet(key: string, value: string): Promise<void>
  /** Ask the Rust manager to restart the runtime. */
  restartRuntime(): Promise<void>
  /** Stop the runtime gracefully. */
  stopRuntime(): Promise<void>
  /** Render a redacted diagnostics summary. */
  diagnostics(): Promise<Record<string, string>>
  /** Rebuild the native menu with the resolved desktop language (one of seven). */
  setMenuLanguage(language: string): Promise<void>
  /** Create a session in the current workspace (native New Session action). */
  newSession(): Promise<void>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    desktopHost: DesktopHostService
  }
}

export const name = 'desktop-host'
export const inject = ['connection', 'remote']

/** Provide the desktop host service backed by the installed bindings. */
export function apply(ctx: Context): void {
  const host = desktopBindings().host
  const transport = desktopBindings().transport
  let lifecycle: DesktopRuntimeLifecycle = { state: 'stopped', generation: 0 }
  const listeners = new Set<() => void>()
  let focused = true
  const focusDispose = host.subscribeFocus((next) => { focused = next })
  const notificationCopy: Record<string, { title: DesktopStringKey; body: DesktopStringKey }> = {
    approval: { title: 'notification.approval', body: 'notification.approvalBody' },
    question: { title: 'notification.question', body: 'notification.questionBody' },
    'task-completed': { title: 'notification.taskCompleted', body: 'notification.taskCompletedBody' },
    'runtime-failed': { title: 'notification.runtimeFailed', body: 'notification.runtimeFailedBody' },
  }
  const notify = (kind: string): void => {
    const copy = notificationCopy[kind]
    if (copy === undefined) return
    const language = desktopLocale.get()
    void host.notify(kind, desktopText(language, copy.title), desktopText(language, copy.body))
  }
  const pinUpstreamLocale = (): void => {
    void (async () => {
      try {
        const connection = ctx.get('connection') as {
          api: {
            settings: {
              mutate(payload: { ns: string; ops: Array<{ op: 'set'; path: string[]; value: string }> }): Promise<{ result: { ok: boolean; error?: { message: string } } }>
            }
          }
        }
        const response = await connection.api.settings.mutate({
          ns: 'locale',
          ops: [{ op: 'set', path: ['preference'], value: desktopLocale.get() }],
        })
        if (!response.result.ok) {
          console.error('[desktop] failed to pin the upstream locale:', response.result.error)
        }
      } catch (error) {
        console.error('[desktop] failed to pin the upstream locale:', error)
      }
    })()
  }
  const frameDispose = transport.subscribeFrames((frame) => {
    const decision = notificationForFrame(frame, focused)
    if (decision !== undefined) notify(decision.kind)
  })
  let pinnedGeneration = 0
  transport.subscribeState((next) => {
    if (next.state === 'failed' && lifecycle.state !== 'failed') notify(notificationForFailedState().kind)
    if (next.state === 'running' && next.generation !== pinnedGeneration) {
      pinnedGeneration = next.generation
      pinUpstreamLocale()
    }
    lifecycle = next
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[desktop] lifecycle listener threw:', error)
      }
    }
  })
  const service: DesktopHostService = {
    getLifecycle: () => lifecycle,
    onLifecycle: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    pickWorkspace: () => host.pickWorkspace(),
    credentialStatus: ref => host.credentialStatus(ref),
    credentialSet: (ref, value) => host.credentialSet(ref, value),
    credentialDelete: ref => host.credentialDelete(ref),
    openLogs: () => host.openLogs(),
    openExternal: url => host.openExternal(url),
    prefsGet: key => host.prefsGet(key),
    prefsSet: (key, value) => host.prefsSet(key, value),
    restartRuntime: () => host.restartRuntime(),
    stopRuntime: () => host.stopRuntime(),
    diagnostics: () => host.diagnostics(),
    setMenuLanguage: language => host.setMenuLanguage(language),
    newSession: async () => {
      const connection = ctx.get('connection') as {
        api: {
          workspaces: { list(payload: {}): Promise<{ result: { ok: boolean; value?: { items?: Array<{ workspaceId: unknown }> } } }> }
          sessions: { create(payload: { workspaceId: unknown; sessionId: SessionId }): Promise<unknown> }
        }
      }
      const listed = await connection.api.workspaces.list({})
      if (!listed.result.ok) throw new Error('workspace list failed')
      const workspaceId = listed.result.value?.items?.[0]?.workspaceId
      if (workspaceId === undefined) throw new Error('no workspace is available yet')
      await connection.api.sessions.create({ workspaceId, sessionId: crypto.randomUUID() as SessionId })
    },
  }
  // Desktop language policy: the upstream client ships all seven dictionaries,
  // so the upstream active locale follows the resolved desktop language. The
  // desktop resolution maps unsupported macOS locales to English, which is
  // therefore the only fallback.
  pinUpstreamLocale()
  const unpinLanguage = desktopLocale.subscribe(() => { pinUpstreamLocale() })
  const unpin = ctx.on('connection/reset', () => { pinUpstreamLocale() })
  // Native menu actions: the WebView-owned ones route here; Settings opens
  // the desktop settings modal through a window event the overlay owns.
  const menuActions: Array<[string, () => void]> = [
    ['desktop:menu-new-session', () => { void service.newSession().catch((error: unknown) => { console.error('[desktop] new session failed:', error) }) }],
    ['desktop:menu-open-workspace', () => {
      void service.pickWorkspace().then(async (picked) => {
        if (picked === null) return
        await service.prefsSet('workspace', picked)
        await service.restartRuntime()
      }).catch((error: unknown) => { console.error('[desktop] open workspace failed:', error) })
    }],
    ['desktop:menu-restart-harness', () => { void service.restartRuntime() }],
    ['desktop:menu-show-logs', () => { void service.openLogs() }],
    ['desktop:menu-attach-file', () => {
      void host.pickAttachments().then((picked) => {
        if (picked.length === 0) return
        const files = picked.map((attachment) => {
          const bytes = Uint8Array.from(atob(attachment.data), char => char.charCodeAt(0))
          return new File([bytes], attachment.name, { type: attachment.mediaType })
        })
        // Reuse the upstream intake verbatim: a document drop event reaches
        // the composer's existing validation, limits, and error toasts.
        const transfer = new DataTransfer()
        for (const file of files) transfer.items.add(file)
        document.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
      }).catch((error: unknown) => {
        window.dispatchEvent(new CustomEvent('desktop:notice', {
          detail: error instanceof Error ? error.message : String(error),
        }))
      })
    }],
  ]
  const menuDisposers = menuActions.map(([event, action]) => {
    window.addEventListener(event, action)
    return () => { window.removeEventListener(event, action) }
  })
  ctx.effect(() => () => { for (const dispose of menuDisposers) dispose() }, 'desktop-host menu actions')
  ctx.effect(() => () => {
    focusDispose()
    frameDispose()
    unpin()
    unpinLanguage()
  }, 'desktop-host notifications')
  ctx.provide('desktopHost', service)
}
