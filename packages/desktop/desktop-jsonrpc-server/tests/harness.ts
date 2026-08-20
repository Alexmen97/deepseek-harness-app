/**
 * In-memory JSON-RPC transport harness for desktop server tests: the plugin
 * reads and writes caller-owned PassThrough streams, so tests drive the wire
 * directly without a subprocess. The ApiProxy face is a stub that serves only
 * the methods this carrier routes; other domains never dispatch.
 */

import { PassThrough } from 'node:stream'
import { Context } from '@deepseek-ai/cordis'
import type { ApiProxy, RpcResult } from '@deepseek-ai/dsh-host-apiproxy'
import type { FsInfo, FsTarget, FsWriteIntent, FsWriteOutcome } from '@deepseek-ai/dsh-fs'
import { FsError, FsVersion as brandVersion } from '@deepseek-ai/dsh-fs'
import { apply as applyServer } from '../src/index.ts'
import type { WireLine } from './wire.ts'

/** Identity provider values the server plugin reads. */
export interface TestRuntimeInfo {
  harnessVersion: string
  runtimeVersion: string
  protocolVersion: number
}

export const TEST_RUNTIME_INFO: TestRuntimeInfo = {
  harnessVersion: '0.1.0-rc.7',
  runtimeVersion: '0.1.0-rc.7',
  protocolVersion: 1,
}

/** In-memory ctx.fs stub for filesystem-domain tests. */
export function makeStubFs(initial: Record<string, string> = {}): {
  store: Map<string, { content: string; version: number }>
  fs: {
    resolve(path: string): Promise<FsTarget>
    stat(target: FsTarget): Promise<FsInfo | undefined>
    readText(target: FsTarget): Promise<string>
    writeText(target: FsTarget, content: string, expected?: FsWriteIntent): Promise<FsWriteOutcome>
  }
} {
  const store = new Map(Object.entries(initial).map(([path, content]) => [path, { content, version: 1 }]))
  const targetFor = (path: string): FsTarget => ({ targetKey: path as never, displayPath: path })
  return {
    store,
    fs: {
      resolve: async (path: string) => targetFor(path),
      stat: async (target: FsTarget) => {
        const entry = store.get(target.displayPath)
        if (entry === undefined) return undefined
        return { version: brandVersion('v' + String(entry.version)), type: 'file', size: entry.content.length }
      },
      readText: async (target: FsTarget) => {
        const entry = store.get(target.displayPath)
        if (entry === undefined) throw new FsError('not found', 'FS_NOT_FOUND')
        return entry.content
      },
      writeText: async (target: FsTarget, content: string, expected?: FsWriteIntent) => {
        const entry = store.get(target.displayPath)
        if (expected?.kind === 'replaceIfVersion') {
          const current = entry?.version ?? 0
          const expectedNumber = Number(String(expected.version).replace(/^v/, ''))
          if (current !== expectedNumber) throw new FsError('stale version', 'FS_STALE_VERSION')
        }
        const next = { content, version: (entry?.version ?? 0) + 1 }
        store.set(target.displayPath, next)
        return {
          operation: entry === undefined ? 'create' : 'update',
          version: brandVersion('v' + String(next.version)),
          before: entry?.content ?? null,
          after: content,
        }
      },
    },
  }
}

/**
 * Build a stub ApiProxy face. Served methods route to the supplied overrides;
 * every other domain answers an internal error so a route that should never
 * dispatch fails loudly if it does.
 */
export function stubApiProxy(overrides: {
  sessions?: Partial<ApiProxy['sessions']>
  workspace?: Partial<ApiProxy['workspace']>
  credentials?: Partial<ApiProxy['credentials']>
  llm?: Partial<ApiProxy['llm']>
  respond?: ApiProxy['respond']
  mux?: ApiProxy['events']['mux']
  host?: ApiProxy['events']['host']
}): ApiProxy {
  const internal = async <T>(request: { rpcId: unknown }): Promise<{ rpcId: unknown; result: RpcResult<T> }> => ({
    rpcId: request.rpcId,
    result: { ok: false, error: { code: 'internal', message: 'stub domain not served', details: {} } },
  })
  const domain = (): Record<string, unknown> => new Proxy({}, {
    get: () => internal,
  })
  return {
    sessions: { ...domain(), ...overrides.sessions } as ApiProxy['sessions'],
    subagents: domain() as unknown as ApiProxy['subagents'],
    host: domain() as unknown as ApiProxy['host'],
    workspace: { ...domain(), ...overrides.workspace } as ApiProxy['workspace'],
    skills: domain() as unknown as ApiProxy['skills'],
    agentPresets: domain() as unknown as ApiProxy['agentPresets'],
    events: {
      mux: overrides.mux ?? (async function * () {}),
      host: overrides.host ?? (async function * () {}),
    },
    goals: domain() as unknown as ApiProxy['goals'],
    settings: domain() as unknown as ApiProxy['settings'],
    credentials: { ...domain(), ...overrides.credentials } as ApiProxy['credentials'],
    llm: { ...domain(), ...overrides.llm } as ApiProxy['llm'],
    downloads: domain() as unknown as ApiProxy['downloads'],
    respond: overrides.respond ?? (async () => ({ accepted: false, reason: 'not-pending' })),
  }
}

