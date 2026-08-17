import { describe, expect, it } from 'vitest'
import { notificationForFailedState, notificationForFrame } from '../src/client/notifications.ts'

describe('desktop notification policy', () => {
  it('notifies for approvals and questions only while unfocused', () => {
    expect(notificationForFrame({ payload: { type: 'approval/requested' } }, false)).toEqual({ kind: 'approval' })
    expect(notificationForFrame({ payload: { type: 'approval/requested' } }, true)).toBeUndefined()
    expect(notificationForFrame({ payload: { type: 'question/requested' } }, false)).toEqual({ kind: 'question' })
    expect(notificationForFrame({ payload: { type: 'question/requested' } }, true)).toBeUndefined()
  })

  it('notifies task completion on turn/end only while unfocused', () => {
    const frame = { payload: { type: 'session/event', event: { type: 'turn/end' } } }
    expect(notificationForFrame(frame, false)).toEqual({ kind: 'task-completed' })
    expect(notificationForFrame(frame, true)).toBeUndefined()
    expect(notificationForFrame({ payload: { type: 'session/event', event: { type: 'turn/start' } } }, false)).toBeUndefined()
  })

  it('ignores unrelated frames', () => {
    expect(notificationForFrame({ payload: { type: 'session/event', event: { type: 'user/message' } } }, false)).toBeUndefined()
    expect(notificationForFrame({}, false)).toBeUndefined()
  })

  it('always notifies a runtime failure', () => {
    expect(notificationForFailedState()).toEqual({ kind: 'runtime-failed' })
  })
})
