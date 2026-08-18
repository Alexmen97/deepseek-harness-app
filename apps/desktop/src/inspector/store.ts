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

/** Send one terminal RPC over the runtime transport and return its result. */
export async function terminalRequest<T>(method: string, params: unknown): Promise<T> {
  const bindings = desktopBindings()
  return await bindings.transport.request({
    method,
    rpcId: crypto.randomUUID(),
    payload: params,
    generation: currentGeneration,
  }) as T
}