/** One booted desktop server over cross-wired byte streams. */
export interface ServerHarness {
  ctx: Context
  /** Raw stdout bytes the server wrote, accumulated in receive order. */
  rawOutput: string
  /** Decoded JSON-RPC lines the server wrote (responses and notifications). */
  lines: WireLine[]
  /** Every decoded line ever written, never consumed. */
  allLines: WireLine[]
  /** Exit codes captured through the plugin's exit override. */
  exits: number[]
  /** Send one raw line to the server's input. */
  write(line: string): void
  /** Send one JSON-RPC request frame. */
  request(method: string, params?: unknown, id?: string): void
  /** Wait until the server wrote at least one more line, returning it. */
  waitLine(): Promise<WireLine>
  /** Wait for a line matching the predicate (responses and notifications). */
  waitLineWhere(match: (line: WireLine) => boolean): Promise<WireLine>
  /** Wait for the response to one request id, skipping interleaved notifications. */
  waitResponse(id: string): Promise<WireLine>
  /** Drain already-written lines. */
  drainLines(): WireLine[]
  /** Dispose the context and the streams. */
  dispose(): Promise<void>
}

/**
 * Boot the server plugin against a stubbed ApiProxy and identity provider.
 * @param options - the served-domain stubs and optional composed services.
 * @returns the harness with the transport wiring and output capture.
 */
export async function makeServerHarness(options: {
  api?: ReturnType<typeof stubApiProxy>
  info?: TestRuntimeInfo
  approval?: boolean
  questions?: boolean
  attachments?: boolean
  llmProviders?: string[]
  keychain?: boolean
  fs?: ReturnType<typeof makeStubFs>['fs']
} = {}): Promise<ServerHarness> {
  const ctx = new Context()
  ctx.provide('apiProxy', options.api ?? stubApiProxy({}))
  ctx.provide('desktopRuntimeInfo', options.info ?? TEST_RUNTIME_INFO)
  if (options.approval === true) ctx.provide('approval', {})
  if (options.questions === true) ctx.provide('userQuestions', {})
  if (options.attachments === true) ctx.provide('attachments', {})
  ctx.provide('fs', options.fs ?? makeStubFs().fs)
  ctx.provide('agents', { get: () => ({}) })
  ctx.provide('terminals', {
    spawn: async () => { throw new FsError('no backend', 'FS_IO_ERROR') },
    startSend: () => { throw new Error('not served') },
    signal: async () => ({ delivered: true, targetPgid: 0 }),
    resize: () => {},
    read: () => ({ text: '', totalLines: 0, lineBegin: 0, lineEnd: 0, truncated: false }),
    kill: async () => false,
    list: () => [],
  })
  if (options.llmProviders !== undefined) {
    ctx.provide('llm', { listProviders: () => options.llmProviders?.map(id => ({ id, name: id })) ?? [] })
  }

  const input = new PassThrough()
  const output = new PassThrough()
  const lines: WireLine[] = []
  const allLines: WireLine[] = []
  const exits: number[] = []
  let rawOutput = ''
  const pending: (() => void)[] = []
  const drain = (): void => {
    const parts = rawOutput.split('\n')
    rawOutput = parts.pop() ?? ''
    for (const part of parts) {
      if (part.trim() === '') continue
      lines.push(JSON.parse(part) as WireLine)
      allLines.push(JSON.parse(part) as WireLine)
    }
    for (const wake of pending.splice(0)) wake()
  }
  output.on('data', (chunk: Buffer) => {
    rawOutput += chunk.toString('utf8')
    drain()
  })

  await ctx.plugin({
    name: 'desktop-jsonrpc-server-test',
    inject: ['apiProxy', 'desktopRuntimeInfo'],
    apply: (inner: Context) => {
      applyServer(inner, {
        input,
        output,
        exit: (code: number) => { exits.push(code) },
        keychain: options.keychain === true,
      })
    },
  })

  return {
    ctx,
    get rawOutput() { return rawOutput },
    lines,
    allLines,
    exits,
    write: (line: string) => { input.write(line + '\n') },
    request: (method: string, params?: unknown, id = 'req-1') => {
      input.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    },
    waitLine: async () => {
      if (lines.length === 0) {
        await new Promise<void>((resolve) => { pending.push(resolve) })
        drain()
      }
      if (lines.length === 0) throw new Error('no line arrived')
      return lines.shift() as WireLine
    },
    waitLineWhere: async (match: (line: WireLine) => boolean) => {
      for (;;) {
        const line = await (async () => {
          if (lines.length === 0) {
            await new Promise<void>((resolve) => { pending.push(resolve) })
            drain()
          }
          if (lines.length === 0) throw new Error('no line arrived')
          return lines.shift() as WireLine
        })()
        if (match(line)) return line
      }
    },
    waitResponse: async (id: string) => {
      for (;;) {
        const line = await (async () => {
          if (lines.length === 0) {
            await new Promise<void>((resolve) => { pending.push(resolve) })
            drain()
          }
          if (lines.length === 0) throw new Error('no line arrived')
          return lines.shift() as WireLine
        })()
        if (line.id === id) return line
      }
    },
    drainLines: () => {
      drain()
      const drained = [...lines]
      lines.length = 0
      return drained
    },
    dispose: async () => {
      input.destroy()
      output.destroy()
      await ctx.fiber.dispose()
    },
  }
}
