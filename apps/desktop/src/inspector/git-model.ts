/**
 * M5C git status model: the frontend projection of the host porcelain v2
 * status into the Changes panel sections, the per-row mutation actions,
 * and the workspace containment derived state.
 * Pure and host-free so tests need no bindings.
 */

import type { DesktopGitStatusV2, DesktopGitStatusV2Entry } from '@deepseek-ai/dsh-desktop-client'

/** One change row shared by the staged and unstaged sections. */
export interface GitChangeEntry {
  path: string
  originalPath?: string
  status: string
  conflicted: boolean
  /** Workspace-visible relative path; undefined when the repo path lies outside the selected workspace. */
  workspacePath?: string
  /** False when the repository-relative path is outside the selected workspace (no mutation allowed). */
  insideWorkspace: boolean
}

/** The Changes panel projection: three mutually exclusive row sets. */
export interface GitStatusModel {
  /** Index-side changes (X side of XY, excluding untracked). */
  staged: GitChangeEntry[]
  /** Worktree-side changes (Y side) plus untracked files. */
  unstaged: GitChangeEntry[]
  /** Untracked file paths, kept separate for the read-only policy. */
  untracked: string[]
  /** Conflicted entries (porcelain v2 'u'); rendered read-only. */
  conflicted: GitChangeEntry[]
}

/** The mutation actions a row may offer, keyed by the panel section. */
export interface GitRowActions {
  staged?: 'unstage'
  changes?: 'stage'
}

/** Whether the porcelain v2 XY pair reports an index-side (staged) change. */
const isStaged = (entry: DesktopGitStatusV2Entry): boolean =>
  entry.status.charAt(0) !== '.'

/** Whether the porcelain v2 XY pair reports a worktree-side change. */
const isUnstaged = (entry: DesktopGitStatusV2Entry): boolean =>
  entry.status.charAt(1) !== '.'

/**
 * The single conversion layer for git paths: repository-relative (the
 * porcelain v2 model) to workspace-visible. Paths outside the workspace
 * yield undefined so the UI never offers a mutation for them.
 */
export function toWorkspacePath(repoPath: string, workspacePrefix: string | undefined): string | undefined {
  const prefix = workspacePrefix ?? ''
  if (prefix === '') return repoPath
  if (repoPath === prefix) return '.'
  if (repoPath.startsWith(prefix + '/')) return repoPath.slice(prefix.length + 1)
  return undefined
}

const toChange = (entry: DesktopGitStatusV2Entry, prefix: string | undefined): GitChangeEntry => {
  const workspacePath = toWorkspacePath(entry.path, prefix)
  return {
    path: entry.path,
    ...(entry.originalPath !== undefined && entry.originalPath !== '' ? { originalPath: entry.originalPath } : {}),
    status: entry.status,
    conflicted: entry.conflicted === true,
    ...(workspacePath !== undefined ? { workspacePath } : {}),
    insideWorkspace: workspacePath !== undefined,
  }
}

/**
 * Project one host v2 status into the Changes panel sections.
 * Conflicted entries appear only in the conflicted set (read-only rows with
 * a conflict badge); untracked paths are never offered a discard action.
 */
export function splitGitStatus(status: DesktopGitStatusV2 | undefined): GitStatusModel | undefined {
  if (status === undefined || !status.repository || status.files === undefined) return undefined
  const staged: GitChangeEntry[] = []
  const unstaged: GitChangeEntry[] = []
  const untracked: string[] = []
  const conflicted: GitChangeEntry[] = []
  for (const entry of status.files) {
    if (entry.conflicted === true) {
      conflicted.push(toChange(entry, status.workspacePrefix))
      continue
    }
    if (entry.status === '??') {
      untracked.push(entry.path)
      unstaged.push(toChange(entry, status.workspacePrefix))
      continue
    }
    if (isStaged(entry)) staged.push(toChange(entry, status.workspacePrefix))
    if (isUnstaged(entry)) unstaged.push(toChange(entry, status.workspacePrefix))
  }
  return { staged, unstaged, untracked, conflicted }
}

/**
 * The actions a row offers, derived only from the porcelain state: never
 * from the visual section that happens to render the row. Conflicted rows
 * and rows outside the workspace offer no mutation in M5C.2.
 */
export function actionsFor(entry: GitChangeEntry): GitRowActions {
  if (entry.conflicted || !entry.insideWorkspace) return {}
  if (entry.status === '??') return { changes: 'stage' }
  return {
    ...(isStaged(entry) ? { staged: 'unstage' as const } : {}),
    ...(isUnstaged(entry) ? { changes: 'stage' as const } : {}),
  }
}

/**
 * Whether a Stage action must warn that a dirty editor buffer is not on
 * disk. Only rows inside the workspace can match an editor path; clean
 * files never warn.
 */
export function stageDirtyWarning(entry: GitChangeEntry, dirtyWorkspacePaths: ReadonlySet<string>): boolean {
  return entry.workspacePath !== undefined && dirtyWorkspacePaths.has(entry.workspacePath)
}

/** Stable sort used by the panel rows (path order, conflicted last). */
export function sortChanges(entries: GitChangeEntry[]): GitChangeEntry[] {
  return [...entries].sort((a, b) => a.path.localeCompare(b.path))
}
