/**
 * Desktop connection plugin: the same ConnectionHandle the web connection
 * plugin provides, built over DesktopApiClient and the SAME upstream
 * ConnectionController. The browser plugin's apply hardcodes the WebApiClient
 * and page-URL selection, so the desktop provides this additive sibling
 * instead of modifying upstream.
 *
 * @module @deepseek-ai/dsh-desktop-client/client/connection
 */

import type { Context } from '@deepseek-ai/cordis'
import {
  ConnectionController,
  type ConnectionSinks,
  type ConnectionState,
  type ConnectionHandle,
  type HostDescription,
} from '@deepseek-ai/dsh-client-connection/client'
import { DesktopApiClient } from '../api.ts'
import { desktopBindings } from '../transport.ts'

export const name = 'desktop-connection'
export const inject: string[] = []

/** Provide the desktop ConnectionHandle; one consumer may start the loop. */
export function apply(ctx: Context): void {
  const api = new DesktopApiClient(desktopBindings().transport)
  let started = false
  let description: HostDescription | undefined
  const descriptionListeners = new Set<() => void>()
  const publishDescription = (next: HostDescription | undefined): void => {
    if (Object.is(description, next)) return
    description = next
    for (const listener of [...descriptionListeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[desktop] host-description listener threw:', error)
      }
    }
  }
  const handle: ConnectionHandle = {
    api,
    isLoopback: true,
    hostDescription: {
      getSnapshot: () => description,
      subscribe: (listener) => {
        descriptionListeners.add(listener)
        return () => { descriptionListeners.delete(listener) }
      },
    },
    rpc: {
      call: (_channel: string, _endpoint: string, _payload: unknown, _signal?: AbortSignal) =>
        Promise.reject(new Error('desktop transport does not serve generic logical RPC channels yet')),
    },
    start(sinks: ConnectionSinks, config) {
      if (started) throw new Error('connection: the stream loop is already owned by another consumer')
      started = true
      const controller = new ConnectionController(api, {
        ...sinks,
        onConnected: (next) => {
          publishDescription(next)
          if (!Object.is(description, next)) return
          sinks.onConnected?.(next)
        },
        onStateChange: (state: ConnectionState) => {
          if (state === 'reconnecting') publishDescription(undefined)
          sinks.onStateChange?.(state)
        },
      }, config ?? {})
      // The runtime may still be spawning at boot; begin the connect loop
      // only once a generation reports running, so the first handshake does
      // not burn the controller's initial attempts against a dead transport.
      let unsubState: (() => void) | undefined
      const begin = (): void => {
        if (unsubState !== undefined) {
          unsubState()
          unsubState = undefined
        }
        controller.start()
      }
      const host = ctx.get('desktopHost') as { getLifecycle(): { state: string } } | undefined
      if (host?.getLifecycle().state === 'running') {
        begin()
      } else {
        unsubState = desktopBindings().transport.subscribeState((state) => {
          if (state.state === 'running') begin()
        })
      }
      return {
        stop: () => {
          if (unsubState !== undefined) {
            unsubState()
            unsubState = undefined
          }
          controller.stop()
          publishDescription(undefined)
          api.dispose()
        },
      }
    },
  }
  ctx.provide('connection', handle)
}
