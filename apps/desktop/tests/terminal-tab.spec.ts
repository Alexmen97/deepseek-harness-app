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

  it('forwards the xterm Ctrl+C input through the terminal signal RPC', () => {
    expect(SRC).toContain("data === '\\x03'")
    expect(SRC).toContain("signal: 'SIGINT'")
    expect(SRC).not.toContain("term.write('^C')")
  })

  it('erases buffered input locally for either terminal Backspace code', () => {
    expect(SRC).toContain("data === '\\x7f' || data === '\\b'")
    expect(SRC).toContain("term.write('\\b \\b')")
  })

  it('releases an explicitly closed PTY before an inspector remount', () => {
    expect(SRC).toContain('ownedTerminalRef.current = undefined')
    expect(SRC).toContain('spawnedRef.current = undefined')
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
