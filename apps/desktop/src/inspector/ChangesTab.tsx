/** M4 working-tree changes and git status over the narrow host git capability. */

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings, type DesktopGitDiff, type DesktopGitStatus } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { parseDiff, statusCategory } from './diff.ts'

export function ChangesTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const host = desktopBindings().host
  const [status, setStatus] = useState<DesktopGitStatus | undefined>(undefined)
  const [diff, setDiff] = useState<DesktopGitDiff | undefined>(undefined)

  const refresh = (): void => {
    void host.gitStatus().then(setStatus).catch(() => { setStatus(undefined) })
    void host.gitDiff().then(setDiff).catch(() => { setDiff(undefined) })
  }
  useEffect(refresh, [host])

  const parsed = diff?.diff !== undefined ? parseDiff(diff.diff) : undefined
  let headerContent: ReactElement
  if (status === undefined) {
    headerContent = <span style={{ color: palette.muted }}>…</span>
  } else if (!status.repository) {
    headerContent = <span style={{ color: palette.muted }}>{status.reason === 'git-not-found' ? t('changes.gitMissing') : t('changes.noRepo')}</span>
  } else {
    headerContent = (
      <>
        <span style={{ color: palette.muted }}>{t('changes.branch')}:</span> <strong>{status.branch}</strong>
        {' · '}
        {status.dirty === true ? t('changes.filesCount').replace('{count}', String(status.changedFiles ?? 0)) : <span style={{ color: palette.muted }}>{t('changes.clean')}</span>}
      </>
    )
  }
  const line = (kind: 'header' | 'context' | 'add' | 'del', text: string, key: number): ReactElement => (
    <div key={key} style={{
      whiteSpace: 'pre',
      fontSize: 11.5,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      background: kind === 'add' ? 'rgba(46, 160, 67, 0.16)' : kind === 'del' ? 'rgba(248, 81, 73, 0.16)' : kind === 'header' ? palette.inputBorder : 'transparent',
      color: kind === 'header' ? palette.muted : palette.text,
    }}>
      {(kind === 'add' ? '+ ' : kind === 'del' ? '- ' : '  ') + text}
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '6px 8px', fontSize: 12, borderBottom: '1px solid ' + palette.inputBorder }}>
        {headerContent}
        {status?.repository === true && (
          <button onClick={refresh} style={{ float: 'right', background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>{t('files.refresh')}</button>
        )}
      </div>
      {status?.repository === true && status.files !== undefined && status.files.length > 0 && (
        <div style={{ padding: '4px 8px', fontSize: 12, borderBottom: '1px solid ' + palette.inputBorder, maxHeight: '26%', overflowY: 'auto' }}>
          {status.files.map(file => (
            <div key={file.path} style={{ display: 'flex', gap: 6, padding: '1px 0', color: palette.text }}>
              <span style={{ color: palette.muted, minWidth: 20 }}>{file.status}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</span>
              <span style={{ color: palette.muted }}>{statusCategory(file.status)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '4px 8px', fontSize: 11.5, color: palette.muted, display: 'flex', gap: 12 }}>
        <span style={{ color: '#2ea043' }}>{t('changes.added')}: {parsed?.added ?? 0}</span>
        <span style={{ color: '#f85149' }}>{t('changes.removed')}: {parsed?.removed ?? 0}</span>
        <span>{t('changes.untracked')}: {diff?.untracked?.length ?? 0}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {parsed === undefined || parsed.files.length === 0
          ? <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.empty')}</div>
          : parsed.files.map((file, fileIndex) => (
            <div key={fileIndex} style={{ marginBottom: 8 }}>
              {line('header', file.header, -fileIndex - 1)}
              {file.hunks.map((hunk, hunkIndex) => (
                <div key={hunkIndex}>
                  {line('header', hunk.header, hunkIndex)}
                  {hunk.lines.map((entry, entryIndex) => line(entry.kind, entry.text, entryIndex))}
                </div>
              ))}
            </div>
          ))}
        {diff?.untracked !== undefined && diff.untracked.length > 0 && (
          <div>
            {line('header', t('changes.untracked'), 1000000)}
            {diff.untracked.map((path, index) => line('context', path, index + 1))}
          </div>
        )}
      </div>
    </div>
  )
}
