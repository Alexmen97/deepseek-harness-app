import { afterEach, describe, expect, it } from 'vitest'
import { initializeHarness } from './harness-helpers.ts'
import { makeServerHarness, makeStubFs, type ServerHarness } from './harness.ts'

describe('desktop filesystem domain', () => {
  let harness: ServerHarness | undefined

  afterEach(async () => {
    await harness?.dispose()
    harness = undefined
  })

  it('stats and reads a workspace file through ctx.fs', async () => {
    harness = await makeServerHarness({ fs: makeStubFs({ 'a.txt': 'hello' }).fs })
    await initializeHarness(harness, { cwd: '/workspace' })
    harness.request('desktop.fs.stat', { sessionId: 's-1', path: 'a.txt' }, 'stat-1')
    const stat = await harness.waitResponse('stat-1')
    expect(stat.result).toMatchObject({ kind: 'present', type: 'file', size: 5 })

    harness.request('desktop.fs.read', { sessionId: 's-1', path: 'a.txt' }, 'read-1')
    const read = await harness.waitResponse('read-1')
    expect(read.result).toMatchObject({ ok: true, content: 'hello' })
    expect(typeof (read.result as { version: unknown }).version).toBe('string')
  })

  it('writes with the observed version and returns the new version', async () => {
    harness = await makeServerHarness({ fs: makeStubFs({ 'a.txt': 'v1' }).fs })
    await initializeHarness(harness, { cwd: '/workspace' })
    harness.request('desktop.fs.read', { sessionId: 's-1', path: 'a.txt' }, 'read-1')
    const read = await harness.waitResponse('read-1')
    const version = (read.result as { version: string }).version

    harness.request('desktop.fs.write', { sessionId: 's-1', path: 'a.txt', content: 'v2', expectedVersion: version }, 'write-1')
    const write = await harness.waitResponse('write-1')
    expect(write.result).toMatchObject({ ok: true, operation: 'update' })
    expect((write.result as { version: string }).version).not.toBe(version)
  })

  it('rejects a stale version and leaves the newer content intact', async () => {
    const stub = makeStubFs({ 'a.txt': 'first' })
    harness = await makeServerHarness({ fs: stub.fs })
    await initializeHarness(harness, { cwd: '/workspace' })
    harness.request('desktop.fs.read', { sessionId: 's-1', path: 'a.txt' }, 'read-1')
    const read = await harness.waitResponse('read-1')
    const stale = (read.result as { version: string }).version

    harness.request('desktop.fs.write', { sessionId: 's-1', path: 'a.txt', content: 'second', expectedVersion: stale }, 'write-1')
    await harness.waitResponse('write-1')
    harness.request('desktop.fs.write', { sessionId: 's-1', path: 'a.txt', content: 'third', expectedVersion: stale }, 'write-2')
    const rejected = await harness.waitResponse('write-2')
    expect(rejected.result).toMatchObject({ ok: false, code: 'FS_STALE_VERSION' })
    harness.request('desktop.fs.read', { sessionId: 's-1', path: 'a.txt' }, 'read-2')
    const after = await harness.waitResponse('read-2')
    expect((after.result as { content: string }).content).toBe('second')
  })

  it('reports a typed failure for a missing file', async () => {
    harness = await makeServerHarness({ fs: makeStubFs().fs })
    await initializeHarness(harness, { cwd: '/workspace' })
    harness.request('desktop.fs.read', { sessionId: 's-1', path: 'missing.txt' }, 'read-1')
    const read = await harness.waitResponse('read-1')
    expect(read.result).toMatchObject({ ok: false, code: 'FS_NOT_FOUND' })
  })
})
