/** M4/M5C working-tree changes: porcelain-v2 status model, per-file
 * Stage / Unstage / Discard actions (M5C.2/M5C.3), and the M5C.4
 * per-file staged/unstaged diff viewer with line numbers and navigation. */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings, type DesktopGitError } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { parseDiff, statusCategory } from './diff.ts'
import { actionsFor, diffNavigationPaths, discardBlockedReason, hasStagedSide, hunkActionsFor, sortChanges, splitGitStatus, stageDirtyWarning, type GitChangeEntry } from './git-model.ts'
import { createChangesCore, type ChangesCore } from './changes-core.ts'
import { onFilesInvalidated } from './filesync.ts'
import { getEditorState, openFile, useEditorState } from './editorStore.ts'

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
      gitDiffFile: (path, cached) => host.gitDiffFile(path, cached),
      gitStageHunk: request => host.gitStageHunk(request),
      gitUnstageHunk: request => host.gitUnstageHunk(request),
      gitDiscardHunk: request => host.gitDiscardHunk(request),
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
  if (error.code === 'GIT_DIFF_STALE') return t('changes.hunkStale')
  if (error.code === 'HUNK_NOT_FOUND') return t('changes.hunkNotFound')
  if (error.code === 'HUNK_UNSUPPORTED') return t('changes.hunkUnsupported')
  if (error.code === 'HUNK_APPLY_FAILED') return t('changes.hunkApplyFailed')
  return t('changes.opFailed') + ': ' + error.message
}

