import { describe, expect, it, vi } from 'vitest'
import { createFilesyncScheduler, FILESYNC_DEBOUNCE_MS } from '../src/inspector/filesync-core.ts'

describe('M5B filesync scheduler', () => {
  it('coalesces a burst into one delivery after the quiet window', () => {
    vi.useFakeTimers()
    const delivered: Array<string[] | undefined> = []
    const scheduler = createFilesyncScheduler((paths) => { delivered.push(paths) })
    scheduler.push(1, ['a.txt'], false)
    scheduler.push(1, ['b.txt'], false)
    scheduler.push(1, ['a.txt'], false)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS)
    expect(delivered).toEqual([['a.txt', 'b.txt']])
    vi.useRealTimers()
  })

  it('drops pushes from a stale generation', () => {
    vi.useFakeTimers()
    const delivered: Array<string[] | undefined> = []
    const scheduler = createFilesyncScheduler((paths) => { delivered.push(paths) })
    scheduler.push(1, ['a.txt'], false)
    scheduler.push(2, ['b.txt'], false)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS)
    expect(delivered).toEqual([['a.txt']])
    vi.useRealTimers()
  })

  it('reset drops pending deliveries and adopts the new generation', () => {
    vi.useFakeTimers()
    const delivered: Array<string[] | undefined> = []
    const scheduler = createFilesyncScheduler((paths) => { delivered.push(paths) })
    scheduler.push(1, ['a.txt'], false)
    scheduler.reset(2)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS * 2)
    expect(delivered).toEqual([])
    scheduler.push(2, ['b.txt'], false)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS)
    expect(delivered).toEqual([['b.txt']])
    vi.useRealTimers()
  })

  it('a flood-cap batch (full) invalidates everything', () => {
    vi.useFakeTimers()
    const delivered: Array<string[] | undefined> = []
    const scheduler = createFilesyncScheduler((paths) => { delivered.push(paths) })
    scheduler.push(1, ['a.txt'], false)
    scheduler.push(1, [], true)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS)
    expect(delivered).toEqual([undefined])
    vi.useRealTimers()
  })

  it('later quiet batches still deliver after a full batch', () => {
    vi.useFakeTimers()
    const delivered: Array<string[] | undefined> = []
    const scheduler = createFilesyncScheduler((paths) => { delivered.push(paths) })
    scheduler.push(1, [], true)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS)
    scheduler.push(1, ['c.txt'], false)
    vi.advanceTimersByTime(FILESYNC_DEBOUNCE_MS)
    expect(delivered).toEqual([undefined, ['c.txt']])
    vi.useRealTimers()
  })
})
