/** M4/M5C working-tree changes: porcelain-v2 status model with the Staged
 * Changes / Changes split and per-file Stage / Unstage / Discard actions
 * (M5C.2 stage/unstage, M5C.3 tracked-worktree discard with confirmation).
 * Hunk operations and commit flows are out of scope. */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings, type DesktopGitError } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { parseDiff, statusCategory } from './diff.ts'
import { actionsFor, discardBlockedReason, hasStagedSide, sortChanges, splitGitStatus, stageDirtyWarning, type GitChangeEntry } from './git-model.ts'
import { createChangesCore, type ChangesCore } from './changes-core.ts'
import { onFilesInvalidated } from './filesync.ts'
import { getEditorState, useEditorState } from './editorStore.ts'

let core: ChangesCore | undefined
const getCore = (): ChangesCore => {
  if (core === undefined) {
    const host = desktopBindings().host
    core = createChangesCore({
      gitStatusV2: () => host.gitStatusV2().then(status => status),
      gitDiff: () => host.gitDiff().then(diff => diff),
      gitStageFile: async (path) => { await host.gitStageFile(path) },
      gitUnstageFile: async (path) => { await host.gitUnstageFile(path) },
      gitDiscardFile: async (path) => { await host.gitDiscardFile(path) },
    }, {
      // UI data-loss guard only: the Rust host validates git/path state independently.
      isDirty: path => getEditorState().buffers[path]?.status === 'dirty',
    })
  }
  return core
}

type RowAction = 'stage' | 'unstage' | 'discard'

const errorText = (t: (key: string) => string, error: DesktopGitError): string => {
  if (error.code === 'DIRTY_EDITOR_BLOCK') return t('changes.discardBlockedDirty')
  if (error.code === 'GIT_STATE_CHANGED') return t('changes.stateChanged')
  if (error.code === 'UNSUPPORTED_GIT_STATE') return t('changes.cannotDiscard')
  return t('changes.opFailed') + ': ' + error.message
}

export function ChangesTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const editor = useEditorState()
  const operations = getCore()
  const status = useSyncExternalStore(operations.subscribe, operations.getStatus)
  const diff = useSyncExternalStore(operations.subscribe, operations.getDiff)
  const ops = useSyncExternalStore(operations.subscribe, operations.getOps)
  const [confirming, setConfirming] = useState<GitChangeEntry | undefined>(undefined)

  const refresh = useCallback((): void => { void operations.refresh() }, [operations])
  useEffect(() => { void operations.refresh() }, [operations])

  // M5B live refresh: watcher invalidations re-run git status and the diff
  // in one debounced pass; git never runs per filesystem event. Stage/
  // unstage/discard refresh directly after the host operation (the watcher
  // does not own index changes; discard also refreshes git immediately).
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
  const actionButton = (entry: GitChangeEntry, action: RowAction, key: number): ReactElement => {
    const pending = ops.pending[entry.path]
    const busy = pending !== undefined
    const discardBlocked = action === 'discard' && discardBlockedReason(entry, dirtyPaths) !== undefined
    const destructive = action === 'discard'
    const label = destructive
      ? (busy && pending === 'discarding' ? t('changes.discarding') : t('changes.discard'))
      : action === 'stage'
        ? (busy && pending === 'staging' ? t('changes.staging') : t('changes.stage'))
        : (busy && pending === 'unstaging' ? t('changes.unstaging') : t('changes.unstage'))
    return (
      <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '1px 0', color: palette.text, fontSize: 12 }}>
        <span style={{ color: palette.muted, minWidth: 20 }}>{statusCategory(entry.status)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.path}</span>
        {entry.originalPath !== undefined && <span style={{ color: palette.muted, flexShrink: 0 }}>← {entry.originalPath}</span>}
        {entry.conflicted && <span style={{ color: '#d29922', flexShrink: 0 }}>{t('changes.conflicted')}</span>}
        {!entry.insideWorkspace && <span style={{ color: palette.muted, flexShrink: 0, fontSize: 11 }}>{t('changes.outsideWorkspace')}</span>}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => {
            if (action === 'discard') { setConfirming(entry); return }
            void (action === 'stage' ? operations.stage(entry.path) : operations.unstage(entry.path))
          }}
          disabled={busy || discardBlocked}
          aria-label={(destructive ? t('changes.discard') : action === 'stage' ? t('changes.stage') : t('changes.unstage')) + ' ' + entry.path}
          aria-busy={busy}
          title={destructive ? t('changes.discard') : action === 'stage' ? t('changes.stage') : t('changes.unstage')}
          style={{ background: 'transparent', border: '1px solid ' + (destructive ? '#f85149' : palette.inputBorder), color: destructive ? '#f85149' : palette.text, borderRadius: 6, fontSize: 11, padding: '1px 8px', cursor: busy || discardBlocked ? 'default' : 'pointer', opacity: busy || discardBlocked ? 0.6 : 1 }}
        >
          {label}
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
    const actionsForSection = section === 'staged' ? (actions.staged !== undefined ? [actions.staged] : []) : (actions.changes ?? [])
    const warnDirty = section === 'changes' && actions.changes?.includes('stage') === true && stageDirtyWarning(entry, dirtyPaths)
    const discardBlocked = section === 'changes' && discardBlockedReason(entry, dirtyPaths) !== undefined
    const error = ops.errors[entry.path]
    return (
      <div key={key}>
        {actionsForSection.length > 0
          ? actionsForSection.map((action, index) => actionButton(entry, action, index))
          : plainRow(entry, 0)}
        {warnDirty && <div style={{ color: '#d29922', fontSize: 11, padding: '0 0 2px 26px' }}>{t('changes.dirtyStageWarning')}</div>}
        {discardBlocked && <div style={{ color: '#d29922', fontSize: 11, padding: '0 0 2px 26px' }}>{t('changes.discardBlockedDirty')}</div>}
        {error !== undefined && <div style={{ color: '#f85149', fontSize: 11, padding: '0 0 2px 26px' }} title={error.detail}>{errorText(t as (key: string) => string, error)}</div>}
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
      {confirming !== undefined && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
          <div role="dialog" aria-modal="true" aria-label={t('changes.discardTitle')} style={{ background: palette.dialog, border: '1px solid ' + palette.inputBorder, borderRadius: 10, padding: 16, width: 420, maxWidth: '90%', color: palette.text, fontFamily: 'system-ui' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('changes.discardTitle')}</div>
            <div style={{ fontSize: 12.5, color: palette.muted, marginBottom: 8, wordBreak: 'break-all' }}>{confirming.path}</div>
            <div style={{ fontSize: 12.5, marginBottom: 14 }}>{hasStagedSide(confirming) ? t('changes.discardConsequenceStaged') : t('changes.discardConsequence')}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirming(undefined) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>{t('changes.cancel')}</button>
              <button
                onClick={() => { const path = confirming.path; setConfirming(undefined); void operations.discard(path) }}
                style={{ background: '#f85149', border: 'none', color: '#ffffff', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('changes.discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
