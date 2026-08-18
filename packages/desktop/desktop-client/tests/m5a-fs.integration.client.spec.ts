import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnNodeRuntime, type NodeRuntimeHarness } from './node-transport.client.ts'

const EXE = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'dist-exe', 'dsh-desktop-runtime-macos-arm64')

/** Real ctx.fs round trip over the packaged runtime: create, update, stale rejection. */
describe.skipIf(!existsSync(EXE))('M5A filesystem integration over the packaged runtime', () => {
  let runtime: NodeRuntimeHarness | undefined
  let sessionId = ''
  let version = ''

  beforeAll(async () => {
    runtime = spawnNodeRuntime('m1a-approve')
    await runtime.transport.request({ method: 'desktop.initialize', rpcId: 'init', payload: { cwd: runtime.workspace }, generation: 0 })
    const created = await runtime.transport.request({
      method: 'session.create',
      rpcId: 'create',
      payload: { cwd: runtime.workspace },
      generation: 0,
    }) as { result: { ok: true; value: { sessionId: string } } }
    sessionId = created.result.value.sessionId
  }, 120_000)

  afterAll(async () => {
    await runtime?.close()
    runtime?.cleanup()
  })

  it('creates, reads, and updates a file with the version returned by ctx.fs', async () => {
    const created = await runtime?.transport.request({
      method: 'desktop.fs.write',
      rpcId: 'w1',
      payload: { sessionId, path: 'notes.txt', content: 'first draft' },
      generation: 0,
    }) as { ok: true; version: string; operation: string }
    expect(created.ok).toBe(true)
    expect(created.operation).toBe('create')

    const read = await runtime?.transport.request({
      method: 'desktop.fs.read',
      rpcId: 'r1',
      payload: { sessionId, path: 'notes.txt' },
      generation: 0,
    }) as { ok: true; version: string; content: string }
    expect(read.ok).toBe(true)
    expect(read.content).toBe('first draft')
    version = read.version
  })

  it('rejects a stale editor save and preserves the newer content', async () => {
    const update = await runtime?.transport.request({
      method: 'desktop.fs.write',
      rpcId: 'w2',
      payload: { sessionId, path: 'notes.txt', content: 'second draft', expectedVersion: version },
      generation: 0,
    }) as { ok: true; version: string }
    expect(update.ok).toBe(true)

    const stale = await runtime?.transport.request({
      method: 'desktop.fs.write',
      rpcId: 'w3',
      payload: { sessionId, path: 'notes.txt', content: 'stale draft', expectedVersion: version },
      generation: 0,
    }) as { ok: false; code: string }
    expect(stale.ok).toBe(false)
    expect(stale.code).toBe('FS_STALE_VERSION')

    const after = await runtime?.transport.request({
      method: 'desktop.fs.read',
      rpcId: 'r2',
      payload: { sessionId, path: 'notes.txt' },
      generation: 0,
    }) as { ok: true; content: string }
    expect(after.content).toBe('second draft')
  })
})
