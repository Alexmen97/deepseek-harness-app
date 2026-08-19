/**
 * M5C.2 Changes operations core: per-file stage/unstage state, server-
 * confirmed refresh, and error surfacing. Pure with an injected host so
 * tests need no Tauri bindings; the Changes tab wires the real host.
 */

import type { DesktopGitDiff, DesktopGitError, DesktopGitStatusV2 } from '@deepseek-ai/dsh-desktop-client'

/** The narrow host surface this core drives. */
export interface ChangesHost {
  gitStatusV2(): Promise<DesktopGitStatusV2>
  gitDiff(): Promise<DesktopGitDiff>
  gitStageFile(path: string): Promise<void>
  gitUnstageFile(path: string): Promise<void>
}

/** Per-file operation state; a path is either idle, in flight, or failed. */
export type ChangeOpState = 'idle' | 'staging' | 'unstaging'

export interface ChangesOpsState {
  /** Path (repository-relative, matching the v2 model) -> in-flight operation. */
  pending: Record<string, ChangeOpState>
  /** Path -> the last failed operation's typed error. */
  errors: Record<string, DesktopGitError | undefined>
}

export interface ChangesCore {
  /** Refresh the porcelain-v2 model and the diff after a host operation. */
  /** Stage one repository-relative path; no-op while that path is pending. */
  /** Unstage one repository-relative path; no-op while that path is pending. */
  getStatus: () => DesktopGitStatusV2 | undefined
  getDiff: () => DesktopGitDiff | undefined
  getOps: () => ChangesOpsState
  /** Refresh the porcelain-v2 model and the diff after a host operation. */
  refresh: () => Promise<void>
  /** Stage one repository-relative path; no-op while that path is pending. */
  stage: (path: string) => Promise<void>
  /** Unstage one repository-relative path; no-op while that path is pending. */
  unstage: (path: string) => Promise<void>
  subscribe: (listener: () => void) => () => void
}

const EMPTY_OPS: ChangesOpsState = { pending: {}, errors: {} }

/** Create the Changes operations core over an injected host. */
export function createChangesCore(host: ChangesHost): ChangesCore {
  let status: DesktopGitStatusV2 | undefined
  let diff: DesktopGitDiff | undefined
  let ops: ChangesOpsState = { pending: {}, errors: {} }
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const listener of listeners) listener() }

  const setPending = (path: string, state: ChangeOpState | 'idle'): void => {
    if (state === 'idle') {
      const pending = Object.fromEntries(Object.entries(ops.pending).filter(([key]) => key !== path))
      ops = { pending, errors: ops.errors }
      return
    }
    ops = { pending: { ...ops.pending, [path]: state }, errors: ops.errors }
  }

  const setError = (path: string, error: DesktopGitError | undefined): void => {
    const errors = error === undefined
      ? Object.fromEntries(Object.entries(ops.errors).filter(([key]) => key !== path))
      : { ...ops.errors, [path]: error }
    ops = { pending: ops.pending, errors }
  }

  const refresh = async (): Promise<void> => {
    const [nextStatus, nextDiff] = await Promise.all([
      host.gitStatusV2().catch(() => undefined),
      host.gitDiff().catch(() => undefined),
    ])
    status = nextStatus
    diff = nextDiff
    emit()
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
    stage: async (path) => {
      if (ops.pending[path] !== undefined) return
      setPending(path, 'staging')
      emit()
      try {
        await host.gitStageFile(path)
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
    },
    unstage: async (path) => {
      if (ops.pending[path] !== undefined) return
      setPending(path, 'unstaging')
      emit()
      try {
        await host.gitUnstageFile(path)
        setError(path, undefined)
        await refresh()
      } catch (error) {
        setError(path, error as DesktopGitError)
        emit()
      } finally {
        setPending(path, 'idle')
        emit()
      }
    },
  }
}

/** Empty-state export for tests and initial UI. */
export const EMPTY_CHANGES_OPS = EMPTY_OPS
