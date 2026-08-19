/** Quick Open store: in-memory workspace path index, fuzzy query, keyboard
 *  navigation. Index building is cancellable (stale results are discarded)
 *  and never blocks the main thread (the host walks on its blocking pool). */

import { useSyncExternalStore } from 'react'
import { desktopBindings } from '@deepseek-ai/dsh-desktop-client'
import { getEditorState, openFile, setActiveBuffer, setEditorVisible } from './editorStore.ts'
import { onFilesInvalidated } from './filesync.ts'
import { buildIndex, filterIndex, type QuickOpenEntry, type QuickOpenMatch } from './quick-open-core.ts'

export interface QuickOpenState {
  open: boolean
  query: string
  matches: QuickOpenMatch[]
  selection: number
  indexing: boolean
  error: string | undefined
}

const EMPTY: QuickOpenState = { open: false, query: '', matches: [], selection: 0, indexing: false, error: undefined }

let state: QuickOpenState = EMPTY
let index: QuickOpenEntry[] | undefined
let indexStale = true
let buildToken = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function setState(next: QuickOpenState): void {
  state = next
  emit()
}

/** Refresh the result list from the current query and index. */
function recompute(): void {
  const entries = index ?? []
  const matches = filterIndex(entries, state.query)
  setState({ ...state, matches, selection: Math.min(state.selection, Math.max(matches.length - 1, 0)), indexing: false, error: undefined })
}

/** Build (or rebuild) the index; stale builds are discarded by token. */
async function ensureIndex(force = false): Promise<void> {
  if (index !== undefined && !indexStale && !force) {
    recompute()
    return
  }
  if (state.indexing) return
  const token = ++buildToken
  setState({ ...state, indexing: true, error: undefined })
  try {
    const paths = await desktopBindings().host.workspaceFiles()
    if (token !== buildToken) return
    index = buildIndex(paths)
    indexStale = false
  } catch (error) {
    if (token !== buildToken) return
    setState({ ...state, indexing: false, error: error instanceof Error ? error.message : String(error) })
    return
  }
  recompute()
}

let installed = false

/**
 * One-time installation: Cmd+P toggles the palette, watcher invalidations
 * mark the index stale (rebuilt lazily on the next open), and a runtime
 * restart drops the cache.
 */
export function installQuickOpen(): void {
  if (installed) return
  installed = true
  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault()
      if (state.open) closeQuickOpen()
      else void openQuickOpen()
    }
  })
  onFilesInvalidated(() => {
    indexStale = true
    if (state.open) void ensureIndex(true)
  })
  desktopBindings().transport.subscribeState((lifecycle) => {
    if (lifecycle.state === 'running') {
      index = undefined
      indexStale = true
      if (state.open) void ensureIndex(true)
    }
  })
}

export function openQuickOpen(): Promise<void> {
  installQuickOpen()
  setState({ ...state, open: true, query: '', selection: 0 })
  return ensureIndex()
}

export function closeQuickOpen(): void {
  setState({ ...EMPTY })
}

export function setQuery(query: string): void {
  setState({ ...state, query, selection: 0 })
  recompute()
}

export function moveSelection(delta: number): void {
  const max = Math.max(state.matches.length - 1, 0)
  const selection = Math.min(Math.max(state.selection + delta, 0), max)
  setState({ ...state, selection })
}

/** Enter: activate the existing tab or open the file in the editor. */
export async function choose(): Promise<void> {
  const match = state.matches[state.selection]
  if (match === undefined) return
  const path = match.entry.path
  const open = getEditorState().buffers[path]
  if (open !== undefined) {
    setActiveBuffer(path)
    setEditorVisible(true)
    closeQuickOpen()
    return
  }
  const opened = await openFile(path)
  if (opened) closeQuickOpen()
}

export function useQuickOpenState(): QuickOpenState {
  installQuickOpen()
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => state,
  )
}

/** Test-only reset. */
export function resetQuickOpenForTest(): void {
  installed = false
  state = EMPTY
  index = undefined
  indexStale = true
  buildToken += 1
  listeners.clear()
}
