import { describe, expect, it } from 'vitest'
import type { DesktopGitStatusV2 } from '@deepseek-ai/dsh-desktop-client'
import { sortChanges, splitGitStatus } from '../src/inspector/git-model.ts'

const STATUS: DesktopGitStatusV2 = {
  repository: true,
  branch: 'main',
  dirty: true,
  changedFiles: 6,
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
      { path: 'zeta.txt', status: 'M ', conflicted: false },
      { path: 'alpha.txt', status: 'M ', conflicted: false },
    ])
    expect(sorted.map(entry => entry.path)).toEqual(['alpha.txt', 'zeta.txt'])
  })
})
