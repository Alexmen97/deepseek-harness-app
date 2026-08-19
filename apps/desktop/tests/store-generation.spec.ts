import { beforeEach, describe, expect, it } from 'vitest'
import { installDesktopBindings, type DesktopBindings, type DesktopHost, type DesktopTransport } from '@deepseek-ai/dsh-desktop-client'
import { resetInspectorStoreForTest, terminalRequest } from '../src/inspector/store.ts'

function installFakes(initialGeneration: number) {
  const requests: Array<{ method: string; generation: number }> = []
  const host = {
    runtimeStatus: async () => ({ state: 'running' as const, generation: initialGeneration }),
  } as unknown as DesktopHost
  const transport: DesktopTransport = {
    request: async (request) => { requests.push({ method: request.method, generation: request.generation }); return {} },
    subscribeFrames: () => () => {},
    subscribeState: () => () => {},
  }
  installDesktopBindings({ transport, host } satisfies DesktopBindings)
  return requests
}

describe('M5B.1 inspector store generation boot anchor', () => {
  beforeEach(() => { resetInspectorStoreForTest() })

  it('uses the runtimeStatus snapshot when no state event arrives after install', async () => {
    const requests = installFakes(3)
    await terminalRequest('desktop.fs.stat', { sessionId: 's', path: 'a.ts' })
    expect(requests[0]?.generation).toBe(3)
  })
})
