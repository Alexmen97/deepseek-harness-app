/**
 * M4 inspector store: structured upstream state consumed from the desktop
 * transport frames (mux session events, jobs snapshots, plan projections)
 * plus terminal output notifications. Harness SessionEvent stays the source
 * of truth; this store only projects it for the Inspector, keyed by runtime
 * generation so a restart never leaks stale state.
 */

import { useSyncExternalStore } from 'react'
import { desktopBindings, type DesktopRuntimeFrame } from '@deepseek-ai/dsh-desktop-client'
import { applyInspectorFrame, EMPTY_INSPECTOR } from './store-core.ts'
import type { InspectorJob, InspectorPlan, InspectorState, InspectorSubagent, TerminalOutput } from './store-core.ts'

export type { InspectorJob, InspectorPlan, InspectorState, InspectorSubagent, TerminalOutput }

let state: InspectorState = EMPTY_INSPECTOR
let currentGeneration = -1
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function applyFrame(frame: DesktopRuntimeFrame): void {
  state = applyInspectorFrame(state, frame)
  emit()
}

let installed = false
/** Resolves once the runtimeStatus boot anchor has been applied. */
let generationReady: Promise<void> | undefined
/** Install the one frame subscription and lifecycle-reset hook. */
export function installInspectorStore(): void {
  if (installed) return
  installed = true
  const bindings = desktopBindings()
  bindings.transport.subscribeFrames((frame) => { applyFrame(frame) })
  bindings.transport.subscribeState((lifecycle) => {
    currentGeneration = lifecycle.generation
    if (lifecycle.generation !== state.generation) {
      state = { generation: lifecycle.generation, plans: {}, jobs: {}, subagents: {}, terminals: {} }
      emit()
    }
  })
  // Boot anchor: desktop.status only fires on transitions, so an install
  // that lands after the last transition would otherwise keep sending
  // generation -1 and every rpc would be rejected by the Rust manager.
  generationReady = bindings.host.runtimeStatus().then((status) => {
    if (currentGeneration < status.generation) {
      currentGeneration = status.generation
      if (status.generation !== state.generation) {
        state = { generation: status.generation, plans: {}, jobs: {}, subagents: {}, terminals: {} }
        emit()
      }
    }
  }).catch(() => {})
}

export function useInspectorState(): InspectorState {
  installInspectorStore()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => state,
  )
}

/** Synchronous accessor for non-component modules (the M5A editor store). */
export function getInspectorState(): InspectorState {
  installInspectorStore()
  return state
}

/** Test-only reset of the one-time install and the frame state. */
export function resetInspectorStoreForTest(): void {
  installed = false
  state = EMPTY_INSPECTOR
  currentGeneration = -1
  generationReady = undefined
}

/** Send one terminal RPC over the runtime transport and return its result. */
export async function terminalRequest<T>(method: string, params: unknown): Promise<T> {
  installInspectorStore()
  if (generationReady !== undefined) await generationReady
  const bindings = desktopBindings()
  return await bindings.transport.request({
    method,
    rpcId: crypto.randomUUID(),
    payload: params,
    generation: currentGeneration,
  }) as T
}
