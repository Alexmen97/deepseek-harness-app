/**
 * The platform transport seam between the desktop client and the Rust host.
 * Production binds to the Tauri IPC (invoke + event listeners); carrier tests
 * install a scripted implementation through installDesktopTransport.
 */

/** One runtime lifecycle snapshot published by the Rust manager. */
export interface DesktopRuntimeLifecycle {
  state: 'stopped' | 'starting' | 'running' | 'restarting' | 'failed' | 'stopping'
  generation: number
  reason?: string
}

/** One runtime frame delivered from the Rust manager (mux or host stream). */
export interface DesktopRuntimeFrame {
  generation: number
  stream: 'mux' | 'host'
  rpcId: string
  payload: unknown
}

/** One unary request over the typed desktop wire. */
export interface DesktopTransportRequest {
  /** apiproxy method key, or 'respond'. */
  method: string
  /** Client-minted rpcId echoed by the runtime. */
  rpcId: string
  /** The apiproxy payload; for respond, the complete ClientResponse object. */
  payload: unknown
  /** The transport generation the request must run on; stale requests reject. */
  generation: number
}

/** Credential status reported by the Rust host; never carries the secret. */
export interface DesktopCredentialStatus {
  configured: boolean
  source?: 'keychain' | 'env'
}

/** The platform transport the desktop client drives. */
export interface DesktopTransport {
  /** Send one unary request and await the runtime result or receipt. */
  request(request: DesktopTransportRequest): Promise<unknown>
  /** Subscribe to runtime frames; the disposer unsubscribes. */
  subscribeFrames(handler: (frame: DesktopRuntimeFrame) => void): () => void
  /** Subscribe to runtime lifecycle state; the disposer unsubscribes. */
  subscribeState(handler: (state: DesktopRuntimeLifecycle) => void): () => void
}

/** Host capabilities (native operations the Rust layer owns). */
export interface DesktopHost {
  /** Open the native macOS directory picker; null on cancellation. */
  pickWorkspace(): Promise<string | null>
  /** Report one credential's configured state; never the value. */
  credentialStatus(ref: string): Promise<DesktopCredentialStatus>
  /** Store one credential in the macOS Keychain. */
  credentialSet(ref: string, value: string): Promise<void>
  /** Delete one credential from the macOS Keychain. */
  credentialDelete(ref: string): Promise<void>
  /** Reveal the runtime log files in the system viewer. */
  openLogs(): Promise<void>
  /** Open an external URL in the system browser. */
  openExternal(url: string): Promise<void>
  /** Read one desktop preference. */
  prefsGet(key: string): Promise<string | undefined>
  /** Write one desktop preference. */
  prefsSet(key: string, value: string): Promise<void>
  /** Ask the Rust manager to restart the runtime. */
  restartRuntime(): Promise<void>
  /** Stop the runtime (graceful). */
  stopRuntime(): Promise<void>
  /** Render a redacted diagnostics summary. */
  diagnostics(): Promise<Record<string, string>>
}

/** The installed production/test bindings; apps/desktop installs the Tauri bindings before boot. */
export interface DesktopBindings {
  transport: DesktopTransport
  host: DesktopHost
}

let bindings: DesktopBindings | undefined

/** Install the platform bindings (Tauri in production, scripted fakes in tests). */
export function installDesktopBindings(next: DesktopBindings): void {
  bindings = next
}

/** The installed bindings; throws with an actionable message before installation. */
export function desktopBindings(): DesktopBindings {
  if (bindings === undefined) throw new Error('desktop bindings are not installed; the desktop entry must call installDesktopBindings before boot')
  return bindings
}
