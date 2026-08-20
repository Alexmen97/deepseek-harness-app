import { describe, expect, it } from 'vitest'
import type { DesktopGitStatusV2 } from '@deepseek-ai/dsh-desktop-client'
import { actionsFor, diffNavigationPaths, discardBlockedReason, hasStagedSide, isDiscardEligible, sortChanges, splitGitStatus, stageDirtyWarning, toWorkspacePath } from '../src/inspector/git-model.ts'

const STATUS: DesktopGitStatusV2 = {
  repository: true,
  branch: 'main',
  dirty: true,
  changedFiles: 7,
  workspacePrefix: '',
  files: [
    { path: 'tracked.txt', status: 'MM', conflicted: false },
    { path: 'added.txt', status: 'A.', conflicted: false },
    { path: 'renamed name.txt', status: 'R.', originalPath: 'old name.txt', conflicted: false },
    { path: 'worktree-only.txt', status: '.M', conflicted: false },
    { path: 'deleted.txt', status: '.D', conflicted: false },
    { path: 'untracked.txt', status: '??', conflicted: false },
    { path: 'conflict.txt', status: 'UU', conflicted: true },
  ],
}

describe('M5C git status model', () => {
  it('splits staged, unstaged, untracked, and conflicted rows', () => {
    const model = splitGitStatus(STATUS)
    expect(model).toBeDefined()
    expect(model?.staged.map(entry => entry.path)).toEqual(['tracked.txt', 'added.txt', 'renamed name.txt'])
    expect(model?.unstaged.map(entry => entry.path)).toEqual(['tracked.txt', 'worktree-only.txt', 'deleted.txt', 'untracked.txt'])
    expect(model?.untracked).toEqual(['untracked.txt'])
    expect(model?.conflicted.map(entry => entry.path)).toEqual(['conflict.txt'])
  })

  it('carries the rename original path and the conflict flag', () => {
    const model = splitGitStatus(STATUS)
    const rename = model?.staged.find(entry => entry.path === 'renamed name.txt')
    expect(rename?.originalPath).toBe('old name.txt')
    expect(model?.conflicted[0]?.conflicted).toBe(true)
  })

  it('keeps conflicted entries out of the staged and unstaged sets', () => {
    const model = splitGitStatus(STATUS)
    expect(model?.staged.some(entry => entry.path === 'conflict.txt')).toBe(false)
    expect(model?.unstaged.some(entry => entry.path === 'conflict.txt')).toBe(false)
  })

  it('navigates each changed file once when it has both Git sides', () => {
    expect(diffNavigationPaths(splitGitStatus(STATUS))).toEqual([
      'tracked.txt', 'added.txt', 'renamed name.txt', 'worktree-only.txt', 'deleted.txt', 'untracked.txt',
    ])
  })

  it('returns undefined for missing or non-repository status', () => {
    expect(splitGitStatus(undefined)).toBeUndefined()
    expect(splitGitStatus({ repository: false, reason: 'no-repository' })).toBeUndefined()
  })

  it('returns empty sections for a clean repository', () => {
    const model = splitGitStatus({ repository: true, branch: 'main', dirty: false, changedFiles: 0, files: [] })
    expect(model).toBeDefined()
    expect(model?.staged).toEqual([])
    expect(model?.unstaged).toEqual([])
    expect(model?.untracked).toEqual([])
    expect(model?.conflicted).toEqual([])
  })

  it('sorts rows by path without mutating the input', () => {
    const sorted = sortChanges([
      { path: 'zeta.txt', status: 'M ', conflicted: false, insideWorkspace: true },
      { path: 'alpha.txt', status: 'M ', conflicted: false, insideWorkspace: true },
    ])
    expect(sorted.map(entry => entry.path)).toEqual(['alpha.txt', 'zeta.txt'])
  })

  it('maps repository-relative paths to workspace-visible paths', () => {
    expect(toWorkspacePath('src/app.ts', '')).toBe('src/app.ts')
    expect(toWorkspacePath('packages/frontend/src/app.ts', 'packages/frontend')).toBe('src/app.ts')
    expect(toWorkspacePath('packages/frontend', 'packages/frontend')).toBe('.')
    expect(toWorkspacePath('README.md', 'packages/frontend')).toBeUndefined()
  })

  it('flags rows outside the workspace and strips the prefix', () => {
    const model = splitGitStatus({
      repository: true,
      branch: 'main',
      dirty: true,
      changedFiles: 2,
      workspacePrefix: 'packages/frontend',
      files: [
        { path: 'packages/frontend/app.ts', status: '.M', conflicted: false },
        { path: 'README.md', status: '.M', conflicted: false },
      ],
    })
    const inside = model?.unstaged.find(entry => entry.path === 'packages/frontend/app.ts')
    const outside = model?.unstaged.find(entry => entry.path === 'README.md')
    expect(inside?.insideWorkspace).toBe(true)
    expect(inside?.workspacePath).toBe('app.ts')
    expect(outside?.insideWorkspace).toBe(false)
    expect(outside?.workspacePath).toBeUndefined()
  })

  it('derives actions from the porcelain state, not the section', () => {
    const model = splitGitStatus(STATUS)
    const byPath = Object.fromEntries((model?.staged ?? []).map(e => [e.path, e]))
    Object.assign(byPath, Object.fromEntries((model?.unstaged ?? []).map(e => [e.path, e])))
    expect(actionsFor(byPath['tracked.txt'] as never)).toEqual({ staged: 'unstage', changes: ['stage', 'discard'] })
    expect(actionsFor(byPath['added.txt'] as never)).toEqual({ staged: 'unstage' })
    expect(actionsFor(byPath['worktree-only.txt'] as never)).toEqual({ changes: ['stage', 'discard'] })
    expect(actionsFor(byPath['untracked.txt'] as never)).toEqual({ changes: ['stage'] })
    expect(actionsFor({ path: 'conflict.txt', status: 'UU', conflicted: true, insideWorkspace: true })).toEqual({})
  })

  it('derives no actions for rows outside the workspace', () => {
    const outside = { path: 'README.md', status: '.M', conflicted: false, insideWorkspace: false }
    expect(actionsFor(outside)).toEqual({})
  })

  it('marks discard eligibility from the porcelain state only', () => {
    const mk = (status: string, extra: Record<string, unknown> = {}): never => ({ path: 'p.txt', status, conflicted: false, insideWorkspace: true, ...extra }) as never
    expect(isDiscardEligible(mk('.M'))).toBe(true)
    expect(isDiscardEligible(mk('.D'))).toBe(true)
    expect(isDiscardEligible(mk('MM'))).toBe(true)
    expect(isDiscardEligible(mk('MD'))).toBe(true)
    expect(isDiscardEligible(mk('M.'))).toBe(false)
    expect(isDiscardEligible(mk('D.'))).toBe(false)
    expect(isDiscardEligible(mk('??'))).toBe(false)
    expect(isDiscardEligible(mk('R.', { originalPath: 'old' }))).toBe(false)
    expect(isDiscardEligible(mk('UU', { conflicted: true }))).toBe(false)
    expect(isDiscardEligible(mk('.M', { insideWorkspace: false }))).toBe(false)
  })

  it('reports the staged side for precise confirmation copy', () => {
    const mk = (status: string): never => ({ path: 'p.txt', status, conflicted: false, insideWorkspace: true }) as never
    expect(hasStagedSide(mk('.M'))).toBe(false)
    expect(hasStagedSide(mk('.D'))).toBe(false)
    expect(hasStagedSide(mk('MM'))).toBe(true)
    expect(hasStagedSide(mk('MD'))).toBe(true)
    expect(hasStagedSide(mk('M.'))).toBe(true)
    expect(hasStagedSide(mk('??'))).toBe(false)
  })

  it('blocks discard only for dirty buffers inside the workspace', () => {
    const inside = { path: 'packages/frontend/app.ts', status: '.M', conflicted: false, insideWorkspace: true, workspacePath: 'app.ts' }
    const outside = { path: 'README.md', status: '.M', conflicted: false, insideWorkspace: false }
    expect(discardBlockedReason(inside, new Set(['app.ts']))).toBe('dirty')
    expect(discardBlockedReason(inside, new Set(['other.ts']))).toBeUndefined()
    expect(discardBlockedReason(outside, new Set([]))).toBeUndefined()
  })

  it('warns only when the row matches a dirty editor buffer inside the workspace', () => {
    const inside = { path: 'packages/frontend/app.ts', status: '.M', conflicted: false, insideWorkspace: true, workspacePath: 'app.ts' }
    const outside = { path: 'README.md', status: '.M', conflicted: false, insideWorkspace: false }
    expect(stageDirtyWarning(inside, new Set(['app.ts']))).toBe(true)
    expect(stageDirtyWarning(inside, new Set(['other.ts']))).toBe(false)
    expect(stageDirtyWarning(outside, new Set([]))).toBe(false)
  })
})
