/** M5A editor surface: CodeMirror 6 buffers, tabs, save, and conflict UX. */

import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { Annotation, EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'
import { rust } from '@codemirror/lang-rust'
import { useDesktopStrings, desktopPalette, useDesktopAppearance, type DesktopStringKey } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { useEditorState, setBufferContent, saveBuffer, saveAllBuffers, reloadBuffer, keepBufferChanges, closeBuffer, setActiveBuffer, setEditorVisible, type EditorBuffer } from './editorStore.ts'

/** Marks programmatic document replaces so the update listener keeps the buffer clean. */
const reloadAnnotation = Annotation.define<boolean>()

/** Extension language by file extension; unknown files stay plain text. */
function languageFor(path: string): ReturnType<typeof javascript> | null {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  switch (extension) {
    case 'js': case 'jsx': return javascript()
    case 'ts': return javascript({ typescript: true })
    case 'tsx': return javascript({ typescript: true, jsx: true })
    case 'py': return python()
    case 'json': return json()
    case 'html': case 'htm': return html()
    case 'css': case 'scss': return css()
    case 'md': case 'markdown': return markdown()
    case 'rs': return rust()
    default: return null
  }
}

function StatusLine({ buffer, t }: { buffer: EditorBuffer; t: (key: DesktopStringKey) => string }): ReactElement {
  const palette = desktopPalette(useDesktopAppearance())
  let label = ''
  if (buffer.status === 'dirty') label = t('editor.dirty')
  if (buffer.status === 'saving') label = t('editor.saving')
  if (buffer.status === 'saved') label = t('editor.saved')
  if (buffer.status === 'conflict') label = buffer.message === 'FS_EXTERNAL_CHANGE' ? t('editor.externalState') : t('editor.conflictState')
  if (buffer.status === 'deleted') label = t('editor.deletedState')
  if (buffer.status === 'error') label = t('editor.saveError')
  return <span style={{ color: palette.muted, fontSize: 11 }}>{label}</span>
}

export function EditorSurface(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const editor = useEditorState()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | undefined>(undefined)
  const languageCompartment = useRef(new Compartment())
  const activePathRef = useRef<string | undefined>(undefined)
  const [closePath, setClosePath] = useState<string | undefined>(undefined)
  const active = editor.activePath !== undefined ? editor.buffers[editor.activePath] : undefined
  activePathRef.current = editor.activePath

  useEffect(() => {
    if (!editor.visible) {
      viewRef.current?.destroy()
      viewRef.current = undefined
      return
    }
    if (containerRef.current === null || viewRef.current !== undefined) return
    const save = (): boolean => {
      if (activePathRef.current !== undefined) void saveBuffer(activePathRef.current)
      return true
    }
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: active?.content ?? '',
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          syntaxHighlighting(defaultHighlightStyle),
          languageCompartment.current.of(active !== undefined ? languageFor(active.path) ?? [] : []),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab, { key: 'Mod-s', run: save, preventDefault: true }]),
          EditorView.updateListener.of((update) => {
            const activePath = activePathRef.current
            if (update.docChanged && activePath !== undefined) {
              // Reloads and adoptions carry the annotation; only real user
              // edits mark the buffer dirty.
              if (!update.transactions.some(transaction => transaction.annotation(reloadAnnotation))) {
                setBufferContent(activePath, update.state.doc.toString())
              }
            }
          }),
        ],
      }),
    })
    viewRef.current = view
  }, [editor.visible, active, editor.activePath, t, palette])

  useEffect(() => {
    const view = viewRef.current
    if (view === undefined || active === undefined) return
    const current = view.state.doc.toString()
    if (current !== active.content) {
      // Preserve cursor, selection, and scroll when an external reload or a
      // clean-file adoption replaces the document.
      const selection = view.state.selection.main
      const scrollTop = view.scrollDOM.scrollTop
      view.dispatch({ changes: { from: 0, to: current.length, insert: active.content }, annotations: reloadAnnotation.of(true) })
      if (selection.from <= active.content.length || selection.to <= active.content.length) {
        view.dispatch({
          selection: {
            anchor: Math.min(selection.anchor, active.content.length),
            head: Math.min(selection.head, active.content.length),
          },
        })
      }
      view.scrollDOM.scrollTop = scrollTop
    }
    view.dispatch({ effects: languageCompartment.current.reconfigure(languageFor(active.path) ?? []) })
  }, [active])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!editor.visible) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (editor.activePath !== undefined) void saveBuffer(editor.activePath)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [editor.visible, editor.activePath])

  if (!editor.visible) return <></>

  const requestClose = (path: string): void => {
    const buffer = editor.buffers[path]
    if (buffer !== undefined && buffer.status === 'dirty') setClosePath(path)
    else closeBuffer(path)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950, display: 'flex', flexDirection: 'column',
      background: palette.dialog, color: palette.text, fontFamily: 'system-ui',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid ' + palette.inputBorder, alignItems: 'center' }}>
        <button onClick={() => { setEditorVisible(false) }} style={{ background: 'transparent', border: 'none', color: palette.text, cursor: 'pointer', padding: '6px 10px', fontSize: 13 }} title={t('editor.backToConversation')}>
          ‹
        </button>
        {editor.order.map((path) => {
          const buffer = editor.buffers[path]
          if (buffer === undefined) return null
          return (
            <div key={path} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', cursor: 'pointer', fontSize: 12,
              borderBottom: editor.activePath === path ? '2px solid #2f6fed' : '2px solid transparent',
              background: editor.activePath === path ? palette.input : 'transparent',
            }} onClick={() => { setActiveBuffer(path) }}>
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: buffer.status === 'deleted' ? 'line-through' : 'none', color: buffer.status === 'deleted' ? palette.muted : palette.text }}>{buffer.name}</span>
              {buffer.status === 'dirty' && <span style={{ color: '#f85149' }}>●</span>}
              {buffer.status === 'deleted' && <span style={{ color: '#f85149' }}>◌</span>}
              <button onClick={(event) => { event.stopPropagation(); requestClose(path) }} style={{ background: 'transparent', border: 'none', color: palette.muted, cursor: 'pointer', fontSize: 12 }} aria-label={t('editor.closeTab')}>×</button>
            </div>
          )
        })}
        <div style={{ flex: 1 }} />
        {active !== undefined && active.status !== 'deleted' && (
          <button onClick={() => { void saveBuffer(active.path) }} style={{ marginRight: 10, background: '#2f6fed', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
            {t('editor.save')}
          </button>
        )}
        {active !== undefined && active.status === 'dirty' && (
          <button onClick={() => { void saveAllBuffers() }} style={{ marginRight: 10, background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
            {t('editor.saveAll')}
          </button>
        )}
      </div>
      {active !== undefined && active.status === 'conflict' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid ' + palette.inputBorder, fontSize: 12 }}>
          <span style={{ flex: '1 1 240px' }}>{active.message === 'FS_EXTERNAL_CHANGE' ? t('editor.externalBody') : t('editor.conflictBody')}</span>
          <button onClick={() => { void reloadBuffer(active.path) }} style={{ background: '#2f6fed', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{active.message === 'FS_EXTERNAL_CHANGE' ? t('editor.externalReload') : t('editor.conflictReload')}</button>
          <button onClick={() => { keepBufferChanges(active.path) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{active.message === 'FS_EXTERNAL_CHANGE' ? t('editor.externalKeep') : t('editor.conflictKeep')}</button>
        </div>
      )}
      {active !== undefined && active.status === 'deleted' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid ' + palette.inputBorder, fontSize: 12 }}>
          <span>{t('editor.deletedBody')}</span>
          <button onClick={() => { closeBuffer(active.path) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>{t('editor.deletedClose')}</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderBottom: '1px solid ' + palette.inputBorder }}>
        <span style={{ color: palette.muted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active?.path ?? ''}</span>
        {active !== undefined && <StatusLine buffer={active} t={t} />}
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', fontSize: 13 }} />
      {editor.order.length === 0 && (
        <div style={{ padding: 24, color: palette.muted, fontSize: 13 }}>{t('editor.empty')}</div>
      )}
      {closePath !== undefined && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: palette.dialog, border: '1px solid ' + palette.inputBorder, borderRadius: 10, padding: 18, minWidth: 320, fontSize: 13 }}>
            <div style={{ marginBottom: 10 }}>{t('editor.unsavedBody')}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setClosePath(undefined) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>{t('editor.unsavedCancel')}</button>
              <button onClick={() => { setClosePath(undefined); closeBuffer(closePath) }} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>{t('editor.unsavedDiscard')}</button>
              <button onClick={() => { void saveBuffer(closePath).then(() => { setClosePath(undefined); closeBuffer(closePath) }) }} style={{ background: '#2f6fed', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>{t('editor.unsavedSave')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
