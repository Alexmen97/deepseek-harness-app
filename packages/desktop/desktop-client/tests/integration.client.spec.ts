/**
 * M1B host-equivalent integration: Node harness → packaged runtime →
 * DesktopApiClient → the complete boundary beneath React. Keyless replay
 * fixtures; skips when the packaged runtime has not been built.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-host-apiproxy/api'
import { DesktopApiClient } from '../src/api.ts'
import { spawnNodeRuntime, type NodeRuntimeHarness } from './node-transport.client.ts'

const EXE = resolve(process.cwd(), 'dist-exe', 'dsh-desktop-runtime-macos-arm64')
const exists = existsSync(EXE)

async function initialize(
  runtime: NodeRuntimeHarness,
  client: DesktopApiClient,
): Promise<{ workspaceId: WorkspaceId; sessionId: SessionId }> {
  const described = await client.host.describe({})
  expect(described.result.ok).toBe(true)
  const created = await client.workspace.create({ path: runtime.workspace })
  if (!created.result.ok) throw new Error('workspace create failed')
  const workspaceId = created.result.value.workspace.workspaceId
  const sessionId = 'm1b-1' as SessionId
  const session = await client.sessions.create({ workspaceId, sessionId })
  expect(session.result.ok).toBe(true)
  return { workspaceId, sessionId }
}

describe.skipIf(!exists)('M1B integration over the packaged runtime', () => {
  let runtime: NodeRuntimeHarness | undefined
  let client: DesktopApiClient | undefined

  afterEach(async () => {
    client?.dispose()
    if (runtime !== undefined) {
      await runtime.close()
      runtime.cleanup()
    }
    runtime = undefined
    client = undefined
  })

  it('runs a full approved turn through DesktopApiClient', async () => {
    runtime = spawnNodeRuntime('m1a-approve')
    client = new DesktopApiClient(runtime.transport)
    const { sessionId } = await initialize(runtime, client)

    const prompt = await client.sessions.prompt({ sessionId, mode: 'queue', content: [{ type: 'text', text: 'Reply only with READY' }] })
    expect(prompt.result.ok).toBe(true)

    let approved = false
    const events = client.events.mux({}, new AbortController().signal)
    for await (const frame of events) {
      if (frame.payload.type === 'approval/requested') {
        const receipt = await client.respond({
          type: 'client-response',
          rpcId: frame.rpcId,
          result: {
            ok: true,
            value: {
              sessionId,
              approvalId: (frame.payload as { approvalId: string }).approvalId,
              outcome: 'allowed-once',
            },
          },
        })
        expect(receipt).toEqual({ accepted: true })
        approved = true
        break
      }
    }
    expect(approved).toBe(true)

    const listed = await client.sessions.list({})
    if (!listed.result.ok) throw new Error('session list failed')
    const items = listed.result.value.items
    expect(items.some(item => item.sessionId === sessionId)).toBe(true)
  }, 120_000)

  it('rejects a turn through the respond path', async () => {
    runtime = spawnNodeRuntime('m1a-reject')
    client = new DesktopApiClient(runtime.transport)
    const { sessionId } = await initialize(runtime, client)
    const prompt = await client.sessions.prompt({ sessionId, mode: 'queue', content: [{ type: 'text', text: 'Run it' }] })
    expect(prompt.result.ok).toBe(true)

    let rejected = false
    const events = client.events.mux({}, new AbortController().signal)
    for await (const frame of events) {
      if (frame.payload.type === 'approval/requested') {
        const receipt = await client.respond({
          type: 'client-response',
          rpcId: frame.rpcId,
          result: {
            ok: true,
            value: {
              sessionId,
              approvalId: (frame.payload as { approvalId: string }).approvalId,
              outcome: 'rejected',
            },
          },
        })
        expect(receipt).toEqual({ accepted: true })
        rejected = true
        break
      }
    }
    expect(rejected).toBe(true)
  }, 120_000)

  it('serves the question flow through the mux stream', async () => {
    runtime = spawnNodeRuntime('m1a-question')
    client = new DesktopApiClient(runtime.transport)
    const { sessionId } = await initialize(runtime, client)
    const prompt = await client.sessions.prompt({ sessionId, mode: 'queue', content: [{ type: 'text', text: 'Ask me' }] })
    expect(prompt.result.ok).toBe(true)

    let answered = false
    const events = client.events.mux({}, new AbortController().signal)
    for await (const frame of events) {
      if (frame.payload.type === 'question/requested') {
        const receipt = await client.respond({
          type: 'client-response',
          rpcId: frame.rpcId,
          result: { ok: true, value: { sessionId, answer: { answers: [{ id: 'q1', selected: ['Yes'] }] } } },
        })
        expect(receipt).toEqual({ accepted: true })
        answered = true
        break
      }
    }
    expect(answered).toBe(true)
  }, 120_000)
})
