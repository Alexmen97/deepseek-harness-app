import { afterEach, describe, expect, it } from 'vitest'
import { initializeHarness, makeInitializedHarness } from './harness-helpers.ts'
import { makeServerHarness, type ServerHarness } from './harness.ts'

describe('desktop handshake', () => {
  let harness: ServerHarness | undefined

  afterEach(async () => {
    await harness?.dispose()
    harness = undefined
  })

  it('negotiates identity, versions, and capabilities on first initialize', async () => {
    harness = await makeServerHarness({ approval: true, questions: true, attachments: true })
    const line = await initializeHarness(harness)
    expect(line.result).toMatchObject({
      protocolVersion: 1,
      harnessVersion: '0.1.0-rc.7',
      runtimeVersion: '0.1.0-rc.7',
      serverInfo: { name: 'deepseek-harness-desktop-runtime', version: '0.1.0-rc.7' },
    })
    expect(line.result).toMatchObject({
      capabilities: {
        sessions: true,
        workspaces: true,
        events: true,
        models: true,
        approvals: true,
        questions: true,
        attachments: true,
        terminal: true,
        fs: true,
        keychain: false,
      },
    })
  })

  it('reflects composed services in the capability flags', async () => {
    harness = await makeServerHarness()
    const line = await initializeHarness(harness)
    const capabilities = (line.result as { capabilities: Record<string, unknown> }).capabilities
    expect(capabilities.approvals).toBe(false)
    expect(capabilities.questions).toBe(false)
    expect(capabilities.attachments).toBe(false)
  })

  it('is idempotent for identical repeated initialize parameters', async () => {
    harness = await makeServerHarness({ llmProviders: ['mock'] })
    const first = await initializeHarness(harness, { cwd: process.cwd(), provider: 'mock', model: 'mock' })
    harness.request('desktop.initialize', { cwd: process.cwd(), provider: 'mock', model: 'mock' }, 'init-2')
    const second = await harness.waitLine()
    expect(second.error).toBeUndefined()
    expect(second.result).toEqual(first.result)
  })

  it('rejects repeated initialize with different parameters', async () => {
    harness = await makeServerHarness()
    await initializeHarness(harness)
    harness.request('desktop.initialize', { cwd: process.cwd(), model: 'different' }, 'init-2')
    const second = await harness.waitLine()
    expect(String(second.error?.message)).toContain('already completed with different parameters')
  })

  it('rejects an empty cwd and a non-positive maxTokens', async () => {
    harness = await makeServerHarness()
    harness.request('desktop.initialize', { cwd: '   ' })
    expect((await harness.waitLine()).error).toBeDefined()
    harness.request('desktop.initialize', { cwd: process.cwd(), maxTokens: 0 }, 'init-2')
    expect((await harness.waitLine()).error).toBeDefined()
  })

  it('rejects a provider no mounted adapter serves', async () => {
    harness = await makeServerHarness({ llmProviders: ['mock'] })
    harness.request('desktop.initialize', { cwd: process.cwd(), provider: 'unserved' })
    const line = await harness.waitLine()
    expect(String(line.error?.message)).toContain('no adapter registered for provider')
  })

  it('publishes the ready status once the handshake completes', async () => {
    harness = await makeInitializedHarness()
    const drained = harness.drainLines()
    expect(drained).toEqual([])
  })
})
