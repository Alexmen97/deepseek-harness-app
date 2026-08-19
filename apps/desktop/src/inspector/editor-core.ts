/** Pure M5B editor buffer state machine; IO is injected so tests need no bindings. */

export type EditorStatus = 'loading' | 'clean' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'deleted' | 'readonly' | 'error'

export interface EditorBuffer {
  path: string
  name: string
  content: string
  version: string | undefined
  size: number | undefined
  status: EditorStatus
  message: string | undefined
}

export interface EditorState {
  visible: boolean
  activePath: string | undefined
  buffers: Record<string, EditorBuffer>
  order: string[]
}

export type EditorStat =
  | { kind: 'present'; version?: string; type?: string; size?: number }
  | { kind: 'absent'; transient?: boolean }
export type EditorRead = { ok: true; version: string; content: string } | { ok: false; code: string }
export type EditorWrite = { ok: true; version: string } | { ok: false; code: string }

export interface EditorIo {
  stat(path: string): Promise<EditorStat>
  read(path: string): Promise<EditorRead>
  write(path: string, content: string, expectedVersion?: string): Promise<EditorWrite>
}

export interface EditorCore {
  openFile(path: string): Promise<boolean>
  setContent(path: string, content: string): void
  save(path: string): Promise<void>
  saveAll(): Promise<{ ok: boolean; conflicted: string[] }>
  reload(path: string): Promise<void>
  close(path: string): void
  setActive(path: string | undefined): void
  setVisible(visible: boolean): void
  /** Reconcile one buffer against the current ctx.fs authority (watcher invalidation). */
  reconcile(path: string): Promise<void>
  /** Reconcile every open buffer (runtime reconnect / workspace revalidation). */
  reconcileAll(): Promise<void>
  /** Keep the local draft and dismiss an external-change conflict state. */
  keepChanges(path: string): void
  /** Whether any buffer holds unsaved edits (quit guard). */
  hasDirtyBuffers(): boolean
  /** Paths of buffers holding unsaved edits, in tab order. */
  dirtyPaths(): string[]
  getState(): EditorState
  subscribe(listener: () => void): () => void
  reset(): void
}

const basename = (path: string): string => path.split('/').pop() ?? path

const patch = (state: EditorState, path: string, next: Partial<EditorBuffer>): EditorState => {
  const buffer = state.buffers[path]
  if (buffer === undefined) return state
  return { ...state, buffers: { ...state.buffers, [path]: { ...buffer, ...next } } }
}

