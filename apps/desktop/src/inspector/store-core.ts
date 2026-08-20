/** Pure M4 inspector state projection; frame application is testable without bindings. */

export interface InspectorPlan {
  target?: boolean
  [key: string]: unknown
}

export interface InspectorJob {
  id: string
  kind: string
  label: string
  status: string
  detail?: string
  startedAt: number
  finishedAt?: number
}

export interface InspectorSubagent {
  childId: string
  role?: string
  state: string
}

export interface TerminalOutput {
  terminalId: string
  kind: 'delta' | 'settled'
  text?: string
  truncated?: boolean
  status?: { kind: 'running' } | { kind: 'exited'; exitCode: number | null; signal: string | null }
}

export interface InspectorState {
  generation: number
  activeSessionId?: string
  plans: Record<string, InspectorPlan>
  jobs: Record<string, InspectorJob[]>
  subagents: Record<string, InspectorSubagent[]>
  terminals: Record<string, { terminalId: string; output: string; status: TerminalOutput['status'] }>
}

export const EMPTY_INSPECTOR: InspectorState = { generation: -1, plans: {}, jobs: {}, subagents: {}, terminals: {} }

/** One transport frame the reducer accepts (generation-tagged). */
export interface InspectorFrame {
  generation: number
  stream: 'mux' | 'host'
  payload: unknown
}

const isTerminalOutput = (payload: unknown): payload is TerminalOutput & { sessionId: string } => {
  if (typeof payload !== 'object' || payload === null) return false
  const value = payload as Record<string, unknown>
  return typeof value.terminalId === 'string' && (value.kind === 'delta' || value.kind === 'settled')
}

/** Apply one frame with generation isolation and higher-seq-wins projections. */
export function applyInspectorFrame(current: InspectorState, frame: InspectorFrame): InspectorState {
  if (frame.stream !== 'mux') return current
  const state = frame.generation !== current.generation
    ? { generation: frame.generation, plans: {}, jobs: {}, subagents: {}, terminals: {} }
    : current
  const payload = frame.payload as Record<string, unknown> | null | undefined
  // A null payload (malformed or legacy frame) must be dropped, never crash
  // on payload.type; property access on primitives is safe, so no extra
  // typeof check is needed here.
  if (payload === undefined || payload === null) return state
  if (isTerminalOutput(payload)) {
    const sessionId = payload.sessionId
    const previous = state.terminals[sessionId] ?? { terminalId: payload.terminalId, output: '', status: undefined }
    const entry = { ...previous, terminalId: payload.terminalId }
    // Fast commands can settle before the polling pump emits a delta; their final viewport is still output.
    if (typeof payload.text === 'string') entry.output += payload.text
    if (payload.kind === 'settled') entry.status = payload.status
    return { ...state, terminals: { ...state.terminals, [sessionId]: entry } }
  }
  switch (payload.type) {
    case 'session/subscribed':
      return typeof payload.sessionId === 'string' ? { ...state, activeSessionId: payload.sessionId } : state
    case 'session/jobs':
      return typeof payload.sessionId === 'string' && Array.isArray(payload.jobs)
        ? { ...state, jobs: { ...state.jobs, [payload.sessionId]: payload.jobs } }
        : state
    case 'session/projection': {
      if (typeof payload.sessionId !== 'string' || payload.key !== 'plan') return state
      const sessionId = payload.sessionId
      const previous = state.plans[sessionId]
      if (previous !== undefined && typeof previous.seq === 'number' && typeof payload.seq === 'number' && previous.seq > payload.seq) return state
      return { ...state, plans: { ...state.plans, [sessionId]: { ...(payload.value as object), seq: payload.seq } } }
    }
    case 'session/event': {
      if (typeof payload.sessionId !== 'string') return state
      const event = payload.event as Record<string, unknown> | undefined
      const type = event?.type
      if (type !== 'subagent/start' && type !== 'subagent/spawn' && type !== 'subagent/end') return state
      const childId = typeof event?.childId === 'string' ? event.childId : undefined
      if (childId === undefined) return state
      const sessionId = payload.sessionId
      const children = state.subagents[sessionId] ?? []
      const role = typeof event?.role === 'string' ? event.role : undefined
      const child: InspectorSubagent = { childId, ...(role !== undefined ? { role } : {}), state: type === 'subagent/end' ? 'completed' : 'running' }
      return { ...state, subagents: { ...state.subagents, [sessionId]: [...children.filter(item => item.childId !== childId), child] } }
    }
    default:
      return state
  }
}
