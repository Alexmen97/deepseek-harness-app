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

/** One coalesced workspace invalidation batch from the native watcher. */
export interface DesktopWorkspaceChanged {
  /** The runtime generation the batch belongs to; stale generations drop. */
  generation: number
  /** Workspace-relative paths that *may* have changed (path-only, not authoritative). */
  paths: string[]
  /** True when the flood cap truncated the batch; treat every surface as stale. */
  full?: boolean
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
  /** List one directory level under the workspace (M4 file explorer). */
  fsList(path: string): Promise<DesktopFsEntry[]>
  /** Read one workspace file as a size-capped UTF-8 preview. */
  fsReadText(path: string): Promise<string>
  /** Reveal one workspace file or directory in Finder. */
  revealInPath(path: string): Promise<void>
  /** Structured read-only git status for the workspace. */
  gitStatus(): Promise<DesktopGitStatus>
  /** Read-only unified diff plus untracked paths for the workspace. */
  gitDiff(): Promise<DesktopGitDiff>

  /** Structured read-only git status (porcelain v2 model) for the workspace. */
  gitStatusV2(): Promise<DesktopGitStatusV2>
  /** Stage one workspace file (git add -A -- <path>); rejects with DesktopGitError. */
  gitStageFile(path: string): Promise<void>
  /** Unstage one workspace file (git restore --staged / rm --cached); rejects with DesktopGitError. */
  gitUnstageFile(path: string): Promise<void>
  /** Discard one tracked worktree change (git restore --worktree -- <path>); rejects with DesktopGitError. */
  gitDiscardFile(path: string): Promise<void>
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
  /** Rebuild the native menu with the resolved desktop language (one of seven). */
  setMenuLanguage(language: string): Promise<void>
  /** Show one native notification (privacy-minimal copy). */
  notify(kind: string, title: string, body: string): Promise<void>
  /** Subscribe to window focus changes; the listener receives focused (true/false). */
  subscribeFocus(listener: (focused: boolean) => void): () => void
  /** One user-selected image returned by the native attachment picker. */
  pickAttachments(): Promise<Array<{ name: string; mediaType: string; data: string }>>
  /** The manager's current lifecycle snapshot (boot anchor after missed events). */
  runtimeStatus(): Promise<DesktopRuntimeLifecycle>
  /** Subscribe to native workspace invalidation batches; the disposer unsubscribes. */
  subscribeWorkspaceChanged(listener: (event: DesktopWorkspaceChanged) => void): () => void
  /** Arm or disarm the unsaved-changes quit guard (frontend keeps it in sync). */
  quitGuardArm(armed: boolean): Promise<void>
  /** Subscribe to quit-guard pause requests; the disposer unsubscribes. */
  subscribeQuitGuard(listener: (generation: number) => void): () => void
  /** Final quit after the frontend resolved unsaved changes. */
  quitNow(): Promise<void>
  /** Workspace file index for Quick Open (git-aware, honors .gitignore). */
  workspaceFiles(): Promise<string[]>
}

/** One directory entry from the M4 file explorer. */
export interface DesktopFsEntry {
  name: string
  path: string
  isDir: boolean
}

/** Structured read-only git status result. */
export interface DesktopGitStatus {
  repository: boolean
  reason?: 'git-not-found' | 'no-repository'
  branch?: string
  dirty?: boolean
  changedFiles?: number
  files?: Array<{ path: string; status: string }>
}

/** Read-only git diff result. */
export interface DesktopGitDiff {
  repository: boolean
  reason?: 'git-not-found' | 'no-repository'
  diff?: string
  untracked?: string[]
}

/** One M5C porcelain-v2 status entry (rename entries carry the original path). */
export interface DesktopGitStatusV2Entry {
  path: string
  originalPath?: string
  status: string
  /** True for porcelain v2 'u' (conflicted) entries; rendered read-only. */
  conflicted?: boolean
}

/** Structured read-only git status result (M5C porcelain v2 model). */
export interface DesktopGitStatusV2 {
  repository: boolean
  reason?: 'git-not-found' | 'no-repository'
  branch?: string
  dirty?: boolean
  changedFiles?: number
  files?: DesktopGitStatusV2Entry[]
  /** Workspace path relative to the repository root ('' when equal); porcelain paths are repo-root-relative. */
  workspacePrefix?: string
}

/** Typed error from the M5C.2 git mutation commands; the frontend never parses raw git stderr. */
export interface DesktopGitError {
  /**
   * Stable category: GIT_NOT_FOUND, NOT_GIT_REPOSITORY, PATH_OUTSIDE_WORKSPACE,
   * PATH_NOT_FOUND, UNSUPPORTED_GIT_STATE, GIT_OPERATION_FAILED, WORKSPACE_UNAVAILABLE,
   * GIT_STATE_CHANGED, DIRTY_EDITOR_BLOCK (the latter is a frontend-only UI guard).
   */
  code: string
  message: string
  detail?: string
}

/** The installed production/test bindings; apps/desktop installs the Tauri bindings before boot. */
export interface DesktopBindings {
  transport: DesktopTransport
  host: DesktopHost
}

let bindings: DesktopBindings | undefined

/**
 * Install the platform bindings (Tauri in production, scripted fakes in tests).
 * @param next - the bindings the desktop entry provides before boot.
 */
export function installDesktopBindings(next: DesktopBindings): void {
  bindings = next
}

/**
 * The installed bindings; throws with an actionable message before installation.
 * @returns the installed platform bindings.
 */
export function desktopBindings(): DesktopBindings {
  if (bindings === undefined) throw new Error('desktop bindings are not installed; the desktop entry must call installDesktopBindings before boot')
  return bindings
}