export function createEditorCore(io: EditorIo, maxBytes: number): EditorCore {
  let state: EditorState = { visible: false, activePath: undefined, buffers: {}, order: [] }
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const listener of listeners) listener() }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    reset: () => {
      state = { visible: false, activePath: undefined, buffers: {}, order: [] }
      emit()
    },
    async openFile(path) {
      const stat = await io.stat(path)
      if (stat.kind !== 'present' || stat.type !== 'file') return false
      if (stat.size !== undefined && stat.size > maxBytes) return false
      const read = await io.read(path)
      if (!read.ok) return false
      const buffer: EditorBuffer = { path, name: basename(path), content: read.content, version: read.version, size: stat.size, status: 'clean', message: undefined }
      state = {
        ...state,
        visible: true,
        activePath: path,
        buffers: { ...state.buffers, [path]: buffer },
        order: state.buffers[path] !== undefined ? state.order : [...state.order, path],
      }
      emit()
      return true
    },
    setContent(path, content) {
      const buffer = state.buffers[path]
      if (buffer === undefined || buffer.status === 'readonly' || buffer.status === 'deleted') return
      const next: EditorBuffer = { ...buffer, content, status: 'dirty', message: undefined }
      state = { ...state, buffers: { ...state.buffers, [path]: next } }
      emit()
    },
    async save(path) {
      const buffer = state.buffers[path]
      if (buffer === undefined || buffer.status === 'readonly' || buffer.status === 'deleted') return
      const mark = (next: Partial<EditorBuffer>): void => {
        state = patch(state, path, next)
        emit()
      }
      mark({ status: 'saving' })
      try {
        const result = await io.write(path, buffer.content, buffer.version)
        if (!result.ok) {
          if (result.code === 'FS_STALE_VERSION') mark({ status: 'conflict', message: result.code })
          else mark({ status: 'error', message: result.code })
          return
        }
        mark({ status: 'saved', version: result.version })
        const saved: EditorBuffer = { ...buffer, status: 'clean', version: result.version, message: undefined }
        state = { ...state, buffers: { ...state.buffers, [path]: saved } }
        emit()
      } catch (error) {
        mark({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    },
    async saveAll() {
      const conflicted: string[] = []
      for (const path of this.dirtyPaths()) {
        await this.save(path)
        const after = state.buffers[path]
        if (after === undefined || after.status === 'dirty' || after.status === 'conflict' || after.status === 'error') {
          conflicted.push(path)
        }
      }
      return { ok: conflicted.length === 0, conflicted }
    },
    async reload(path) {
      const read = await io.read(path)
      if (!read.ok) return
      const current = state.buffers[path]
      if (current === undefined) return
      const reloaded: EditorBuffer = { ...current, content: read.content, version: read.version, status: 'clean', message: undefined }
      state = { ...state, buffers: { ...state.buffers, [path]: reloaded } }
      emit()
    },
    async reconcile(path) {
      const buffer = state.buffers[path]
      if (buffer === undefined) return
      const stat = await io.stat(path)
      if (stat.kind === 'absent') {
        // A transient absence (no active session yet, e.g. right after a
        // runtime reconnect) cannot decide deletion; retry later.
        if (stat.transient === true) return
        // Deleted under the buffer: the tab stays with its content and the
        // draft survives; nothing recreates the file automatically.
        if (buffer.status !== 'deleted') {
          state = patch(state, path, { status: 'deleted', message: 'FS_NOT_FOUND' })
          emit()
        }
        return
      }
      if (buffer.status === 'deleted') {
        // The file reappeared: adopt the current content as the new baseline.
        const read = await io.read(path)
        if (!read.ok) return
        state = patch(state, path, { content: read.content, version: read.version, size: stat.size, status: 'clean', message: undefined })
        emit()
        return
      }
      if (buffer.version === stat.version) return
      const hasDraft = buffer.status === 'dirty' || buffer.status === 'saving' || buffer.status === 'saved' || buffer.status === 'error' || buffer.status === 'conflict'
      if (hasDraft) {
        // Draft preserved; surface the external change without losing it.
        if (buffer.status !== 'conflict') {
          state = patch(state, path, { status: 'conflict', message: 'FS_EXTERNAL_CHANGE' })
          emit()
        }
        return
      }
      // Clean or read-only buffer: adopt the current content (baseline V2).
      const read = await io.read(path)
      if (!read.ok) return
      state = patch(state, path, { content: read.content, version: read.version, size: stat.size, status: 'clean', message: undefined })
      emit()
    },
    async reconcileAll() {
      for (const path of [...state.order]) {
        await this.reconcile(path)
      }
    },
    keepChanges(path) {
      const buffer = state.buffers[path]
      if (buffer === undefined || buffer.status !== 'conflict') return
      state = patch(state, path, { status: 'dirty', message: undefined })
      emit()
    },
    hasDirtyBuffers() {
      return state.order.some(path => state.buffers[path]?.status === 'dirty')
    },
    dirtyPaths() {
      return state.order.filter(path => state.buffers[path]?.status === 'dirty')
    },
    close(path) {
      const next = Object.fromEntries(Object.entries(state.buffers).filter(([key]) => key !== path))
      const order = state.order.filter(entry => entry !== path)
      state = {
        ...state,
        buffers: next,
        order,
        ...(state.activePath === path
          ? order.length > 0 ? { activePath: order[order.length - 1] } : { activePath: undefined }
          : {}),
      }
      emit()
    },
    setActive(path) {
      state = { ...state, activePath: path }
      emit()
    },
    setVisible(visible) {
      state = { ...state, visible }
      emit()
    },
  }
}
