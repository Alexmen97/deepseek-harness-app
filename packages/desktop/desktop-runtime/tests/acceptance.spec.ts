/**
 * M1A acceptance: drives the PACKAGED desktop runtime executable over real
 * stdio, with node/npm/pnpm removed from PATH, through the complete flow —
 * handshake, workspace, session, streamed turn, approval (allow and reject),
 * question, session listing, graceful shutdown, clean exit. Skips when the
 * packaging spike artifact has not been built (the python carrier precedent
 * for missing-artifact skips).
 */

import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { LaunchedRuntime } from './launch.ts'
import { launchRuntime } from './launch.ts'

const REPO_ROOT = process.cwd()
const EXE = resolve(REPO_ROOT, 'dist-exe', 'dsh-desktop-runtime-macos-arm64')
const exists = existsSync(EXE)

/** Spawn the packaged runtime with a node-free PATH. */
function spawnPackaged(fixture: string): LaunchedRuntime {
  return launchRuntime({
    fixture,
    command: EXE,
    args: [],
    env: { PATH: '/usr/bin:/bin', HOME: process.env['HOME'] ?? '/tmp' },
  })
}

describe.skipIf(!exists)('packaged desktop runtime acceptance', () => {
  let runtime: LaunchedRuntime | undefined

  afterEach(async () => {
    if (runtime !== undefined) {
      await runtime.close()
      runtime.cleanup()
    }
    runtime = undefined
  })

  it('reports the packaged artifact metrics', () => {
    const megabytes = statSync(EXE).size / (1024 * 1024)
    expect(megabytes).toBeGreaterThan(0)
    const file = spawnSync('/usr/bin/file', [EXE], { encoding: 'utf8' })
    expect(file.stdout).toContain('arm64')
    console.log('desktop runtime packaged size: ' + megabytes.toFixed(1) + ' MB')
    console.log('desktop runtime packaged arch: ' + file.stdout.trim())
  })

  it('runs the full M1A flow against the packaged runtime without node on PATH', async () => {
    runtime = spawnPackaged('m1a-approve')
    const startedAt = Date.now()
    const { client, workspace } = runtime
    client.request('desktop.initialize', { cwd: workspace }, 'init')
    const handshake = await client.waitResponse('init')
    const startupMs = Date.now() - startedAt
    console.log('desktop runtime startup to handshake: ' + String(startupMs) + ' ms')
    expect(handshake.result).toMatchObject({
      protocolVersion: 1,
      serverInfo: { name: 'deepseek-harness-desktop-runtime' },
      capabilities: {
        sessions: true,
        workspaces: true,
        approvals: true,
        questions: true,
        terminal: false,
        keychain: true,
      },
    })

    client.request('workspace.create', { rpcId: 'w1', payload: { path: workspace } }, 'ws')
    const workspaceCreated = await client.waitResponse('ws')
    const workspaceValue = (workspaceCreated.result as { result: { value: { workspace: { workspaceId: string } } } }).result.value
    expect(workspaceValue.workspace.workspaceId).toBeTruthy()

    client.request('session.create', {
      rpcId: 'sc1',
      payload: { workspaceId: workspaceValue.workspace.workspaceId, sessionId: 'accept-1' },
    }, 'sc')
    const session = await client.waitResponse('sc')
    expect((session.result as { result: { ok: boolean } }).result.ok).toBe(true)

    client.request('session.prompt', {
      rpcId: 'p1',
      payload: { sessionId: 'accept-1', mode: 'queue', content: [{ type: 'text', text: 'Reply only with READY' }] },
    }, 'sp')
    await client.waitResponse('sp')

    const approval = await client.waitMuxFrame('approval/requested')
    const params = approval.line.params as { rpcId: string }
    expect(approval.payload).toMatchObject({ sessionId: 'accept-1', toolName: 'bash' })

    client.request('respond', {
      type: 'client-response',
      rpcId: params.rpcId,
      result: {
        ok: true,
        value: { sessionId: 'accept-1', approvalId: approval.payload.approvalId, outcome: 'allowed-once' },
      },
    }, 'rs1')
    await client.waitMuxFrame('approval/resolved')
    expect((await client.waitResponse('rs1')).result).toEqual({ accepted: true })
    const message = await client.waitSessionEvent('assistant/message')
    expect(JSON.stringify(message)).toContain('READY')
    await client.waitSessionEvent('turn/end')

    client.request('session.list', { rpcId: 'l1', payload: {} }, 'sl')
    const listed = await client.waitResponse('sl')
    const items = (listed.result as { result: { value: { items: { sessionId: string }[] } } }).result.value.items
    expect(items.some(item => item.sessionId === 'accept-1')).toBe(true)

    client.request('desktop.shutdown', {}, 'sd')
    expect((await client.waitResponse('sd')).result).toEqual({})
    expect(await runtime.exited).toBe(0)
    runtime = undefined
  }, 120_000)

  it('runs the reject path against the packaged runtime', async () => {
    runtime = spawnPackaged('m1a-reject')
    const { client, workspace } = runtime
    client.request('desktop.initialize', { cwd: workspace }, 'init')
    await client.waitResponse('init')
    client.request('workspace.create', { rpcId: 'w1', payload: { path: workspace } }, 'ws')
    const workspaceCreated = await client.waitResponse('ws')
    const workspaceValue = (workspaceCreated.result as { result: { value: { workspace: { workspaceId: string } } } }).result.value
    const workspaceId = workspaceValue.workspace.workspaceId
    client.request('session.create', { rpcId: 'sc1', payload: { workspaceId, sessionId: 'accept-2' } }, 'sc')
    await client.waitResponse('sc')
    client.request('session.prompt', {
      rpcId: 'p1',
      payload: { sessionId: 'accept-2', mode: 'queue', content: [{ type: 'text', text: 'Run it' }] },
    }, 'sp')
    await client.waitResponse('sp')

    const approval = await client.waitMuxFrame('approval/requested')
    const params = approval.line.params as { rpcId: string }
    client.request('respond', {
      type: 'client-response',
      rpcId: params.rpcId,
      result: {
        ok: true,
        value: { sessionId: 'accept-2', approvalId: approval.payload.approvalId, outcome: 'rejected' },
      },
    }, 'rs1')
    const resolved = await client.waitMuxFrame('approval/resolved')
    expect(resolved.payload).toMatchObject({ outcome: 'rejected' })
    expect((await client.waitResponse('rs1')).result).toEqual({ accepted: true })
    const message = await client.waitSessionEvent('assistant/message')
    expect(JSON.stringify(message)).toContain('ESCALATION REJECTED')

    client.request('desktop.shutdown', {}, 'sd')
    await client.waitResponse('sd')
    expect(await runtime.exited).toBe(0)
    runtime = undefined
  }, 120_000)

  it('serves the question path against the packaged runtime', async () => {
    runtime = spawnPackaged('m1a-question')
    const { client, workspace } = runtime
    client.request('desktop.initialize', { cwd: workspace }, 'init')
    await client.waitResponse('init')
    client.request('workspace.create', { rpcId: 'w1', payload: { path: workspace } }, 'ws')
    const workspaceCreated = await client.waitResponse('ws')
    const workspaceValue = (workspaceCreated.result as { result: { value: { workspace: { workspaceId: string } } } }).result.value
    const workspaceId = workspaceValue.workspace.workspaceId
    client.request('session.create', { rpcId: 'sc1', payload: { workspaceId, sessionId: 'accept-3' } }, 'sc')
    await client.waitResponse('sc')
    client.request('session.prompt', {
      rpcId: 'p1',
      payload: { sessionId: 'accept-3', mode: 'queue', content: [{ type: 'text', text: 'Ask me' }] },
    }, 'sp')
    await client.waitResponse('sp')

    const question = await client.waitMuxFrame('question/requested')
    const params = question.line.params as { rpcId: string }
    client.request('respond', {
      type: 'client-response',
      rpcId: params.rpcId,
      result: {
        ok: true,
        value: { sessionId: 'accept-3', answer: { answers: [{ id: 'q1', selected: ['Yes'] }] } },
      },
    }, 'rq1')
    await client.waitMuxFrame('question/resolved')
    expect((await client.waitResponse('rq1')).result).toEqual({ accepted: true })
    const message = await client.waitSessionEvent('assistant/message')
    expect(JSON.stringify(message)).toContain('THANKS')

    client.request('desktop.shutdown', {}, 'sd')
    await client.waitResponse('sd')
    expect(await runtime.exited).toBe(0)
    runtime = undefined
  }, 120_000)
})
