/**
 * Pure M5B filesync scheduler: debounced invalidation accumulator with
 * generation isolation. Host-safe (no bindings, no DOM) so tests and the
 * host face can drive it directly; the client install wires it to the
 * native watcher.
 */

export interface FilesyncScheduler {
  /** Current runtime generation; pushes from other generations are dropped. */
  currentGeneration(): number
  /** Merge one watcher batch; schedules a delivery after the quiet window. */
  push(generation: number, paths: string[], full: boolean): void
  /** Adopt a new generation and drop any pending delivery. */
  reset(generation: number): void
  dispose(): void
}

/** Frontend coalescing window: watcher bursts and rpc traffic settle here. */
export const FILESYNC_DEBOUNCE_MS = 150

/**
 * Create the scheduler. The delivery callback receives the merged unique
 * paths, or undefined when a flood-cap batch requires invalidating every
 * cached surface.
 */
export function createFilesyncScheduler(
  deliver: (paths: string[] | undefined) => void,
  delayMs = FILESYNC_DEBOUNCE_MS,
): FilesyncScheduler {
  let generation = -1
  let pending: Set<string> | undefined
  let full = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = (): void => {
    timer = undefined
    const paths = pending
    const wasFull = full
    pending = undefined
    full = false
    deliver(wasFull ? undefined : paths !== undefined ? [...paths] : undefined)
  }

  return {
    currentGeneration: () => generation,
    push(nextGeneration, paths, isFull) {
      if (generation >= 0 && nextGeneration !== generation) return
      generation = nextGeneration
      if (isFull) {
        full = true
        pending = undefined
      } else {
        pending = new Set([...(pending ?? []), ...paths])
      }
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(flush, delayMs)
    },
    reset(nextGeneration) {
      generation = nextGeneration
      pending = undefined
      full = false
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
    dispose() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
      pending = undefined
      full = false
    },
  }
}
