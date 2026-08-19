/**
 * M5C git status model: the frontend projection of the host porcelain v2
 * status into the Changes panel sections (Staged Changes / Changes).
 * Pure and host-free so tests need no bindings.
 */

import type { DesktopGitStatusV2, DesktopGitStatusV2Entry } from '@deepseek-ai/dsh-desktop-client'

/** One change row shared by the staged and unstaged sections. */
export interface GitChangeEntry {
  path: string
  originalPath?: string
  status: string
  conflicted: boolean
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

/** Whether the porcelain v2 XY pair reports an index-side (staged) change. */
const isStaged = (entry: DesktopGitStatusV2Entry): boolean =>
  entry.status.charAt(0) !== '.'

/** Whether the porcelain v2 XY pair reports a worktree-side change. */
const isUnstaged = (entry: DesktopGitStatusV2Entry): boolean =>
  entry.status.charAt(1) !== '.'

const toChange = (entry: DesktopGitStatusV2Entry): GitChangeEntry => ({
  path: entry.path,
  ...(entry.originalPath !== undefined && entry.originalPath !== '' ? { originalPath: entry.originalPath } : {}),
  status: entry.status,
  conflicted: entry.conflicted === true,
})

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
      conflicted.push(toChange(entry))
      continue
    }
    if (entry.status === '??') {
      untracked.push(entry.path)
      unstaged.push(toChange(entry))
      continue
    }
    if (isStaged(entry)) staged.push(toChange(entry))
    if (isUnstaged(entry)) unstaged.push(toChange(entry))
  }
  return { staged, unstaged, untracked, conflicted }
}

/** Stable sort used by the panel rows (path order, conflicted last). */
export function sortChanges(entries: GitChangeEntry[]): GitChangeEntry[] {
  return [...entries].sort((a, b) => a.path.localeCompare(b.path))
}
