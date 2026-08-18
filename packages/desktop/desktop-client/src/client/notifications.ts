/**
 * Native notification policy: which runtime signals deserve a macOS
 * notification. Privacy-minimal by construction; the policy never includes
 * prompt or model text, only fixed kinds. Pure and unit-tested.
 *
 * @module @deepseek-ai/dsh-desktop-client/client/notifications
 */

export type NotificationKind = 'approval' | 'question' | 'task-completed' | 'runtime-failed'

/** One decided native notification: a fixed kind, never prompt or model text. */
export interface NotificationDecision {
  kind: NotificationKind
}

interface FrameLike {
  payload?: unknown
}

/**
 * Decide whether one runtime frame (mux/host) deserves a notification.
 * @param frame - one inbound runtime frame, mux or host originated.
 * @param focused - whether the window currently owns focus; focused apps never notify.
 * @returns the notification kind, or undefined when the frame is silent or the window is focused.
 */
export function notificationForFrame(frame: FrameLike, focused: boolean): NotificationDecision | undefined {
  if (focused) return undefined
  const payload = frame.payload as { type?: string; event?: { type?: string } } | undefined
  const type = payload?.type
  if (type === 'approval/requested') return { kind: 'approval' }
  if (type === 'question/requested') return { kind: 'question' }
  if (type === 'session/event' && payload?.event?.type === 'turn/end') return { kind: 'task-completed' }
  return undefined
}

/**
 * Runtime lifecycle failure always notifies, focused or not.
 * @returns the runtime-failed notification decision.
 */
export function notificationForFailedState(): NotificationDecision {
  return { kind: 'runtime-failed' }
}
