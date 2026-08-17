import { afterEach, describe, expect, it } from 'vitest'
import { makeServerHarness, type ServerHarness } from './harness.ts'

describe('desktop credential bridge', () => {
  let harness: ServerHarness | undefined

  afterEach(async () => {
    await harness?.dispose()
    harness = undefined
  })

  /** Answer the next host request frame with the given JSON-RPC result/error. */
  async function answerHostRequest(method: string, result: unknown, error: unknown): Promise<void> {
    const request = await harness!.waitLineWhere(line => line.method === method && line.id !== undefined)
    const response = error === undefined
      ? { jsonrpc: '2.0', id: request.id, result }
      : { jsonrpc: '2.0', id: request.id, error }
    harness!.write(JSON.stringify(response))
  }

  it('resolves a credential through a host response and reports the capability', async () => {
    harness = await makeServerHarness({ keychain: true })
    const pending = harness.ctx.desktopCredentialBridge.resolve('DEEPSEEK_API_KEY')
    await answerHostRequest('desktop/credential-resolve', { value: 'sk-host-value' }, undefined)
    await expect(pending).resolves.toBe('sk-host-value')

    harness.request('desktop.initialize', { cwd: process.cwd() }, 'init')
    const init = await harness.waitResponse('init')
    expect((init.result as { capabilities: { keychain: boolean } }).capabilities.keychain).toBe(true)
  })

  it('falls back to undefined when the host answers method-not-found', async () => {
    harness = await makeServerHarness({ keychain: true })
    const pending = harness.ctx.desktopCredentialBridge.resolve('DEEPSEEK_API_KEY')
    await answerHostRequest('desktop/credential-resolve', undefined, { code: -32601, message: 'method not found' })
    await expect(pending).resolves.toBeUndefined()
  })

  it('stores and deletes through host requests', async () => {
    harness = await makeServerHarness({ keychain: true })
    const stored = harness.ctx.desktopCredentialBridge.store('DEEPSEEK_API_KEY', 'sk-new')
    const storeRequest = await harness.waitLineWhere(line => line.method === 'desktop/credential-store' && line.id !== undefined)
    expect(storeRequest.params).toEqual({ ref: 'DEEPSEEK_API_KEY', value: 'sk-new' })
    harness.write(JSON.stringify({ jsonrpc: '2.0', id: storeRequest.id, result: {} }))
    await stored

    const removed = harness.ctx.desktopCredentialBridge.delete('DEEPSEEK_API_KEY')
    const deleteRequest = await harness.waitLineWhere(line => line.method === 'desktop/credential-delete' && line.id !== undefined)
    harness.write(JSON.stringify({ jsonrpc: '2.0', id: deleteRequest.id, result: {} }))
    await removed
  })

  it('reports keychain false without the config flag', async () => {
    harness = await makeServerHarness()
    harness.request('desktop.initialize', { cwd: process.cwd() }, 'init')
    const init = await harness.waitLineWhere(line => line.id === 'init')
    expect((init.result as { capabilities: { keychain: boolean } }).capabilities.keychain).toBe(false)
  })
})
