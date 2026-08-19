/** Unsaved-changes quit dialog: Cancel, Discard and Quit, Save All and Quit. */

import type { ReactElement } from 'react'
import { desktopPalette, useDesktopAppearance, useDesktopStrings } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { cancelQuit, discardAndQuit, saveAllAndQuit, useQuitGuardState } from './quit-guard.ts'

export function QuitGuardDialog(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const guard = useQuitGuardState()

  if (!guard.requested) return <></>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, fontFamily: 'system-ui' }}>
      <div style={{ background: palette.dialog, border: '1px solid ' + palette.inputBorder, borderRadius: 10, padding: 18, minWidth: 360, maxWidth: 520, fontSize: 13, color: palette.text }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('quitGuard.title')}</div>
        <div style={{ color: palette.muted, marginBottom: 4 }}>{t('quitGuard.body')}</div>
        {guard.saveFailed && <div style={{ color: '#f85149', marginTop: 8 }}>{t('quitGuard.saveFailed')}</div>}
        <div style={{ margin: '10px 0 4px', fontSize: 11.5, color: palette.muted, maxHeight: 120, overflowY: 'auto' }}>
          {guard.dirtyPaths.slice(0, 8).map(path => <div key={path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</div>)}
          {guard.dirtyPaths.length > 8 && <div>… {guard.dirtyPaths.length - 8} more</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={cancelQuit} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>{t('quitGuard.cancel')}</button>
          <button onClick={() => { void discardAndQuit() }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>{t('quitGuard.discard')}</button>
          <button onClick={() => { void saveAllAndQuit() }} style={{ background: '#2f6fed', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>{t('quitGuard.saveAll')}</button>
        </div>
      </div>
    </div>
  )
}
