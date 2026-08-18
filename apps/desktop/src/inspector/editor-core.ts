/** Pure M5A editor buffer state machine; IO is injected so tests need no bindings. */

export type EditorStatus = 'loading' | 'clean' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'readonly' | 'error'

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

export type EditorStat = { kind: 'present'; type?: string; size?: number } | { kind: 'absent' }
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
  reload(path: string): Promise<void>
  close(path: string): void
  setActive(path: string | undefined): void
  setVisible(visible: boolean): void
  getState(): EditorState
  subscribe(listener: () => void): () => void
  reset(): void
}

const basename = (path: string): string => path.split('/').pop() ?? path

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
      if (buffer === undefined || buffer.status === 'readonly') return
      const next: EditorBuffer = { ...buffer, content, status: 'dirty', message: undefined }
      state = { ...state, buffers: { ...state.buffers, [path]: next } }
      emit()
    },
    async save(path) {
      const buffer = state.buffers[path]
      if (buffer === undefined || buffer.status === 'readonly') return
      const mark = (next: Partial<EditorBuffer>): void => {
        state = { ...state, buffers: { ...state.buffers, [path]: { ...buffer, ...next } } }
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
    async reload(path) {
      const read = await io.read(path)
      if (!read.ok) return
      const current = state.buffers[path]
      if (current === undefined) return
      const reloaded: EditorBuffer = { ...current, content: read.content, version: read.version, status: 'clean', message: undefined }
      state = { ...state, buffers: { ...state.buffers, [path]: reloaded } }
      emit()
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
