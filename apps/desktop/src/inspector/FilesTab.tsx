/** M4 file explorer and viewer over the narrow host fs capability. */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { desktopBindings, type DesktopFsEntry } from '@deepseek-ai/dsh-desktop-client'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { HighlightedLine } from './highlight.tsx'

export function FilesTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const host = desktopBindings().host
  const [entries, setEntries] = useState<DesktopFsEntry[]>([])
  const [expanded, setExpanded] = useState<Record<string, DesktopFsEntry[]>>({})
  const [openPath, setOpenPath] = useState<string | undefined>(undefined)
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')

  const load = useCallback(async (path: string): Promise<DesktopFsEntry[]> => {
    try {
      return await host.fsList(path)
    } catch {
      return []
    }
  }, [host])

  useEffect(() => {
    void load('').then(setEntries).catch(() => { setError(t('files.loadError')) })
  }, [load, t])

  const toggle = async (entry: DesktopFsEntry): Promise<void> => {
    if (!entry.isDir) {
      setOpenPath(entry.path)
      setQuery('')
      try {
        setContent(await host.fsReadText(entry.path))
        setError(undefined)
      } catch {
        setContent('')
        setError(t('files.binary'))
      }
      return
    }
    if (expanded[entry.path] !== undefined) {
      const next = Object.fromEntries(Object.entries(expanded).filter(([path]) => path !== entry.path))
      setExpanded(next)
      return
    }
    setExpanded({ ...expanded, [entry.path]: await load(entry.path) })
  }

  const filteredLines = useMemo(() => {
    if (query === '') return []
    return content.split('\n').map((line, index) => ({ index, line })).filter(({ line }) => line.includes(query))
  }, [content, query])

  const renderTree = (items: DesktopFsEntry[], depth: number): ReactElement[] => items.map(entry => (
    <div key={entry.path}>
      <button
        style={{ display: 'block', width: '100%', textAlign: 'left', background: openPath === entry.path ? palette.inputBorder : 'transparent', border: 'none', color: palette.text, padding: '2px 6px', paddingLeft: 8 + depth * 14, cursor: 'pointer', fontSize: 12, fontFamily: 'system-ui' }}
        onClick={() => { void toggle(entry) }}
      >
        {entry.isDir ? (expanded[entry.path] !== undefined ? '▾ ' : '▸ ') : '· '}
        {entry.name}
      </button>
      {entry.isDir && expanded[entry.path] !== undefined && renderTree(expanded[entry.path] as DesktopFsEntry[], depth + 1)}
    </div>
  ))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6, padding: 6 }}>
        <button onClick={() => { void load('').then(setEntries) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>
          {t('files.refresh')}
        </button>
        {openPath !== undefined && (
          <button onClick={() => { void host.revealInPath(openPath).catch(() => {}) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>
            {t('files.reveal')}
          </button>
        )}
      </div>
      <div style={{ flex: '0 0 auto', overflowY: 'auto', maxHeight: '42%', borderTop: '1px solid ' + palette.inputBorder }}>
        {entries.length === 0 ? <div style={{ color: palette.muted, padding: 8, fontSize: 12 }}>{t('files.empty')}</div> : renderTree(entries, 0)}
      </div>
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, borderTop: '1px solid ' + palette.inputBorder }}>
        {openPath !== undefined && (
          <>
            <div style={{ color: palette.muted, fontSize: 11, padding: '4px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openPath}</div>
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value) }}
              placeholder={t('files.searchPlaceholder')}
              style={{ margin: '4px 8px', padding: '4px 6px', fontSize: 12, background: palette.input, color: palette.text, border: '1px solid ' + palette.inputBorder, borderRadius: 6 }}
            />
          </>
        )}
        <div style={{ flex: 1, overflow: 'auto', fontSize: 11.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '4px 8px' }}>
          {error !== undefined
            ? <div style={{ color: palette.muted }}>{error}</div>
            : openPath === undefined
              ? <div style={{ color: palette.muted }}>{t('files.previewEmpty')}</div>
              : query === ''
                ? content.split('\n').map((line, index) => (
                  <div key={index} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: palette.muted, userSelect: 'none', minWidth: 28, textAlign: 'right' }}>{index + 1}</span>
                    <span style={{ whiteSpace: 'pre', color: palette.text }}><HighlightedLine text={line} /></span>
                  </div>
                ))
                : filteredLines.map(({ index, line }) => (
                  <div key={index} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: palette.muted, userSelect: 'none', minWidth: 28, textAlign: 'right' }}>{index + 1}</span>
                    <span style={{ whiteSpace: 'pre', color: palette.text, background: 'rgba(255, 220, 120, 0.35)' }}><HighlightedLine text={line} /></span>
                  </div>
                ))}
        </div>
      </div>
    </div>
  )
}
