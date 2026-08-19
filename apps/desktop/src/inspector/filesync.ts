/**
 * M5B filesystem synchronization: the frontend side of the native watcher.
 * The watcher emits path-only invalidation batches (never content or
 * versions); this module coalesces bursts, drops stale generations, and
 * fans the result out to Files, Changes, the editor, and Quick Open.
 * ctx.fs + FsVersion stay the only data authority.
 */

import { desktopBindings } from '@deepseek-ai/dsh-desktop-client'
import { getInspectorState } from './store.ts'
import { reconcileAllBuffers } from './editorStore.ts'
import { createFilesyncScheduler } from './filesync-core.ts'
import type { FilesyncScheduler } from './filesync-core.ts'

export { createFilesyncScheduler, FILESYNC_DEBOUNCE_MS } from './filesync-core.ts'
export type { FilesyncScheduler } from './filesync-core.ts'

let installed = false
let currentGeneration = -1
let scheduler: FilesyncScheduler | undefined
const listeners = new Set<(paths: string[] | undefined) => void>()

/**
 * One-time installation: subscribes to native watcher batches and runtime
 * lifecycle. After a reconnect (new generation in Running state), open
 * buffers are reconciled once a session is active again.
 */
export function installFilesync(): void {
  if (installed) return
  installed = true
  const bindings = desktopBindings()
  scheduler = createFilesyncScheduler((paths) => {
    for (const listener of [...listeners]) {
      try {
        listener(paths)
      } catch (error) {
        console.error('[desktop] filesync listener threw:', error)
      }
    }
  })
  bindings.transport.subscribeState((lifecycle) => {
    if (lifecycle.generation === currentGeneration) return
    currentGeneration = lifecycle.generation
    scheduler?.reset(currentGeneration)
    if (lifecycle.state === 'running') scheduleReconnectReconcile()
  })
  bindings.host.subscribeWorkspaceChanged((event) => {
    scheduler?.push(event.generation, event.paths, event.full === true)
  })
}

/** Reconcile open buffers after a runtime reconnect once a session is live. */
function scheduleReconnectReconcile(): void {
  let attempts = 0
  const tryReconcile = (): void => {
    if (getInspectorState().activeSessionId !== undefined) {
      void reconcileAllBuffers()
      return
    }
    attempts += 1
    if (attempts < 20) setTimeout(tryReconcile, 250)
  }
  tryReconcile()
}

/** Subscribe to coalesced invalidations; undefined paths mean invalidate-all. */
export function onFilesInvalidated(listener: (paths: string[] | undefined) => void): () => void {
  installFilesync()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Test-only reset of the one-time installation. */
export function resetFilesyncForTest(): void {
  installed = false
  currentGeneration = -1
  scheduler?.dispose()
  scheduler = undefined
  listeners.clear()
}
