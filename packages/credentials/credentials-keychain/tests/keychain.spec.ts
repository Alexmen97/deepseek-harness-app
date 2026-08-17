import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { DesktopCredentialBridge } from '@deepseek-ai/dsh-desktop-protocol'
import { KeychainCredentialProvider } from '../src/index.ts'

/** Scripted bridge recording every operation. */
interface FakeBridge extends DesktopCredentialBridge {
  readonly calls: {
    resolve: string[]
    store: [ref: string, value: string][]
    delete: string[]
  }
}

function fakeBridge(overrides: {
  resolve?: (ref: string) => Promise<string | undefined>
  store?: (ref: string, value: string) => Promise<void>
  delete?: (ref: string) => Promise<void>
} = {}): FakeBridge {
  const calls: FakeBridge['calls'] = { resolve: [], store: [], delete: [] }
  return {
    calls,
    resolve: async (ref) => { calls.resolve.push(ref); return overrides.resolve ? overrides.resolve(ref) : undefined },
    store: async (ref, value) => { calls.store.push([ref, value]); await overrides.store?.(ref, value) },
    delete: async (ref) => { calls.delete.push(ref); await overrides.delete?.(ref) },
  }
}

describe('keychain credential provider', () => {
  let ctx: Context | undefined
  let savedEnv: string | undefined

  afterEach(async () => {
    await ctx?.fiber.dispose()
    ctx = undefined
    if (savedEnv === undefined) delete process.env['DSH_TEST_CRED']
    else process.env['DSH_TEST_CRED'] = savedEnv
    savedEnv = undefined
  })

  async function makeProvider(bridge: DesktopCredentialBridge): Promise<{ ctx: Context; provider: KeychainCredentialProvider }> {
    const built = new Context()
    built.provide('desktopCredentialBridge', bridge)
    await built.plugin(KeychainCredentialProvider)
    return { ctx: built, provider: built.credentials as KeychainCredentialProvider }
  }

  it('resolves a reference from the keychain bridge and reports its source', async () => {
    const bridge = fakeBridge({ resolve: async () => 'sk-keychain-value' })
    const { provider } = await makeProvider(bridge)
    await expect(provider.resolve(credentialRef('DEEPSEEK_API_KEY'))).resolves.toEqual({
      value: 'sk-keychain-value',
      source: 'keychain',
    })
    await expect(provider.describe(credentialRef('DEEPSEEK_API_KEY'))).resolves.toEqual({
      configured: true,
      source: 'keychain',
      writable: true,
    })
    expect(bridge.calls.resolve).toHaveLength(2)
    expect(bridge.calls.resolve.every(ref => ref === 'DEEPSEEK_API_KEY')).toBe(true)
  })

  it('falls back to the environment layer when the keychain has no value', async () => {
    savedEnv = process.env['DSH_TEST_CRED']
    process.env['DSH_TEST_CRED'] = 'env-value'
    const bridge = fakeBridge()
    const { provider } = await makeProvider(bridge)
    await expect(provider.resolve(credentialRef('DSH_TEST_CRED'))).resolves.toEqual({
      value: 'env-value',
      source: 'env',
    })
  })

  it('reports an unconfigured reference', async () => {
    const bridge = fakeBridge()
    const { provider } = await makeProvider(bridge)
    await expect(provider.resolve(credentialRef('DEEPSEEK_API_KEY'))).resolves.toBeUndefined()
    await expect(provider.describe(credentialRef('DEEPSEEK_API_KEY'))).resolves.toEqual({
      configured: false,
      writable: true,
    })
  })

  it('stores and deletes through the bridge, never through the environment', async () => {
    const bridge = fakeBridge()
    const { ctx: built, provider } = await makeProvider(bridge)
    const updated = vi.fn()
    built.on('credentials/updated', updated)
    await provider.set(credentialRef('DEEPSEEK_API_KEY'), 'sk-new')
    expect(bridge.calls.store).toEqual([['DEEPSEEK_API_KEY', 'sk-new']])
    expect(updated).toHaveBeenCalledWith('DEEPSEEK_API_KEY')
    await provider.unset(credentialRef('DEEPSEEK_API_KEY'))
    expect(bridge.calls.delete).toEqual(['DEEPSEEK_API_KEY'])
  })

  it('rejects an empty stored value', async () => {
    const bridge = fakeBridge()
    const { provider } = await makeProvider(bridge)
    await expect(provider.set(credentialRef('DEEPSEEK_API_KEY'), '')).rejects.toThrow(/non-empty/)
  })

  it('never logs a secret value on failed operations', async () => {
    const bridge = fakeBridge({ store: async () => { throw new Error('keychain unavailable') } })
    const { provider } = await makeProvider(bridge)
    const error = await provider.set(credentialRef('DEEPSEEK_API_KEY'), 'sk-secret').catch((value: unknown) => value)
    expect(String(error)).not.toContain('sk-secret')
  })
})
