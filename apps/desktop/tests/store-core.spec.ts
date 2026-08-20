import { describe, expect, it } from 'vitest'
import { applyInspectorFrame, EMPTY_INSPECTOR, type InspectorFrame } from '../src/inspector/store-core.ts'

const frame = (generation: number, payload: unknown): InspectorFrame => ({ generation, stream: 'mux', payload })

describe('M4 inspector store projection', () => {
  it('tracks the active session from session/subscribed frames', () => {
    const state = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, { type: 'session/subscribed', sessionId: 's-1', lastSeq: 0 }))
    expect(state.activeSessionId).toBe('s-1')
    expect(state.generation).toBe(3)
  })

  it('keeps the higher-seq plan projection and rejects stale seqs', () => {
    const base = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, { type: 'session/projection', sessionId: 's-1', key: 'plan', value: { active: true }, seq: 5 }))
    const stale = applyInspectorFrame(base, frame(3, { type: 'session/projection', sessionId: 's-1', key: 'plan', value: { active: false }, seq: 4 }))
    const fresh = applyInspectorFrame(stale, frame(3, { type: 'session/projection', sessionId: 's-1', key: 'plan', value: { active: false }, seq: 6 }))
    expect(stale.plans['s-1']?.active).toBe(true)
    expect(fresh.plans['s-1']?.active).toBe(false)
  })

  it('replaces the jobs snapshot on every session/jobs frame, including empty', () => {
    const withJobs = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, { type: 'session/jobs', sessionId: 's-1', jobs: [{ id: 'bash-1', kind: 'bash', label: 'make', status: 'running', startedAt: 0 }] }))
    expect(withJobs.jobs['s-1']).toHaveLength(1)
    const emptied = applyInspectorFrame(withJobs, frame(3, { type: 'session/jobs', sessionId: 's-1', jobs: [] }))
    expect(emptied.jobs['s-1']).toEqual([])
  })

  it('reduces subagent lineage from session/event frames', () => {
    const spawned = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, { type: 'session/event', sessionId: 'main', event: { type: 'subagent/spawn', childId: 'c-1', role: 'explorer' } }))
    expect(spawned.subagents['main']).toEqual([{ childId: 'c-1', role: 'explorer', state: 'running' }])
    const ended = applyInspectorFrame(spawned, frame(3, { type: 'session/event', sessionId: 'main', event: { type: 'subagent/end', childId: 'c-1' } }))
    expect(ended.subagents['main']?.[0]?.state).toBe('completed')
  })

  it('replaces output when a reopened terminal has a new PTY identity', () => {
    const closed = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, { sessionId: 's-1', terminalId: 'pty-1', kind: 'settled', text: 'old command\ndsh> ', status: { kind: 'running' } }))
    const reopened = applyInspectorFrame(closed, frame(3, { sessionId: 's-1', terminalId: 'pty-2', kind: 'delta', text: 'dsh> ' }))
    expect(reopened.terminals['s-1']).toEqual({ terminalId: 'pty-2', output: 'dsh> ', status: undefined })
  })

  it('appends terminal deltas and final viewport output, then discards state on a generation change', () => {
    const first = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, { sessionId: 's-1', terminalId: 'pty-1', kind: 'delta', text: 'hello ' }))
    const settled = applyInspectorFrame(first, frame(3, { sessionId: 's-1', terminalId: 'pty-1', kind: 'settled', text: 'world', status: { kind: 'running' } }))
    expect(settled.terminals['s-1']?.output).toBe('hello world')
    expect(settled.terminals['s-1']?.status).toEqual({ kind: 'running' })
    const second = applyInspectorFrame(settled, frame(4, { type: 'session/subscribed', sessionId: 's-1', lastSeq: 0 }))
    expect(second.terminals).toEqual({})
    expect(second.generation).toBe(4)
  })
})

describe('M5B.2 null-payload resilience', () => {
  it('drops null payload frames instead of crashing on payload.type', () => {
    expect(() => applyInspectorFrame(EMPTY_INSPECTOR, frame(3, null))).not.toThrow()
    const state = applyInspectorFrame(EMPTY_INSPECTOR, frame(3, null))
    // The generation is adopted; the null payload itself is dropped.
    expect(state.generation).toBe(3)
    expect(state.plans).toEqual({})
    expect(state.terminals).toEqual({})
  })

  it('drops undefined and non-object payloads without throwing', () => {
    expect(() => applyInspectorFrame(EMPTY_INSPECTOR, frame(3, undefined))).not.toThrow()
    expect(() => applyInspectorFrame(EMPTY_INSPECTOR, frame(3, 'string'))).not.toThrow()
  })
})
