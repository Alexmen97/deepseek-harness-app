import type { ServerHarness } from './harness.ts'
import type { WireLine } from './wire.ts'

/** Send initialize and wait for its response, skipping status notifications. */
export async function initializeHarness(
  harness: ServerHarness,
  params: unknown = { cwd: process.cwd() },
): Promise<WireLine> {
  harness.request('desktop.initialize', params, 'init')
  for (;;) {
    const line = await harness.waitLine()
    if (line.id === 'init') return line
  }
}

/** Boot a harness and complete the handshake. */
export async function makeInitializedHarness(
  options: Parameters<typeof import('./harness.ts').makeServerHarness>[0] = {},
): Promise<ServerHarness> {
  const { makeServerHarness } = await import('./harness.ts')
  const harness = await makeServerHarness(options)
  await initializeHarness(harness)
  return harness
}
