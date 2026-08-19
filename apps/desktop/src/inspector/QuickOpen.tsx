/** Quick Open palette overlay (Cmd+P): fuzzy workspace-file search. */

import { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { desktopPalette, useDesktopAppearance, useDesktopStrings } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { choose, closeQuickOpen, moveSelection, setQuery, useQuickOpenState } from './quick-open.ts'

export function QuickOpen(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const quick = useQuickOpenState()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (quick.open) inputRef.current?.focus()
  }, [quick.open])

  useEffect(() => {
    if (!quick.open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveSelection(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveSelection(-1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        void choose()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        closeQuickOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [quick.open])

  if (!quick.open) return <></>

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', justifyContent: 'center', paddingTop: '12vh' }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickOpen() }}
    >
      <div style={{ width: 560, maxWidth: '90vw', background: palette.dialog, border: '1px solid ' + palette.inputBorder, borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <input
          ref={inputRef}
          value={quick.query}
          onChange={(event) => { setQuery(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              closeQuickOpen()
            }
          }}
          placeholder={t('quickOpen.placeholder')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 14, background: palette.input, color: palette.text, border: 'none', outline: 'none', borderBottom: '1px solid ' + palette.inputBorder }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: 4 }}>
          {quick.indexing
            ? <div style={{ padding: 10, color: palette.muted, fontSize: 12 }}>{t('quickOpen.indexing')}</div>
            : quick.error !== undefined
              ? <div style={{ padding: 10, color: palette.muted, fontSize: 12 }}>{quick.error}</div>
              : quick.matches.length === 0
                ? <div style={{ padding: 10, color: palette.muted, fontSize: 12 }}>{quick.query === '' ? t('quickOpen.empty') : t('quickOpen.noMatch')}</div>
                : quick.matches.map((match, index) => {
                  const active = index === quick.selection
                  return (
                    <div
                      key={match.entry.path}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        moveSelection(index - quick.selection)
                        void choose()
                      }}
                      style={{ display: 'flex', gap: 10, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: active ? palette.inputBorder : 'transparent', color: palette.text, fontSize: 13 }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.entry.name}</span>
                      <span style={{ marginLeft: 'auto', color: palette.muted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{match.entry.path}</span>
                    </div>
                  )
                })}
        </div>
        <div style={{ padding: '6px 12px', borderTop: '1px solid ' + palette.inputBorder, color: palette.muted, fontSize: 11 }}>
          {t('quickOpen.hint')}
        </div>
      </div>
    </div>
  )
}
