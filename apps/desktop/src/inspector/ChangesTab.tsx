/** M4/M5C working-tree changes: porcelain-v2 status model with the Staged
 * Changes / Changes split (M5C.1, read-only rows; actions land in M5C.2+). */

import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings, type DesktopGitDiff, type DesktopGitStatusV2 } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { parseDiff, statusCategory } from './diff.ts'
import { sortChanges, splitGitStatus, type GitChangeEntry } from './git-model.ts'
import { onFilesInvalidated } from './filesync.ts'

export function ChangesTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const host = desktopBindings().host
  const [status, setStatus] = useState<DesktopGitStatusV2 | undefined>(undefined)
  const [diff, setDiff] = useState<DesktopGitDiff | undefined>(undefined)

  const refresh = useCallback((): void => {
    void host.gitStatusV2().then(setStatus).catch(() => { setStatus(undefined) })
    void host.gitDiff().then(setDiff).catch(() => { setDiff(undefined) })
  }, [host])
  useEffect(refresh, [refresh])

  // M5B live refresh: watcher invalidations re-run git status and the diff
  // in one debounced pass; git never runs per filesystem event.
  useEffect(() => {
    return onFilesInvalidated(() => { refresh() })
  }, [refresh])

  const model = splitGitStatus(status)
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
  const changeRow = (entry: GitChangeEntry, key: number): ReactElement => (
    <div key={key} style={{ display: 'flex', gap: 6, padding: '1px 0', color: palette.text, fontSize: 12 }}>
      <span style={{ color: palette.muted, minWidth: 20 }}>{statusCategory(entry.status)}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.path}</span>
      {entry.originalPath !== undefined && <span style={{ color: palette.muted, flexShrink: 0 }}>← {entry.originalPath}</span>}
      {entry.conflicted && <span style={{ color: '#d29922', flexShrink: 0 }}>{t('changes.conflicted')}</span>}
    </div>
  )
  const section = (title: string, rows: GitChangeEntry[], empty: string): ReactElement => (
    <div style={{ padding: '4px 8px', borderBottom: '1px solid ' + palette.inputBorder }}>
      <div style={{ fontSize: 11, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4, padding: '2px 0' }}>{title}</div>
      {rows.length === 0
        ? <div style={{ color: palette.muted, fontSize: 12, padding: '2px 0' }}>{empty}</div>
        : rows.map((entry, index) => changeRow(entry, index))}
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
      {model !== undefined && (
        <div style={{ maxHeight: '34%', overflowY: 'auto', borderBottom: '1px solid ' + palette.inputBorder }}>
          {section(t('changes.staged'), sortChanges(model.staged), t('changes.stagedEmpty'))}
          {section(t('changes.changes'), sortChanges([...model.unstaged, ...model.conflicted]), t('changes.empty'))}
        </div>
      )}
      <div style={{ padding: '4px 8px', fontSize: 11.5, color: palette.muted, display: 'flex', gap: 12 }}>
        <span style={{ color: '#2ea043' }}>{t('changes.added')}: {parsed?.added ?? 0}</span>
        <span style={{ color: '#f85149' }}>{t('changes.removed')}: {parsed?.removed ?? 0}</span>
        <span>{t('changes.untracked')}: {model?.untracked.length ?? diff?.untracked?.length ?? 0}</span>
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
