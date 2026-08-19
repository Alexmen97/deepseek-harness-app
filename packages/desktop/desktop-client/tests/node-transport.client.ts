/**
 * Node-side DesktopTransport for the host-equivalent integration path:
 * spawns the packaged runtime, owns the stdio JSON-RPC framing, answers the
 * runtime's credential requests (test double), and publishes frames/state
 * exactly like the Rust manager does for the Tauri WebView.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installDesktopBindings } from '../src/transport.ts'
import type { DesktopHost, DesktopRuntimeFrame, DesktopRuntimeLifecycle, DesktopTransport } from '../src/transport.ts'

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)))
const EXE = resolve(REPO_ROOT, 'dist-exe', 'dsh-desktop-runtime-macos-arm64')
const LIVE_CONFIG = resolve(REPO_ROOT, 'packages/desktop/desktop-runtime/runtime/cordis.yml')
const FIXTURES_ROOT = resolve(REPO_ROOT, 'packages/desktop/desktop-runtime/fixtures')

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

export interface NodeRuntimeHarness {
  transport: DesktopTransport
  workspace: string
  close(): Promise<number | null>
  cleanup(): void
}

/** Spawn the packaged runtime with the keyless replay fixture; skip when unbuilt. */
export function spawnNodeRuntime(fixture: string): NodeRuntimeHarness {
  if (!existsSync(EXE)) throw new Error('packaged runtime missing; build it first')
  const root = mkdtempSync(join(tmpdir(), 'dsh-m1b-'))
  const home = join(root, 'home')
  const sessions = join(root, 'sessions')
  const workspace = join(root, 'workspace')
  mkdirSync(home, { recursive: true })
  mkdirSync(workspace, { recursive: true })

  const child = spawn(EXE, [], {
    cwd: workspace,
    env: {
      ...process.env,
      DSH_HOME: home,
      DSH_CORDIS_CONFIG: LIVE_CONFIG,
      DSH_SNAPSHOT: 'replay',
      DSH_SNAPSHOT_FILE: join(FIXTURES_ROOT, fixture, 'session.jsonl'),
      DSH_SESSION_ROOT: sessions,
      DSH_CWD: workspace,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const pending = new Map<string, Pending>()
  const frameHandlers = new Set<(frame: DesktopRuntimeFrame) => void>()
  const stateHandlers = new Set<(state: DesktopRuntimeLifecycle) => void>()
  let generation = 0
  let raw = ''
  const onLine = (line: string): void => {
    const trimmed = line.trim()
    if (trimmed === '') return
    let value: Record<string, unknown>
    try {
      value = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return
    }
    const id = typeof value.id === 'string' ? value.id : undefined
    const method = typeof value.method === 'string' ? value.method : undefined
    if (id !== undefined && method !== undefined) {
      // Server-initiated request: credential test double.
      const response = method.startsWith('desktop/credential-')
        ? { jsonrpc: '2.0', id, result: method === 'desktop/credential-resolve' ? { value: process.env.DSH_TEST_CREDENTIAL } : {} }
        : { jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found' } }
      child.stdin.write(JSON.stringify(response) + '\n')
      return
    }
    if (id !== undefined) {
      const waiter = pending.get(id)
      if (waiter === undefined) return
      pending.delete(id)
      if (value.error !== undefined) waiter.reject(new Error(JSON.stringify(value.error)))
      else waiter.resolve(value.result)
      return
    }
    if (method !== undefined) {
      const params = (value.params ?? {}) as { rpcId?: string; payload?: Record<string, unknown>; state?: string }
      if (method === 'desktop.status') {
        generation += 1
        const state: DesktopRuntimeLifecycle = { state: params.state === 'ready' ? 'running' : 'starting', generation }
        for (const handler of stateHandlers) handler(state)
        return
      }
      const stream = method === 'events.host' ? 'host' : 'mux'
      const frame: DesktopRuntimeFrame = {
        generation,
        stream,
        rpcId: params.rpcId ?? '',
        payload: params.payload ?? {},
      }
      for (const handler of frameHandlers) handler(frame)
    }
  }
  child.stdout.on('data', (chunk: Buffer) => {
    raw += chunk.toString('utf8')
    const parts = raw.split('\n')
    raw = parts.pop() ?? ''
    for (const line of parts) onLine(line)
  })
  child.stderr.resume()

  let counter = 0
  const transport: DesktopTransport = {
    request: (request) => {
      const id = 'r' + String(++counter)
      const params = request.method === 'respond' || request.method.startsWith('desktop.')
        ? request.payload
        : { rpcId: request.rpcId, payload: request.payload }
      const response = new Promise<unknown>((resolve, reject) => { pending.set(id, { resolve, reject }) })
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method: request.method, params }) + '\n')
      return response
    },
    subscribeFrames: (handler) => {
      frameHandlers.add(handler)
      return () => { frameHandlers.delete(handler) }
    },
    subscribeState: (handler) => {
      stateHandlers.add(handler)
      return () => { stateHandlers.delete(handler) }
    },
  }

  const exited = new Promise<number | null>((resolve) => { child.once('exit', (code) => { resolve(code) }) })
  // The DesktopApiClient lazily reads the workspace for desktop.initialize;
  // bind a scripted host so the runtime records the same cwd it launched in.
  const host: DesktopHost = {
    pickWorkspace: async () => null,
    credentialStatus: async () => ({ configured: false }),
    credentialSet: async () => {},
    credentialDelete: async () => {},
    fsList: async () => [],
    fsReadText: async () => '',
    revealInPath: async () => {},
    gitStatus: async () => ({ repository: false }),
    gitStageFile: async () => {},
    gitUnstageFile: async () => {},
    gitStatusV2: async () => ({ repository: false }),
    gitDiff: async () => ({ repository: false }),
    openLogs: async () => {},
    openExternal: async () => {},
    prefsGet: async key => key === 'workspace' ? workspace : undefined,
    prefsSet: async () => {},
    restartRuntime: async () => {},
    stopRuntime: async () => {},
    diagnostics: async () => ({}),
    setMenuLanguage: async () => {},
    notify: async () => {},
    subscribeFocus: () => () => {},
    pickAttachments: async () => [],
    runtimeStatus: async () => ({ state: 'stopped', generation: 0 }),
    subscribeWorkspaceChanged: () => () => {},
    quitGuardArm: async () => {},
    subscribeQuitGuard: () => () => {},
    quitNow: async () => {},
    workspaceFiles: async () => [],
  }
  installDesktopBindings({ transport, host })
  return {
    transport,
    workspace,
    close: async () => {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 'shutdown', method: 'desktop.shutdown', params: {} }) + '\n')
      const code = await exited
      child.stdin.end()
      return code
    },
    cleanup: () => { rmSync(root, { recursive: true, force: true }) },
  }
}
