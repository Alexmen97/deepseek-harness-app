import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SRC = readFileSync(new URL('../src/inspector/TerminalTab.tsx', import.meta.url), 'utf8')

describe('M5C.5 terminal PTY-leak guard', () => {
  it('never re-runs the spawn effect on locale/state renders', () => {
    expect(SRC).toContain('}, [sessionId])')
    expect(SRC).not.toContain('}, [sessionId, t])')
  })

  it('keeps the localized spawn-error copy through a stable ref', () => {
    expect(SRC).toContain("tRef.current('terminal.spawnError')")
  })

  it('invalidates stale spawn chains so only the latest run spawns', () => {
    expect(SRC).toContain('spawnRunRef.current')
    expect(SRC).toContain('run !== spawnRunRef.current')
  })
})
