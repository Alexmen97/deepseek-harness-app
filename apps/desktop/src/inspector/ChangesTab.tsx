/** M4/M5C working-tree changes: porcelain-v2 status model with the Staged
 * Changes / Changes split and per-file Stage / Unstage actions (M5C.2).
 * Discard, hunk operations, and commit flows are out of scope. */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { parseDiff, statusCategory } from './diff.ts'
import { actionsFor, sortChanges, splitGitStatus, stageDirtyWarning, type GitChangeEntry } from './git-model.ts'
import { createChangesCore, type ChangesCore } from './changes-core.ts'
import { onFilesInvalidated } from './filesync.ts'
import { useEditorState } from './editorStore.ts'

let core: ChangesCore | undefined
const getCore = (): ChangesCore => {
  if (core === undefined) {
    const host = desktopBindings().host
    core = createChangesCore({
      gitStatusV2: () => host.gitStatusV2().then(status => status),
      gitDiff: () => host.gitDiff().then(diff => diff),
      gitStageFile: async (path) => { await host.gitStageFile(path) },
      gitUnstageFile: async (path) => { await host.gitUnstageFile(path) },
    })
  }
  return core
}

export function ChangesTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const editor = useEditorState()
  const operations = getCore()
  const status = useSyncExternalStore(operations.subscribe, operations.getStatus)
  const diff = useSyncExternalStore(operations.subscribe, operations.getDiff)
  const ops = useSyncExternalStore(operations.subscribe, operations.getOps)

  const refresh = useCallback((): void => { void operations.refresh() }, [operations])
  useEffect(() => { void operations.refresh() }, [operations])

  // M5B live refresh: watcher invalidations re-run git status and the diff
  // in one debounced pass; git never runs per filesystem event. Stage/unstage
  // refresh directly after the host operation (the watcher does not own
  // index changes).
  useEffect(() => {
    return onFilesInvalidated(() => { refresh() })
  }, [refresh])

  const model = splitGitStatus(status)
  const parsed = diff?.diff !== undefined ? parseDiff(diff.diff) : undefined
  const dirtyPaths = useMemo(() => {
    const dirty = new Set<string>()
    for (const path of editor.order) {
      const buffer = editor.buffers[path]
      if (buffer?.status === 'dirty') dirty.add(path)
    }
    return dirty
  }, [editor])

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
  const actionButton = (entry: GitChangeEntry, action: 'stage' | 'unstage', key: number): ReactElement => {
    const pending = ops.pending[entry.path]
    const busy = pending !== undefined
    return (
      <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '1px 0', color: palette.text, fontSize: 12 }}>
        <span style={{ color: palette.muted, minWidth: 20 }}>{statusCategory(entry.status)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.path}</span>
        {entry.originalPath !== undefined && <span style={{ color: palette.muted, flexShrink: 0 }}>← {entry.originalPath}</span>}
        {entry.conflicted && <span style={{ color: '#d29922', flexShrink: 0 }}>{t('changes.conflicted')}</span>}
        {!entry.insideWorkspace && <span style={{ color: palette.muted, flexShrink: 0, fontSize: 11 }}>{t('changes.outsideWorkspace')}</span>}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => { void (action === 'stage' ? operations.stage(entry.path) : operations.unstage(entry.path)) }}
          disabled={busy}
          aria-label={action === 'stage' ? t('changes.stage') + ' ' + entry.path : t('changes.unstage') + ' ' + entry.path}
          aria-busy={busy}
          title={action === 'stage' ? t('changes.stage') : t('changes.unstage')}
          style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, fontSize: 11, padding: '1px 8px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (pending === 'staging' ? t('changes.staging') : t('changes.unstaging')) : action === 'stage' ? t('changes.stage') : t('changes.unstage')}
        </button>
      </div>
    )
  }
  const plainRow = (entry: GitChangeEntry, key: number): ReactElement => (
    <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '1px 0', color: palette.text, fontSize: 12 }}>
      <span style={{ color: palette.muted, minWidth: 20 }}>{statusCategory(entry.status)}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.path}</span>
      {entry.originalPath !== undefined && <span style={{ color: palette.muted, flexShrink: 0 }}>← {entry.originalPath}</span>}
      {entry.conflicted && <span style={{ color: '#d29922', flexShrink: 0 }}>{t('changes.conflicted')}</span>}
      {!entry.insideWorkspace && <span style={{ color: palette.muted, flexShrink: 0, fontSize: 11 }}>{t('changes.outsideWorkspace')}</span>}
    </div>
  )
  const changeRow = (entry: GitChangeEntry, section: 'staged' | 'changes', key: number): ReactElement => {
    const actions = actionsFor(entry)
    const action = section === 'staged' ? actions.staged : actions.changes
    const warnDirty = section === 'changes' && action === 'stage' && stageDirtyWarning(entry, dirtyPaths)
    const error = ops.errors[entry.path]
    return (
      <div key={key}>
        {action !== undefined
          ? actionButton(entry, action, 0)
          : plainRow(entry, 0)}
        {warnDirty && <div style={{ color: '#d29922', fontSize: 11, padding: '0 0 2px 26px' }}>{t('changes.dirtyStageWarning')}</div>}
        {error !== undefined && <div style={{ color: '#f85149', fontSize: 11, padding: '0 0 2px 26px' }} title={error.detail}>{t('changes.opFailed')}: {error.message}</div>}
      </div>
    )
  }
  const section = (title: string, rows: GitChangeEntry[], empty: string, sectionKind: 'staged' | 'changes'): ReactElement => (
    <div style={{ padding: '4px 8px', borderBottom: '1px solid ' + palette.inputBorder }}>
      <div style={{ fontSize: 11, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4, padding: '2px 0' }}>{title}</div>
      {rows.length === 0
        ? <div style={{ color: palette.muted, fontSize: 12, padding: '2px 0' }}>{empty}</div>
        : rows.map((entry, index) => changeRow(entry, sectionKind, index))}
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
        <div style={{ maxHeight: '40%', overflowY: 'auto', borderBottom: '1px solid ' + palette.inputBorder }}>
          {section(t('changes.staged'), sortChanges(model.staged), t('changes.stagedEmpty'), 'staged')}
          {section(t('changes.changes'), sortChanges([...model.unstaged, ...model.conflicted]), t('changes.empty'), 'changes')}
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