export function ChangesTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const editor = useEditorState()
  const operations = getCore()
  const status = useSyncExternalStore(operations.subscribe, operations.getStatus)
  const ops = useSyncExternalStore(operations.subscribe, operations.getOps)
  const view = useSyncExternalStore(operations.subscribe, operations.getView)
  const [confirming, setConfirming] = useState<GitChangeEntry | undefined>(undefined)
  const [confirmingHunk, setConfirmingHunk] = useState<{ path: string; hunkId: string; diffToken: string } | undefined>(undefined)

  const refresh = useCallback((): void => { void operations.refresh() }, [operations])
  useEffect(() => { void operations.refresh() }, [operations])

  // M5B live refresh: watcher invalidations re-run git status; index-only
  // mutations refresh directly after the host operation.
  useEffect(() => {
    return onFilesInvalidated(() => { refresh() })
  }, [refresh])

  const model = splitGitStatus(status)
  const dirtyPaths = useMemo(() => {
    const dirty = new Set<string>()
    for (const path of editor.order) {
      const buffer = editor.buffers[path]
      if (buffer?.status === 'dirty') dirty.add(path)
    }
    return dirty
  }, [editor])

  const selectedPath = view.selectedPath
  const selectedEntry = useMemo(() => {
    if (selectedPath === undefined || model === undefined) return undefined
    return [...model.staged, ...model.unstaged, ...model.conflicted].find(entry => entry.path === selectedPath)
  }, [selectedPath, model])
  const selectedDiff = selectedPath !== undefined ? view.diffs[selectedPath]?.[view.mode] : undefined
  const selectedDiffToken = selectedDiff?.diffToken ?? ''
  const parsedSelected = selectedDiff?.diff !== undefined && !selectedDiff.binary && !selectedDiff.tooLarge && selectedDiff.diff.trim() !== ''
    ? parseDiff(selectedDiff.diff) : undefined
  const stagedAvailable = selectedEntry !== undefined && selectedEntry.status !== '??' && selectedEntry.status.charAt(0) !== '.' && !selectedEntry.conflicted
  const unstagedAvailable = selectedEntry !== undefined && (selectedEntry.status === '??' || selectedEntry.status.charAt(1) !== '.') && !selectedEntry.conflicted
  const bothModes = stagedAvailable && unstagedAvailable
  const hunkActions = selectedEntry !== undefined && selectedDiff !== undefined && !selectedDiff.binary && !selectedDiff.tooLarge
    ? hunkActionsFor(selectedEntry, view.mode) : []

  const diffFiles = useMemo(() => {
    return diffNavigationPaths(model)
  }, [model])
  const navigate = (delta: number): void => {
    if (selectedPath === undefined || diffFiles.length === 0) return
    const index = diffFiles.indexOf(selectedPath)
    const next = diffFiles[(index + delta + diffFiles.length) % diffFiles.length]
    if (next !== undefined) operations.select(next, stagedAvailable && !unstagedAvailable ? 'staged' : 'changes')
  }

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

  const diffLine = (kind: 'header' | 'context' | 'add' | 'del', text: string, oldLine: number | undefined, newLine: number | undefined, key: number): ReactElement => (
    <div key={key} style={{
      display: 'flex',
      whiteSpace: 'pre',
      fontSize: 11.5,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      background: kind === 'add' ? 'rgba(46, 160, 67, 0.16)' : kind === 'del' ? 'rgba(248, 81, 73, 0.16)' : kind === 'header' ? palette.inputBorder : 'transparent',
      color: kind === 'header' ? palette.muted : palette.text,
    }}>
      <span style={{ minWidth: 34, textAlign: 'right', paddingRight: 8, color: palette.muted, userSelect: 'none' }}>{oldLine ?? ''}</span>
      <span style={{ minWidth: 34, textAlign: 'right', paddingRight: 8, color: palette.muted, userSelect: 'none' }}>{newLine ?? ''}</span>
      <span style={{ flex: 1 }}>{(kind === 'add' ? '+ ' : kind === 'del' ? '- ' : '  ') + text}</span>
    </div>
  )

  const renderDiffPane = (): ReactElement => {
    if (selectedPath === undefined || selectedEntry === undefined) {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.diffSelectFile')}</div>
    }
    if (selectedEntry.conflicted) {
      return <div style={{ padding: 8, color: '#d29922', fontSize: 12 }}>{t('changes.conflicted')} — {t('changes.diffConflictReadOnly')}</div>
    }
    if (selectedDiff === undefined) {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.diffLoading')}</div>
    }
    if (selectedDiff.tooLarge) {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.diffTooLarge')}</div>
    }
    if (selectedDiff.binary) {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.binaryChanged')}</div>
    }
    if (selectedEntry.status === '??' && selectedDiff.diff.trim() === '') {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.untrackedNoDiff')}</div>
    }
    if (parsedSelected === undefined || parsedSelected.files.length === 0) {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{view.mode === 'staged' ? t('changes.noStagedChanges') : t('changes.noUnstagedChanges')}</div>
    }
    const file = parsedSelected.files[0]
    if (file === undefined) {
      return <div style={{ padding: 8, color: palette.muted, fontSize: 12 }}>{t('changes.noUnstagedChanges')}</div>
    }
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {file.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex}>
            {diffLine('header', hunk.header, undefined, undefined, hunkIndex * -1 - 1)}
            {hunk.lines.map((entry, entryIndex) => diffLine(entry.kind, entry.text, entry.oldLine,
              entry.newLine, hunkIndex * 100000 + entryIndex))}
            {hunkActions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '2px 8px 4px 0' }}>
                {hunkActions.map(action => hunkActionButton(action, hunk.hunkId, hunkIndex * 10 + hunkActions.indexOf(action)))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

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
      <button
        key={key}
        onClick={(event) => {
          event.stopPropagation()
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
    )
  }
  const hunkActionButton = (action: 'stage' | 'unstage' | 'discard', hunkId: string, key: number): ReactElement => {
    const path = selectedPath
    if (path === undefined || selectedDiff === undefined) return <span key={key} />
    const pending = ops.pendingHunks[path + '::' + hunkId]
    const busy = pending !== undefined
    const dirtyBlocked = action === 'discard' && dirtyPaths.has(selectedEntry?.workspacePath ?? '')
    const label = action === 'stage'
      ? (busy ? t('changes.staging') : t('changes.stageHunk'))
      : action === 'unstage'
        ? (busy ? t('changes.unstaging') : t('changes.unstageHunk'))
        : (busy ? t('changes.discarding') : t('changes.discardHunk'))
    return (
      <button
        key={key}
        onClick={(event) => {
          event.stopPropagation()
          if (action === 'discard') { setConfirmingHunk({ path, hunkId, diffToken: selectedDiffToken }); return }
          void (action === 'stage' ? operations.stageHunk(path, hunkId, selectedDiffToken) : operations.unstageHunk(path, hunkId, selectedDiffToken))
        }}
        disabled={busy || dirtyBlocked}
        title={action === 'discard' ? t('changes.discardHunk') : action === 'stage' ? t('changes.stageHunk') : t('changes.unstageHunk')}
        style={{ background: 'transparent', border: '1px solid ' + (action === 'discard' ? '#f85149' : palette.inputBorder), color: action === 'discard' ? '#f85149' : palette.text, borderRadius: 6, fontSize: 10.5, padding: '1px 8px', cursor: busy || dirtyBlocked ? 'default' : 'pointer', opacity: busy || dirtyBlocked ? 0.6 : 1 }}
      >
        {label}
      </button>
    )
  }
  const rowContent = (entry: GitChangeEntry, key: number, section: 'staged' | 'changes'): ReactElement => {
    const actions = actionsFor(entry)
    const actionsForSection = section === 'staged' ? (actions.staged !== undefined ? [actions.staged] : []) : (actions.changes ?? [])
    const warnDirty = section === 'changes' && actions.changes?.includes('stage') === true && stageDirtyWarning(entry, dirtyPaths)
    const discardBlocked = section === 'changes' && discardBlockedReason(entry, dirtyPaths) !== undefined
    const error = ops.errors[entry.path]
    const selected = entry.path === selectedPath
    return (
      <div key={key} style={{ background: selected ? palette.inputBorder : 'transparent' }}>
        <div
          role="button"
          tabIndex={0}
          aria-selected={selected}
          onClick={() => { operations.select(entry.path, section) }}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); operations.select(entry.path, section) } }}
          style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '1px 0', color: palette.text, fontSize: 12, cursor: 'pointer' }}
        >
          <span style={{ color: palette.muted, minWidth: 20 }}>{statusCategory(entry.status)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.path}</span>
          {entry.originalPath !== undefined && <span style={{ color: palette.muted, flexShrink: 0 }}>← {entry.originalPath}</span>}
          {entry.conflicted && <span style={{ color: '#d29922', flexShrink: 0 }}>{t('changes.conflicted')}</span>}
          {!entry.insideWorkspace && <span style={{ color: palette.muted, flexShrink: 0, fontSize: 11 }}>{t('changes.outsideWorkspace')}</span>}
          <span style={{ flex: 1 }} />
          {actionsForSection.map((action, index) => actionButton(entry, action, index))}
        </div>
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
        : rows.map((entry, index) => rowContent(entry, index, sectionKind))}
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
          {section(t('changes.staged'), sortChanges(model.staged), t('changes.stagedEmpty'), 'staged')}
          {section(t('changes.changes'), sortChanges([...model.unstaged, ...model.conflicted]), t('changes.empty'), 'changes')}
        </div>
      )}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid ' + palette.inputBorder, fontSize: 12 }}>
        {selectedEntry !== undefined ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>{selectedEntry.path}</strong>
            {selectedEntry.originalPath !== undefined && <span style={{ color: palette.muted }}>← {selectedEntry.originalPath}</span>}
            <span style={{ color: palette.muted }}>{statusCategory(selectedEntry.status)}</span>
            <span style={{ color: '#2ea043' }}>+{parsedSelected?.added ?? 0}</span>
            <span style={{ color: '#f85149' }}>-{parsedSelected?.removed ?? 0}</span>
            {selectedDiff?.binary === true && <span style={{ color: palette.muted }}>{t('changes.binaryChanged')}</span>}
            <span style={{ flex: 1 }} />
            {bothModes && (
              <div role="tablist" aria-label={t('changes.diffMode')} style={{ display: 'flex', border: '1px solid ' + palette.inputBorder, borderRadius: 6, overflow: 'hidden' }}>
                <button role="tab" aria-selected={view.mode === 'unstaged'} onClick={() => { operations.setMode('unstaged') }} style={{ background: view.mode === 'unstaged' ? palette.input : 'transparent', border: 'none', color: palette.text, fontSize: 11, padding: '2px 10px', cursor: 'pointer' }}>{t('changes.unstaged')}</button>
                <button role="tab" aria-selected={view.mode === 'staged'} onClick={() => { operations.setMode('staged') }} style={{ background: view.mode === 'staged' ? palette.input : 'transparent', border: 'none', color: palette.text, fontSize: 11, padding: '2px 10px', cursor: 'pointer' }}>{t('changes.staged')}</button>
              </div>
            )}
            <button onClick={() => { navigate(-1) }} disabled={diffFiles.length < 2} aria-label={t('changes.prevFile')} title={t('changes.prevFile')} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, fontSize: 11, padding: '1px 8px', cursor: 'pointer' }}>←</button>
            <button onClick={() => { navigate(1) }} disabled={diffFiles.length < 2} aria-label={t('changes.nextFile')} title={t('changes.nextFile')} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, fontSize: 11, padding: '1px 8px', cursor: 'pointer' }}>→</button>
            <button
              onClick={() => { void openFile(selectedEntry.workspacePath ?? selectedEntry.path) }}
              disabled={selectedEntry.status.charAt(1) === 'D' && selectedEntry.status.charAt(0) === '.'}
              aria-label={t('changes.openFile')}
              title={t('changes.openFile')}
              style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, fontSize: 11, padding: '1px 8px', cursor: 'pointer' }}
            >
              {t('changes.openFile')}
            </button>
          </div>
        ) : (
          <div style={{ color: palette.muted, fontSize: 12 }}>{t('changes.diffSelectFile')}</div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {renderDiffPane()}
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
      {confirmingHunk !== undefined && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
          <div role="dialog" aria-modal="true" aria-label={t('changes.discardHunkTitle')} style={{ background: palette.dialog, border: '1px solid ' + palette.inputBorder, borderRadius: 10, padding: 16, width: 420, maxWidth: '90%', color: palette.text, fontFamily: 'system-ui' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('changes.discardHunkTitle')}</div>
            <div style={{ fontSize: 12.5, color: palette.muted, marginBottom: 8, wordBreak: 'break-all' }}>{confirmingHunk.path}</div>
            <div style={{ fontSize: 12.5, marginBottom: 14 }}>{t('changes.discardHunkConsequence')}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmingHunk(undefined) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>{t('changes.cancel')}</button>
              <button
                onClick={() => {
                  const target = confirmingHunk
                  setConfirmingHunk(undefined)
                  void operations.discardHunk(target.path, target.hunkId, target.diffToken)
                }}
                style={{ background: '#f85149', border: 'none', color: '#ffffff', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('changes.discardHunk')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
