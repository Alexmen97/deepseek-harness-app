/**
 * Native workspace-picker occupant: fills the two directory-flow holes that
 * ui-workspace declares, driving the macOS panel through the desktop host.
 * Cancellation reports onCancel, never an error.
 *
 * @module @deepseek-ai/dsh-desktop-client/client/picker
 */

import { useEffect } from 'react'
import type { ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { DesktopHostService } from './host.ts'

export const name = 'desktop-directory-picker'
export const inject = ['slots', 'desktopHost']

/** One renderless hole occupant: runs the native picker while the hole is open. */
function NativePickerOccupant(props: DirectoryFlowOwnerProps & { host: DesktopHostService }): ReactElement | null {
  const open = props.open
  const busy = props.busy
  useEffect(() => {
    if (!open || busy) return
    let active = true
    void props.host.pickWorkspace().then((path) => {
      if (!active) return
      if (path === null) props.onCancel()
      else props.onPicked(path)
    }, (error: unknown) => {
      if (!active) return
      props.onError(error instanceof Error ? error.message : String(error))
    })
    return () => { active = false }
  }, [open, busy, props])
  return null
}

/** Fill both directory-flow holes with the native picker occupant. */
export function apply(ctx: Context): void {
  const host = ctx.desktopHost
  ctx.slots.inject('conversation.hero.workspace.directoryFlow', () =>
    ctx.slots.inject('sidebar.workspaces.directoryFlow', function* () {
      yield ctx.slots.register({
        name: 'conversation.hero.workspace.directoryFlow', inject: () => ({ host }),
      }, NativePickerOccupant)
      yield ctx.slots.register({
        name: 'sidebar.workspaces.directoryFlow', inject: () => ({ host }),
      }, NativePickerOccupant)
    }))
}
