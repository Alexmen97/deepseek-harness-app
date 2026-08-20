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
  changes?: Array<'stage' | 'discard'>
}

/**
 * Whether one tracked worktree change is discardable. Mirrors the host
 * eligibility (git restore --worktree): Y = M or D with X in {., M, A};
 * staged-only (Y = .), staged deletions (X = D), rename/copy entries,
 * untracked, and conflicted rows are never discardable.
 */
export function isDiscardEligible(entry: GitChangeEntry): boolean {
  if (entry.conflicted || !entry.insideWorkspace || entry.status === '??') return false
  const x = entry.status.charAt(0)
  const y = entry.status.charAt(1)
  if (x === 'R' || x === 'C' || x === 'D' || y === '.') return false
  return y === 'M' || y === 'D'
}

/**
 * Whether the row has a staged side (index differs from HEAD), used to pick
 * the precise confirmation copy: discard restores the worktree to the index.
 */
export function hasStagedSide(entry: GitChangeEntry): boolean {
  if (entry.status === '??' || entry.conflicted) return false
  const x = entry.status.charAt(0)
  return x !== '.'
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

/** Ordered unique paths for diff navigation when a file appears in both sections. */
export function diffNavigationPaths(model: GitStatusModel | undefined): string[] {
  if (model === undefined) return []
  return [...new Set([...model.staged, ...model.unstaged].filter(entry => !entry.conflicted).map(entry => entry.path))]
}

/**
 * The actions a row offers, derived only from the porcelain state: never
 * from the visual section that happens to render the row. Conflicted rows
 * and rows outside the workspace offer no mutation in M5C.2.
 */
export function actionsFor(entry: GitChangeEntry): GitRowActions {
  if (entry.conflicted || !entry.insideWorkspace) return {}
  if (entry.status === '??') return { changes: ['stage'] }
  const changes: Array<'stage' | 'discard'> = []
  if (isUnstaged(entry)) changes.push('stage')
  if (isDiscardEligible(entry)) changes.push('discard')
  return {
    ...(isStaged(entry) ? { staged: 'unstage' as const } : {}),
    ...(changes.length > 0 ? { changes } : {}),
  }
}

/**
 * Why a Discard action must be blocked. Only the frontend knows CodeMirror
 * state; this is a UI data-loss guard, not a filesystem security boundary
 * (the host still validates git/path state independently).
 */
export function discardBlockedReason(entry: GitChangeEntry, dirtyWorkspacePaths: ReadonlySet<string>): 'dirty' | undefined {
  if (!isDiscardEligible(entry)) return undefined
  return entry.workspacePath !== undefined && dirtyWorkspacePaths.has(entry.workspacePath) ? 'dirty' : undefined
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
