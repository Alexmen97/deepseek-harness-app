/**
 * Unsaved-changes quit guard: the frontend arms the native guard while any
 * editor buffer is dirty; a quit attempt is paused by Rust and surfaced
 * here. The runtime is never shut down before the user decides.
 */

import { useSyncExternalStore } from 'react'
import { desktopBindings } from '@deepseek-ai/dsh-desktop-client'
import { dirtyBufferPaths, hasDirtyBuffers, saveAllBuffers, subscribeEditorStore } from './editorStore.ts'

export interface QuitGuardState {
  /** A quit attempt is paused waiting for the user decision. */
  requested: boolean
  /** Save All failed on at least one buffer (stale version). */
  saveFailed: boolean
  dirtyPaths: string[]
}

let state: QuitGuardState = { requested: false, saveFailed: false, dirtyPaths: [] }
let armed = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function syncGuard(): void {
  const next = hasDirtyBuffers()
  if (next === armed) return
  armed = next
  void desktopBindings().host.quitGuardArm(next).catch(() => {})
}

let installed = false

/** One-time installation: tracks dirty buffers and quit-guard requests. */
export function installQuitGuard(): void {
  if (installed) return
  installed = true
  subscribeEditorStore(() => {
    state = { ...state, dirtyPaths: dirtyBufferPaths() }
    emit()
    syncGuard()
  })
  // Boot sync: a webview reload must not leave the native guard armed from
  // a previous instance's dirty buffer (the Rust flag would then block quit
  // with no dialog).
  state = { ...state, dirtyPaths: dirtyBufferPaths() }
  syncGuard()
  desktopBindings().host.subscribeQuitGuard(() => {
    state = { ...state, requested: true, saveFailed: false }
    emit()
  })
}

/** Cancel the quit: nothing shuts down; the guard stays armed. */
export function cancelQuit(): void {
  state = { ...state, requested: false, saveFailed: false }
  emit()
}

/** Discard and quit: disarm the guard, then let Rust exit normally. */
export async function discardAndQuit(): Promise<void> {
  await desktopBindings().host.quitGuardArm(false)
  await desktopBindings().host.quitNow()
}

/** Save all and quit: only when every save succeeds (FsVersion-guarded). */
export async function saveAllAndQuit(): Promise<void> {
  const result = await saveAllBuffers()
  if (!result.ok) {
    state = { ...state, saveFailed: true }
    emit()
    return
  }
  await desktopBindings().host.quitGuardArm(false)
  await desktopBindings().host.quitNow()
}

/** Synchronous accessor for tests and non-component modules. */
export function getQuitGuardState(): QuitGuardState {
  installQuitGuard()
  return state
}

export function useQuitGuardState(): QuitGuardState {
  installQuitGuard()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => state,
  )
}

/** Test-only reset. */
export function resetQuitGuardForTest(): void {
  installed = false
  state = { requested: false, saveFailed: false, dirtyPaths: [] }
  armed = false
  listeners.clear()
}
