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

  it('sends the line typed in xterm when Enter submits it', () => {
    expect(SRC).toContain('const text = inputBufferRef.current')
    expect(SRC).toContain("pendingLocalEchoRef.current = text + '\\n'")
    expect(SRC).toContain('text, submit: true')
    expect(SRC).not.toContain("text: '', submit: true")
  })

  it('renders normalized terminal lines and streams the initial prompt once', () => {
    expect(SRC).toContain('convertEol: true')
    expect(SRC).toContain('consumeLocalTerminalEcho(delta, pendingLocalEchoRef.current)')
    expect(SRC).not.toContain('termRef.current?.write(result.motd)')
  })

  it('keeps the xterm instance through inspector-state renders', () => {
    expect(SRC).toContain('}, [appearance])')
    expect(SRC).not.toContain('}, [palette, sessionId, spawned])')
  })

  it('invalidates stale spawn chains so only the latest run spawns', () => {
    expect(SRC).toContain('spawnRunRef.current')
    expect(SRC).toContain('run !== spawnRunRef.current')
  })
})
