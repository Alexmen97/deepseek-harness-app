/**
 * M5C.2 Changes operations core: per-file stage/unstage state, server-
 * confirmed refresh, and error surfacing. Pure with an injected host so
 * tests need no Tauri bindings; the Changes tab wires the real host.
 */

import type { DesktopGitDiff, DesktopGitError, DesktopGitFileDiff, DesktopGitStatusV2 } from '@deepseek-ai/dsh-desktop-client'
import type { DesktopGitHunkRequest, DesktopGitHunkResult } from '@deepseek-ai/dsh-desktop-client'

/** The two diff modes; cached selects the staged side. */
export type DiffMode = 'unstaged' | 'staged'

/** The narrow host surface this core drives. */
export interface ChangesHost {
  gitStatusV2(): Promise<DesktopGitStatusV2>
  gitDiff(): Promise<DesktopGitDiff>
  gitStageFile(path: string): Promise<void>
  gitUnstageFile(path: string): Promise<void>
  gitDiscardFile(path: string): Promise<void>
  gitDiffFile(path: string, cached: boolean): Promise<DesktopGitFileDiff>
  gitStageHunk(request: DesktopGitHunkRequest): Promise<DesktopGitHunkResult>
  gitUnstageHunk(request: DesktopGitHunkRequest): Promise<DesktopGitHunkResult>
  gitDiscardHunk(request: DesktopGitHunkRequest): Promise<DesktopGitHunkResult>
}

/** Options for the operations core; the discard guard is a UI data-loss guard only. */
export interface ChangesCoreOptions {
  /** Whether the editor holds unsaved changes for a workspace path; blocks discard. */
  isDirty?(path: string): boolean
}

/** Per-file operation state; a path is either idle, in flight, or failed. */
export type ChangeOpState = 'idle' | 'staging' | 'unstaging' | 'discarding'

export interface ChangesOpsState {
  /** Path (repository-relative, matching the v2 model) -> in-flight operation. */
  pending: Record<string, ChangeOpState>
  /** Path -> the last failed operation's typed error. */
  errors: Record<string, DesktopGitError | undefined>
  /** Composite key path + "::" + hunkId -> in-flight hunk operation (M5D). */
  pendingHunks: Record<string, ChangeOpState>
  /** Composite key path + "::" + hunkId -> the last failed hunk operation's error. */
  errorsHunks: Record<string, DesktopGitError | undefined>
}

/** The diff viewer selection and per-mode diff cache (session-only). */
export interface ChangesViewState {
  /** Selected repository-relative path; undefined shows the empty state. */
  selectedPath: string | undefined
  /** Active diff mode; defaults from the clicked section. */
  mode: DiffMode
  /** Path -> mode -> cached per-file diff result. */
  diffs: Record<string, Partial<Record<DiffMode, DesktopGitFileDiff>>>
  /** Path -> mode currently loading (dedupe concurrent requests). */
  loading: Record<string, boolean>
}

const EMPTY_VIEW: ChangesViewState = { selectedPath: undefined, mode: 'unstaged', diffs: {}, loading: {} }

export interface ChangesCore {
  getStatus: () => DesktopGitStatusV2 | undefined
  getDiff: () => DesktopGitDiff | undefined
  getOps: () => ChangesOpsState
  /** Refresh the porcelain-v2 model and the diff after a host operation. */
  refresh: () => Promise<void>
  /** Stage one repository-relative path; no-op while that path is pending. */
  stage: (path: string) => Promise<void>
  /** Unstage one repository-relative path; no-op while that path is pending. */
  unstage: (path: string) => Promise<void>
  /** Discard one tracked worktree change; blocked locally while the editor is dirty. */
  discard: (path: string) => Promise<void>
  /** Stage one textual hunk of the unstaged diff (M5D). */
  stageHunk: (path: string, hunkId: string, diffToken: string) => Promise<void>
  /** Unstage one textual hunk of the staged diff (M5D). */
  unstageHunk: (path: string, hunkId: string, diffToken: string) => Promise<void>
  /** Discard one textual hunk of the unstaged diff; blocked while the editor is dirty (M5D). */
  discardHunk: (path: string, hunkId: string, diffToken: string) => Promise<void>
  /** Select a file; the diff mode defaults from the clicked section (session-only). */
  select: (path: string | undefined, from: 'staged' | 'changes') => void
  /** Switch the active diff mode of the selected file. */
  setMode: (mode: DiffMode) => void
  /** The diff viewer selection and per-mode cache. */
  getView: () => ChangesViewState
  subscribe: (listener: () => void) => () => void
}

