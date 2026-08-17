import { describe, expect, it } from 'vitest'
import { DESKTOP_PROTOCOL_VERSION, DESKTOP_SERVER_NAME } from '../src/index.ts'

describe('desktop protocol constants', () => {
  it('pins the protocol version to a positive integer', () => {
    expect(DESKTOP_PROTOCOL_VERSION).toBe(1)
    expect(Number.isInteger(DESKTOP_PROTOCOL_VERSION)).toBe(true)
    expect(DESKTOP_PROTOCOL_VERSION).toBeGreaterThan(0)
  })

  it('keeps the wire-stable server identity', () => {
    expect(DESKTOP_SERVER_NAME).toBe('deepseek-harness-desktop-runtime')
  })
})
