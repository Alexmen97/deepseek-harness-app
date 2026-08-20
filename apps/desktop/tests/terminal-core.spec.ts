import { describe, expect, it } from 'vitest'
import { consumeLocalTerminalEcho, isActiveTerminalOutput } from '../src/inspector/terminal-core.ts'

describe('isActiveTerminalOutput', () => {
  it('does not render output from a closed PTY after the terminal is reopened', () => {
    expect(isActiveTerminalOutput('pty-1', 'pty-2')).toBe(false)
    expect(isActiveTerminalOutput('pty-2', 'pty-2')).toBe(true)
  })
})

describe('consumeLocalTerminalEcho', () => {
  it('suppresses a complete echoed line while preserving command output', () => {
    expect(consumeLocalTerminalEcho('echo hello\nhello\n', 'echo hello\n')).toEqual({ text: 'hello\n', pendingEcho: '' })
  })

  it('suppresses an echoed line split across stream notifications', () => {
    const first = consumeLocalTerminalEcho('echo ', 'echo hello\n')
    expect(first).toEqual({ text: '', pendingEcho: 'hello\n' })
    expect(consumeLocalTerminalEcho('hello\nready\n', first.pendingEcho)).toEqual({ text: 'ready\n', pendingEcho: '' })
  })

  it('keeps unexpected output and stops matching it as echo', () => {
    expect(consumeLocalTerminalEcho('warning\n', 'echo hello\n')).toEqual({ text: 'warning\n', pendingEcho: '' })
  })
})