const EMPTY_OPS: ChangesOpsState = { pending: {}, errors: {}, pendingHunks: {}, errorsHunks: {} }

/** Create the Changes operations core over an injected host. */
export function createChangesCore(host: ChangesHost, options: ChangesCoreOptions = {}): ChangesCore {
  let status: DesktopGitStatusV2 | undefined
  let diff: DesktopGitDiff | undefined
  let ops: ChangesOpsState = { pending: {}, errors: {}, pendingHunks: {}, errorsHunks: {} }
  let view: ChangesViewState = EMPTY_VIEW
  let diffGeneration = 0
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const listener of listeners) listener() }

  const loadDiff = async (path: string, mode: DiffMode, generation = diffGeneration): Promise<void> => {
    const cached = view.diffs[path]?.[mode]
    if (cached !== undefined) return
    const loadingKey = path + ':' + mode
    if (view.loading[loadingKey] === true) return
    view = { ...view, loading: { ...view.loading, [loadingKey]: true } }
    emit()
    try {
      const result = await host.gitDiffFile(path, mode === 'staged')
      if (generation !== diffGeneration) return
      view = {
        ...view,
        loading: { ...view.loading, [loadingKey]: false },
        diffs: { ...view.diffs, [path]: { ...view.diffs[path], [mode]: result } },
      }
    } catch {
      if (generation !== diffGeneration) return
      view = { ...view, loading: { ...view.loading, [loadingKey]: false } }
    }
    emit()
  }

  const setPending = (path: string, state: ChangeOpState | 'idle'): void => {
    if (state === 'idle') {
      const pending = Object.fromEntries(Object.entries(ops.pending).filter(([key]) => key !== path))
      ops = { ...ops, pending }
      return
    }
    ops = { ...ops, pending: { ...ops.pending, [path]: state } }
  }

  const setError = (path: string, error: DesktopGitError | undefined): void => {
    const errors = error === undefined
      ? Object.fromEntries(Object.entries(ops.errors).filter(([key]) => key !== path))
      : { ...ops.errors, [path]: error }
    ops = { ...ops, errors }
  }

  const hunkKey = (path: string, hunkId: string): string => path + '::' + hunkId

  const setHunkPending = (path: string, hunkId: string, state: ChangeOpState | 'idle'): void => {
    const key = hunkKey(path, hunkId)
    if (state === 'idle') {
      const pendingHunks = Object.fromEntries(Object.entries(ops.pendingHunks).filter(([k]) => k !== key))
      ops = { ...ops, pendingHunks }
      return
    }
    ops = { ...ops, pendingHunks: { ...ops.pendingHunks, [key]: state } }
  }

  const setHunkError = (path: string, hunkId: string, error: DesktopGitError | undefined): void => {
    const key = hunkKey(path, hunkId)
    const errorsHunks = error === undefined
      ? Object.fromEntries(Object.entries(ops.errorsHunks).filter(([k]) => k !== key))
      : { ...ops.errorsHunks, [key]: error }
    ops = { ...ops, errorsHunks }
  }

  /** Whether the path still exists in the model with the given mode available. */
  const modeAvailable = (path: string, mode: DiffMode, current: DesktopGitStatusV2 | undefined): boolean => {
    const files = current?.files ?? []
    const entry = files.find(file => file.path === path)
    if (entry === undefined || entry.conflicted === true) return false
    if (entry.status === '??') return mode === 'unstaged' && files.some(f => f.path === path)
    const x = entry.status.charAt(0)
    const y = entry.status.charAt(1)
    return mode === 'staged' ? x !== '.' : y !== '.'
  }

  const refresh = async (): Promise<void> => {
    const [nextStatus, nextDiff] = await Promise.all([
      host.gitStatusV2().catch(() => undefined),
      host.gitDiff().catch(() => undefined),
    ])
    status = nextStatus
    diff = nextDiff
    diffGeneration += 1
    view = { ...view, diffs: {}, loading: {} }
    // Selection continuity: keep the same logical file when it still exists
    // in another section; fall back to the empty state otherwise.
    const selected = view.selectedPath
    if (selected !== undefined) {
      const exists = (nextStatus?.files ?? []).some(file => file.path === selected)
      if (!exists) {
        view = { ...view, selectedPath: undefined }
      } else if (!modeAvailable(selected, view.mode, nextStatus)) {
        const other: DiffMode = view.mode === 'staged' ? 'unstaged' : 'staged'
        if (modeAvailable(selected, other, nextStatus)) {
          view = { ...view, mode: other }
        }
      }
      if (view.selectedPath !== undefined) {
        void loadDiff(view.selectedPath, view.mode)
      }
    }
    emit()
  }

  const run = async (path: string, state: ChangeOpState, runHost: () => Promise<void>): Promise<void> => {
    if (ops.pending[path] !== undefined) return
    setPending(path, state)
    emit()
    try {
      await runHost()
      setError(path, undefined)
      await refresh()
    } catch (error) {
      setError(path, error as DesktopGitError)
      // Server state did not change: keep the current UI and model.
      emit()
    } finally {
      setPending(path, 'idle')
      emit()
    }
  }

  const runHunk = async (path: string, hunkId: string, state: ChangeOpState, runHost: () => Promise<unknown>): Promise<void> => {
    const key = hunkKey(path, hunkId)
    if (ops.pendingHunks[key] !== undefined) return
    setHunkPending(path, hunkId, state)
    emit()
    try {
      await runHost()
      setHunkError(path, hunkId, undefined)
      await refresh()
    } catch (error) {
      setHunkError(path, hunkId, error as DesktopGitError)
      // Server state did not change: keep the current UI and model.
      emit()
    } finally {
      setHunkPending(path, hunkId, 'idle')
      emit()
    }
  }

  return {
    getStatus: () => status,
    getDiff: () => diff,
    getOps: () => ops,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    refresh,
    stage: path => run(path, 'staging', () => host.gitStageFile(path)),
    unstage: path => run(path, 'unstaging', () => host.gitUnstageFile(path)),
    discard: path => run(path, 'discarding', () => {
      if (options.isDirty?.(path) === true) {
        // UI data-loss guard: never invoke the host for a dirty editor buffer.
        const error = new Error('This file has unsaved editor changes. Save or discard the editor draft before discarding changes from disk.') as DesktopGitError & Error
        error.code = 'DIRTY_EDITOR_BLOCK'
        throw error
      }
      return host.gitDiscardFile(path)
    }),
    stageHunk: (path, hunkId, diffToken) => runHunk(path, hunkId, 'staging', () => host.gitStageHunk({ path, cached: false, hunkId, diffToken })),
    unstageHunk: (path, hunkId, diffToken) => runHunk(path, hunkId, 'unstaging', () => host.gitUnstageHunk({ path, cached: true, hunkId, diffToken })),
    discardHunk: (path, hunkId, diffToken) => runHunk(path, hunkId, 'discarding', () => {
      if (options.isDirty?.(path) === true) {
        // UI data-loss guard: never invoke the host for a dirty editor buffer.
        const error = new Error('This file has unsaved editor changes. Save or discard the editor draft before discarding changes from disk.') as DesktopGitError & Error
        error.code = 'DIRTY_EDITOR_BLOCK'
        throw error
      }
      return host.gitDiscardHunk({ path, cached: false, hunkId, diffToken })
    }),
    select: (path, from) => {
      const mode: DiffMode = from === 'staged' ? 'staged' : 'unstaged'
      view = { ...view, selectedPath: path, mode }
      emit()
      if (path !== undefined) void loadDiff(path, mode)
    },
    setMode: (mode) => {
      const path = view.selectedPath
      if (path === undefined || view.mode === mode) return
      view = { ...view, mode }
      emit()
      void loadDiff(path, mode)
    },
    getView: () => view,
  }
}

/** Empty-state export for tests and initial UI. */
export const EMPTY_CHANGES_OPS = EMPTY_OPS
