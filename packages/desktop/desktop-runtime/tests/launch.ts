/**
 * Subprocess launcher for desktop runtime tests: spawns the built bin (or a
 * caller-supplied command) with the snapshot composition and a keyless replay
 * fixture, and speaks newline-delimited JSON-RPC over the child stdio. The
 * repo's loader-based tests run the Loader in a child process the same way;
 * booting the Loader inside vitest would drag every plugin import through the
 * test transformer.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Writable } from 'node:stream'

const RUNTIME_ROOT = fileURLToPath(new URL('..', import.meta.url))
const LIVE_CONFIG = join(RUNTIME_ROOT, 'runtime', 'cordis.yml')
const FIXTURES_ROOT = join(RUNTIME_ROOT, 'fixtures')

/** One spawned desktop runtime and its temp roots. */
export interface LaunchedRuntime {
  client: ExeClient
  child: ChildProcessWithoutNullStreams
  home: string
  sessionsRoot: string
  workspace: string
  /** Captured stderr text. */
  stderr: string
  /** Exit code promise; resolves when the child exits. */
  exited: Promise<number | null>
  /** End stdin (cooperative shutdown) and wait for exit. */
  close(): Promise<number | null>
  /** Remove temp roots. */
  cleanup(): void
}

/** Launch options for the desktop runtime subprocess. */
export interface LaunchOptions {
  /** Fixture directory name under fixtures/; defaults to m1a-approve. */
  fixture?: string
  /** Reuse an earlier launch's roots (restart-simulation tests). */
  reuse?: { home: string; sessionsRoot: string; workspace: string }
  /** Command and args overriding the built bin (the packaged exe). */
  command?: string
  args?: string[]
  /** Extra environment layered over the launch environment. */
  env?: NodeJS.ProcessEnv
}

/** Minimal newline-delimited JSON-RPC client over the child stdio. */
export class ExeClient {
  private raw = ''
  private readonly lines: Record<string, unknown>[] = []
  private readonly pending: (() => void)[] = []
  readonly stderr = ''

  constructor(private readonly stdin: Writable) {}

  onStdout(chunk: Buffer): void {
    this.raw += chunk.toString('utf8')
    const parts = this.raw.split('\n')
    this.raw = parts.pop() ?? ''
    for (const part of parts) {
      if (part.trim() === '') continue
      this.lines.push(JSON.parse(part) as Record<string, unknown>)
    }
    for (const wake of this.pending.splice(0)) wake()
  }

  request(method: string, params?: unknown, id = 'req'): void {
    this.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  }

  async waitLine(): Promise<Record<string, unknown>> {
    if (this.lines.length === 0) {
      await new Promise<void>((resolvePromise) => { this.pending.push(resolvePromise) })
    }
    if (this.lines.length === 0) throw new Error('no line arrived')
    return this.lines.shift() as Record<string, unknown>
  }

  async waitResponse(id: string): Promise<Record<string, unknown>> {
    for (;;) {
      const line = await this.waitLine()
      if (line.id === id) return line
    }
  }

  async waitMuxFrame(type: string): Promise<{ line: Record<string, unknown>; payload: Record<string, unknown> }> {
    for (;;) {
      const line = await this.waitLine()
      if (line.method !== 'events.mux') continue
      const params = line.params as { payload?: Record<string, unknown> } | undefined
      if (params?.payload?.type === type) return { line, payload: params.payload }
    }
  }

  async waitSessionEvent(type: string): Promise<Record<string, unknown>> {
    for (;;) {
      const line = await this.waitLine()
      if (line.method !== 'events.mux') continue
      const params = line.params as { payload?: { type?: string; event?: Record<string, unknown> } } | undefined
      if (params?.payload?.type === 'session/event' && params.payload.event?.type === type) {
        return params.payload.event
      }
    }
  }
}

/** Spawn the built desktop runtime bin against the snapshot composition. */
export function launchRuntime(options: LaunchOptions = {}): LaunchedRuntime {
  const root = mkdtempSync(join(tmpdir(), 'dsh-desktop-'))
  const home = options.reuse?.home ?? join(root, 'home')
  const sessionsRoot = options.reuse?.sessionsRoot ?? join(root, 'sessions')
  const workspace = options.reuse?.workspace ?? join(root, 'workspace')
  mkdirSync(home, { recursive: true })
  mkdirSync(workspace, { recursive: true })

  const command = options.command ?? process.execPath
  const args = options.args ?? [join(RUNTIME_ROOT, 'lib', 'bin.js')]
  // The child is a plain Node process: strip vitest's worker environment
  // (loader hooks and VITEST_* variables) so its Loader boots like production.
  const cleanEnv: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('VITEST_') || key === 'NODE_OPTIONS') continue
    if (value !== undefined) cleanEnv[key] = value
  }
  const child = spawn(command, args, {
    cwd: workspace,
    env: {
      ...cleanEnv,
      DSH_HOME: home,
      DSH_CORDIS_CONFIG: LIVE_CONFIG,
      DSH_SNAPSHOT: 'replay',
      DSH_SNAPSHOT_FILE: join(FIXTURES_ROOT, options.fixture ?? 'm1a-approve', 'session.jsonl'),
      DSH_SESSION_ROOT: sessionsRoot,
      DSH_CWD: workspace,
      ...options.env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const client = new ExeClient(child.stdin)
  child.stdout.on('data', (chunk: Buffer) => { client.onStdout(chunk) })
  let stderr = ''
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
  const exited = new Promise<number | null>((resolvePromise) => {
    child.once('exit', (code) => { resolvePromise(code) })
  })
  return {
    client,
    child,
    home,
    sessionsRoot,
    workspace,
    get stderr() { return stderr },
    exited,
    close: async () => {
      child.stdin.end()
      return exited
    },
    cleanup: () => {
      if (options.reuse === undefined) rmSync(root, { recursive: true, force: true })
    },
  }
}
