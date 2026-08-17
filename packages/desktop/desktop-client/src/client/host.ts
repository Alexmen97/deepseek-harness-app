/**
 * Desktop host plugin: exposes the native host capabilities and the runtime
 * lifecycle store to the client plugins (onboarding, picker, settings).
 *
 * @module @deepseek-ai/dsh-desktop-client/client/host
 */

import type { Context } from '@deepseek-ai/cordis'
import { desktopBindings, type DesktopCredentialStatus, type DesktopRuntimeLifecycle } from '../transport.ts'

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
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    desktopHost: DesktopHostService
  }
}

export const name = 'desktop-host'
export const inject: string[] = []

/** Provide the desktop host service backed by the installed bindings. */
export function apply(ctx: Context): void {
  const host = desktopBindings().host
  const transport = desktopBindings().transport
  let lifecycle: DesktopRuntimeLifecycle = { state: 'stopped', generation: 0 }
  const listeners = new Set<() => void>()
  transport.subscribeState((next) => {
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
  }
  ctx.provide('desktopHost', service)
}
