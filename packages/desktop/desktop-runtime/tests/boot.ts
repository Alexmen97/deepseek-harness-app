/**
 * In-process runtime boot harness: boots the keyless snapshot composition
 * with cross-wired byte streams and per-harness temp roots, so integration
 * tests drive the real agent loop, gateway, and persistence without a
 * subprocess or a provider key.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PassThrough } from 'node:stream'
import type { Context } from '@deepseek-ai/cordis'
import { boot } from '@deepseek-ai/dsh-app-boot'

const RUNTIME_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SNAPSHOT_CONFIG = join(RUNTIME_ROOT, 'runtime', 'cordis.snapshot.yml')
const FIXTURES_ROOT = join(RUNTIME_ROOT, 'fixtures')

/** Per-harness environment values the runtime composition reads. */
export interface BootOptions {
  /** Fixture directory name under fixtures/; defaults to m1a-approve. */
  fixture?: string
  /** Reuse an earlier harness's roots (restart-simulation tests). */
  reuse?: { home: string; sessionsRoot: string; workspace: string }
}

/** One booted desktop runtime with its transport capture and temp roots. */
export interface RuntimeHarness {
  ctx: Context
  /** Temp harness home (DSH_HOME). */
  home: string
  /** Temp session root (DSH_SESSION_ROOT). */
  sessionsRoot: string
  /** Temp workspace directory (DSH_CWD). */
  workspace: string
  /** Decoded JSON-RPC lines in receive order. */
  lines: Record<string, unknown>[]
  /** Exit codes captured through the launch override. */
  exits: number[]
  /** Send one JSON-RPC request frame. */
  request(method: string, params?: unknown, id?: string): void
  /** Wait for the next line and return it. */
  waitLine(): Promise<Record<string, unknown>>
  /** Wait for a line matching the predicate (responses and notifications). */
  waitLineWhere(match: (line: Record<string, unknown>) => boolean): Promise<Record<string, unknown>>
  /** Wait for the response to one request id, skipping interleaved notifications. */
  waitResponse(id: string): Promise<Record<string, unknown>>
  /** Dispose the context, streams, and temp roots. */
  dispose(): Promise<void>
}

/**
 * Boot the desktop runtime in-process with replay serving the fixture.
 * @param options - the fixture scenario.
 * @returns the harness after the tree finished mounting.
 */
export async function bootRuntime(options: BootOptions = {}): Promise<RuntimeHarness> {
  const root = mkdtempSync(join(tmpdir(), 'dsh-desktop-'))
  const home = options.reuse?.home ?? join(root, 'home')
  const sessionsRoot = options.reuse?.sessionsRoot ?? join(root, 'sessions')
  const workspace = options.reuse?.workspace ?? join(root, 'workspace')
  mkdirSync(home, { recursive: true })
  mkdirSync(workspace, { recursive: true })

  const fixture = options.fixture ?? 'm1a-approve'
  const saved = {
    home: process.env['DSH_HOME'],
    sessions: process.env['DSH_SESSION_ROOT'],
    cwd: process.env['DSH_CWD'],
    fixture: process.env['DSH_SNAPSHOT_FILE'],
  }
  process.env['DSH_HOME'] = home
  process.env['DSH_SESSION_ROOT'] = sessionsRoot
  process.env['DSH_CWD'] = workspace
  process.env['DSH_SNAPSHOT_FILE'] = join(FIXTURES_ROOT, fixture, 'session.jsonl')

  const input = new PassThrough()
  const output = new PassThrough()
  const lines: Record<string, unknown>[] = []
  const exits: number[] = []
  const pending: (() => void)[] = []
  let rawOutput = ''
  const drain = (): void => {
    const parts = rawOutput.split('\n')
    rawOutput = parts.pop() ?? ''
    for (const part of parts) {
      if (part.trim() === '') continue
      lines.push(JSON.parse(part) as Record<string, unknown>)
    }
    for (const wake of pending.splice(0)) wake()
  }
  output.on('data', (chunk: Buffer) => {
    rawOutput += chunk.toString('utf8')
    drain()
  })

  const ctx = await boot('dsh-desktop-runtime-test', SNAPSHOT_CONFIG, undefined, (prepare: Context) => {
    prepare.provide('desktopRuntimeLaunch', {
      input,
      output,
      exit: (code: number) => { exits.push(code) },
    })
  })

  const waitLine = async (): Promise<Record<string, unknown>> => {
    if (lines.length === 0) {
      await new Promise<void>((resolvePromise) => { pending.push(resolvePromise) })
      drain()
    }
    if (lines.length === 0) throw new Error('no line arrived')
    return lines.shift() as Record<string, unknown>
  }

  const harness: RuntimeHarness = {
    ctx,
    home,
    sessionsRoot,
    workspace,
    lines,
    exits,
    request: (method: string, params?: unknown, id = 'req') => {
      input.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    },
    waitLine,
    waitLineWhere: async (match: (line: Record<string, unknown>) => boolean) => {
      for (;;) {
        const line = await waitLine()
        if (match(line)) return line
      }
    },
    waitResponse: async (id: string) => harness.waitLineWhere(line => line.id === id),
    dispose: async () => {
      input.destroy()
      output.destroy()
      await ctx.fiber.dispose()
      process.env['DSH_HOME'] = saved.home
      process.env['DSH_SESSION_ROOT'] = saved.sessions
      process.env['DSH_CWD'] = saved.cwd
      process.env['DSH_SNAPSHOT_FILE'] = saved.fixture
      if (options.reuse === undefined) rmSync(root, { recursive: true, force: true })
    },
  }
  return harness
}
