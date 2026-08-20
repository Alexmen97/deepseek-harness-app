import { describe, expect, it } from 'vitest'
import { consumeLocalTerminalEcho } from '../src/inspector/terminal-core.ts'

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
