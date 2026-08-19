/** M5B editor store: the UI authority for open buffers; ctx.fs stays the data authority. */

import { useSyncExternalStore } from 'react'
import { getInspectorState, terminalRequest } from './store.ts'
import { createEditorCore } from './editor-core.ts'
import type { EditorState } from './editor-core.ts'

export type { EditorBuffer, EditorState, EditorStatus } from './editor-core.ts'

/** Editable text cap; larger files stay in the read-only viewer. */
export const EDIT_MAX_BYTES = 512 * 1024

type FsStat = { kind: 'present'; version?: string; type?: string; size?: number } | { kind: 'absent'; transient?: boolean }
type FsRead = { ok: true; version: string; content: string; size?: number } | { ok: false; code: string; message?: string }
type FsWrite = { ok: true; version: string; operation: string } | { ok: false; code: string; message?: string }

const core = createEditorCore({
  stat: async (path) => {
    const sessionId = getInspectorState().activeSessionId
    if (sessionId === undefined) return { kind: 'absent' as const, transient: true }
    return terminalRequest<FsStat>('desktop.fs.stat', { sessionId, path })
  },
  read: async (path) => {
    const sessionId = getInspectorState().activeSessionId
    if (sessionId === undefined) return { ok: false, code: 'FS_IO_ERROR' }
    return terminalRequest<FsRead>('desktop.fs.read', { sessionId, path })
  },
  write: async (path, content, expectedVersion) => {
    const sessionId = getInspectorState().activeSessionId
    if (sessionId === undefined) return { ok: false, code: 'FS_IO_ERROR' }
    return terminalRequest<FsWrite>('desktop.fs.write', {
      sessionId,
      path,
      content,
      ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    })
  },
}, EDIT_MAX_BYTES)

export const openFile = (path: string): Promise<boolean> => core.openFile(path)
export const setBufferContent = (path: string, content: string): void => { core.setContent(path, content) }
export const saveBuffer = (path: string): Promise<void> => core.save(path)
export const saveAllBuffers = (): Promise<{ ok: boolean; conflicted: string[] }> => core.saveAll()
export const reloadBuffer = (path: string): Promise<void> => core.reload(path)
export const keepBufferChanges = (path: string): void => { core.keepChanges(path) }
export const closeBuffer = (path: string): void => { core.close(path) }
export const setActiveBuffer = (path: string | undefined): void => { core.setActive(path) }
export const setEditorVisible = (visible: boolean): void => { core.setVisible(visible) }
export const reconcileBuffer = (path: string): Promise<void> => core.reconcile(path)
export const reconcileAllBuffers = (): Promise<void> => core.reconcileAll()
export const hasDirtyBuffers = (): boolean => core.hasDirtyBuffers()
export const dirtyBufferPaths = (): string[] => core.dirtyPaths()
export const resetEditorStore = (): void => { core.reset() }

export function useEditorState(): EditorState {
  return useSyncExternalStore(
    listener => core.subscribe(listener),
    () => core.getState(),
  )
}

/** Synchronous accessor for tests and non-component modules. */
export function getEditorState(): EditorState {
  return core.getState()
}

/** Raw subscription for modules that must react to every buffer change (quit guard). */
export function subscribeEditorStore(listener: () => void): () => void {
  return core.subscribe(listener)
}
