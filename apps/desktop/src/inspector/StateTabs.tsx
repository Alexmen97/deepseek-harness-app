/** M4 Plan / Jobs / Subagents sections over structured upstream state. */

import type { ReactElement } from 'react'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { useInspectorState } from './store.ts'

const empty = (color: string, text: string): ReactElement => (
  <div style={{ padding: 8, color, fontSize: 12 }}>{text}</div>
)

export function PlanTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const state = useInspectorState()
  const sessionId = state.activeSessionId
  const plan = sessionId !== undefined ? state.plans[sessionId] : undefined
  if (plan === undefined) return empty(palette.muted, t('plan.empty'))
  const target = plan.target === true
  const pending = plan.pending === true
  return (
    <div style={{ padding: 8, fontSize: 12, color: palette.text }}>
      <div>{pending ? t('plan.pending') : target ? t('plan.active') : t('plan.completed')}</div>
      <pre style={{ whiteSpace: 'pre-wrap', color: palette.muted, fontSize: 11.5 }}>{JSON.stringify(plan, null, 2)}</pre>
    </div>
  )
}

export function JobsTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const state = useInspectorState()
  const sessionId = state.activeSessionId
  const jobs = sessionId !== undefined ? state.jobs[sessionId] : undefined
  if (jobs === undefined || jobs.length === 0) return empty(palette.muted, t('jobs.empty'))
  const label = (status: string): string => {
    if (status === 'killed') return t('jobs.killed')
    if (status === 'failed') return t('jobs.failed')
    if (status === 'stopped' || status === 'stopping') return t('jobs.stopped')
    return status
  }
  return (
    <div style={{ padding: 8 }}>
      {jobs.map(job => (
        <div key={job.id} style={{ borderBottom: '1px solid ' + palette.inputBorder, padding: '4px 0', fontSize: 12, color: palette.text }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.label}</span>
            <span style={{ color: palette.muted }}>{label(job.status)}</span>
          </div>
          <div style={{ color: palette.muted, fontSize: 11 }}>{job.id} · {job.kind}{job.detail !== undefined ? ' · ' + job.detail : ''}</div>
        </div>
      ))}
    </div>
  )
}

export function SubagentsTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const state = useInspectorState()
  const sessionId = state.activeSessionId
  const children = sessionId !== undefined ? state.subagents[sessionId] : undefined
  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 12, color: palette.text, padding: '4px 0' }}>
        <strong>{t('subagents.main')}</strong>{sessionId !== undefined && <span style={{ color: palette.muted, fontSize: 11 }}> · {sessionId}</span>}
      </div>
      {children === undefined || children.length === 0
        ? empty(palette.muted, t('subagents.empty'))
        : children.map(child => (
          <div key={child.childId} style={{ marginLeft: 16, borderLeft: '1px solid ' + palette.inputBorder, padding: '4px 8px', fontSize: 12, color: palette.text }}>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}>{child.childId}</span>
            {child.role !== undefined && <span style={{ color: palette.muted }}> · {child.role}</span>}
            <span style={{ color: palette.muted }}> · {child.state === 'completed' ? t('subagents.completed') : t('subagents.running')}</span>
          </div>
        ))}
    </div>
  )
}
