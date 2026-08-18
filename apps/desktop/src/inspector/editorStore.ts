/** M5A editor buffer store: the UI authority for open buffers; ctx.fs stays the data authority. */

import { useSyncExternalStore } from 'react'
import { getInspectorState, terminalRequest } from './store.ts'

export type EditorStatus = 'loading' | 'clean' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'readonly' | 'error'

export interface EditorBuffer {
  path: string
  name: string
  content: string
  version: string | undefined
  size: number | undefined
  status: EditorStatus
  message: string | undefined
}

export interface EditorState {
  visible: boolean
  activePath: string | undefined
  buffers: Record<string, EditorBuffer>
  order: string[]
}

let state: EditorState = { visible: false, activePath: undefined, buffers: {}, order: [] }
const listeners = new Set<() => void>()
const emit = (): void => { for (const listener of listeners) listener() }

/** Editable text cap; larger files stay in the read-only viewer. */
export const EDIT_MAX_BYTES = 512 * 1024

type FsStat = { kind: 'present'; version?: string; type?: string; size?: number } | { kind: 'absent' }
type FsRead = { ok: true; version: string; content: string; size?: number } | { ok: false; code: string; message?: string }
type FsWrite = { ok: true; version: string; operation: string } | { ok: false; code: string; message?: string }

const basename = (path: string): string => path.split('/').pop() ?? path

const sessionFor = (): string | undefined => getInspectorState().activeSessionId

/** Open one workspace file into an editor buffer; false when not editable. */
export async function openFile(path: string): Promise<boolean> {
  const sessionId = sessionFor()
  if (sessionId === undefined) return false
  const stat = await terminalRequest<FsStat>('desktop.fs.stat', { sessionId, path })
  if (stat.kind !== 'present' || stat.type !== 'file') return false
  if (stat.size !== undefined && stat.size > EDIT_MAX_BYTES) return false
  const read = await terminalRequest<FsRead>('desktop.fs.read', { sessionId, path })
  if (!read.ok) return false
  const buffer: EditorBuffer = { path, name: basename(path), content: read.content, version: read.version, size: read.size, status: 'clean', message: undefined }
  state = {
    ...state,
    visible: true,
    activePath: path,
    buffers: { ...state.buffers, [path]: buffer },
    order: state.buffers[path] !== undefined ? state.order : [...state.order, path],
  }
  emit()
  return true
}

/** Mark one open buffer dirty after a local edit. */
export function setBufferContent(path: string, content: string): void {
  const buffer = state.buffers[path]
  if (buffer === undefined || buffer.status === 'readonly') return
  const next: EditorBuffer = { ...buffer, content, status: 'dirty', message: undefined }
  state = { ...state, buffers: { ...state.buffers, [path]: next } }
  emit()
}

/** Save one buffer through ctx.fs with its observed FsVersion. */
export async function saveBuffer(path: string): Promise<void> {
  const buffer = state.buffers[path]
  const sessionId = sessionFor()
  if (buffer === undefined || sessionId === undefined || buffer.status === 'readonly') return
  const mark = (next: Partial<EditorBuffer>): void => {
    state = { ...state, buffers: { ...state.buffers, [path]: { ...buffer, ...next } } }
    emit()
  }
  mark({ status: 'saving' })
  try {
    const result = await terminalRequest<FsWrite>('desktop.fs.write', {
      sessionId,
      path,
      content: buffer.content,
      ...(buffer.version !== undefined ? { expectedVersion: buffer.version } : {}),
    })
    if (!result.ok) {
      if (result.code === 'FS_STALE_VERSION') mark({ status: 'conflict', message: result.message ?? result.code })
      else mark({ status: 'error', message: result.message ?? result.code })
      return
    }
    mark({ status: 'saved', version: result.version })
    const saved: EditorBuffer = { ...buffer, status: 'clean', version: result.version }
    state = { ...state, buffers: { ...state.buffers, [path]: saved } }
    emit()
  } catch (error) {
    mark({ status: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}

/** Reload the on-disk content after a conflict, discarding the local draft. */
export async function reloadBuffer(path: string): Promise<void> {
  const sessionId = sessionFor()
  if (sessionId === undefined) return
  const read = await terminalRequest<FsRead>('desktop.fs.read', { sessionId, path })
  if (!read.ok) return
  const current = state.buffers[path]
  if (current === undefined) return
  const reloaded: EditorBuffer = { ...current, content: read.content, version: read.version, status: 'clean', message: undefined }
  state = { ...state, buffers: { ...state.buffers, [path]: reloaded } }
  emit()
}

/** Close one clean buffer (or a dirty one after the caller resolved the dialog). */
export function closeBuffer(path: string): void {
  const next = Object.fromEntries(Object.entries(state.buffers).filter(([key]) => key !== path))
  const order = state.order.filter(entry => entry !== path)
  state = {
    ...state,
    buffers: next,
    order,
    ...(state.activePath === path
      ? order.length > 0 ? { activePath: order[order.length - 1] } : {}
      : {}),
  }
  emit()
}

export function setActiveBuffer(path: string | undefined): void {
  state = { ...state, activePath: path }
  emit()
}

export function setEditorVisible(visible: boolean): void {
  state = { ...state, visible }
  emit()
}

export function useEditorState(): EditorState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => state,
  )
}

/** Synchronous accessor for tests and non-component modules. */
export function getEditorState(): EditorState {
  return state
}

/** Test-only reset between specs. */
export function resetEditorStore(): void {
  state = { visible: false, activePath: undefined, buffers: {}, order: [] }
  emit()
}
