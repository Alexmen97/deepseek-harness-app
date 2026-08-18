/** M4 Inspector: the collapsible coding-experience side panel. */

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { FilesTab } from './FilesTab.tsx'
import { ChangesTab } from './ChangesTab.tsx'
import { TerminalTab } from './TerminalTab.tsx'
import { JobsTab, PlanTab, SubagentsTab } from './StateTabs.tsx'

export type InspectorTab = 'files' | 'changes' | 'terminal' | 'plan' | 'jobs' | 'subagents'

const TABS: Array<{ id: InspectorTab; key: 'inspector.files' | 'inspector.changes' | 'inspector.terminal' | 'inspector.plan' | 'inspector.jobs' | 'inspector.subagents' }> = [
  { id: 'files', key: 'inspector.files' },
  { id: 'changes', key: 'inspector.changes' },
  { id: 'terminal', key: 'inspector.terminal' },
  { id: 'plan', key: 'inspector.plan' },
  { id: 'jobs', key: 'inspector.jobs' },
  { id: 'subagents', key: 'inspector.subagents' },
]

export function Inspector(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const host = desktopBindings().host
  const [tab, setTab] = useState<InspectorTab>('files')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    void host.prefsGet('inspector.tab').then((value) => {
      if (TABS.some(entry => entry.id === value)) setTab(value as InspectorTab)
    }).catch(() => {})
    void host.prefsGet('inspector.visible').then((value) => {
      if (value === 'false') setVisible(false)
    }).catch(() => {})
  }, [host])

  const selectTab = (next: InspectorTab): void => {
    setTab(next)
    void host.prefsSet('inspector.tab', next).catch(() => {})
  }
  const toggleVisible = (): void => {
    const next = !visible
    setVisible(next)
    void host.prefsSet('inspector.visible', String(next)).catch(() => {})
  }

  if (!visible) {
    return (
      <button
        onClick={toggleVisible}
        title={t('inspector.toggle')}
        style={{ position: 'fixed', right: 0, top: 10, zIndex: 1000, background: palette.dialog, color: palette.text, border: '1px solid ' + palette.inputBorder, borderRight: 'none', borderRadius: '8px 0 0 8px', padding: '8px 6px', cursor: 'pointer', fontSize: 12 }}
      >
        ◂
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 380,
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      background: palette.dialog,
      borderLeft: '1px solid ' + palette.inputBorder,
      color: palette.text,
      fontFamily: 'system-ui',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid ' + palette.inputBorder }}>
        {TABS.map(entry => (
          <button
            key={entry.id}
            onClick={() => { selectTab(entry.id) }}
            style={{
              flex: 1,
              padding: '6px 2px',
              fontSize: 11.5,
              cursor: 'pointer',
              background: tab === entry.id ? palette.input : 'transparent',
              border: 'none',
              borderBottom: tab === entry.id ? '2px solid #2f6fed' : '2px solid transparent',
              color: palette.text,
            }}
          >
            {t(entry.key)}
          </button>
        ))}
        <button onClick={toggleVisible} title={t('inspector.toggle')} style={{ background: 'transparent', border: 'none', color: palette.muted, cursor: 'pointer', padding: '0 8px', fontSize: 13 }}>
          ▸
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'files' && <FilesTab />}
        {tab === 'changes' && <ChangesTab />}
        {tab === 'terminal' && <TerminalTab />}
        {tab === 'plan' && <PlanTab />}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'subagents' && <SubagentsTab />}
      </div>
    </div>
  )
}
