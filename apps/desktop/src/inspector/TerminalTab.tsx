/** M4 integrated terminal: xterm.js frontend over the desktop terminal RPC. */

import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useDesktopStrings, desktopPalette, useDesktopAppearance } from '@deepseek-ai/dsh-desktop-client/src/ui/strings'
import { terminalRequest, useInspectorState } from './store.ts'

interface SpawnedTerminal {
  terminalId: string
  exited: boolean
}

export function TerminalTab(): ReactElement {
  const { t } = useDesktopStrings()
  const palette = desktopPalette(useDesktopAppearance())
  const state = useInspectorState()
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | undefined>(undefined)
  const fitRef = useRef<FitAddon | undefined>(undefined)
  const sessionRef = useRef<string | undefined>(undefined)
  const spawnedRef = useRef<SpawnedTerminal | undefined>(undefined)
  const [spawned, setSpawned] = useState<SpawnedTerminal | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const sessionId = state.activeSessionId
  sessionRef.current = sessionId
  spawnedRef.current = spawned

  useEffect(() => {
    if (containerRef.current === null || termRef.current !== undefined) return
    const term = new Terminal({
      convertEol: false,
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      theme: { background: palette.code, foreground: palette.text },
      scrollback: 2000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit
    term.onData((data) => {
      const currentSession = sessionRef.current
      const currentTerminal = spawnedRef.current
      if (currentSession === undefined || currentTerminal === undefined) return
      if (data === '\r' || data === '\n') {
        term.write('\r\n')
        void terminalRequest('desktop.terminal.send', { sessionId: currentSession, terminalId: currentTerminal.terminalId, text: '', submit: true }).catch(() => {})
        return
      }
      if (data === '\x03') {
        term.write('^C')
        void terminalRequest('desktop.terminal.signal', { sessionId: currentSession, terminalId: currentTerminal.terminalId, signal: 'SIGINT' }).catch(() => {})
        return
      }
      term.write(data)
    })
    const onResize = (): void => {
      try {
        fit.fit()
        if (sessionId !== undefined && spawned !== undefined) {
          void terminalRequest('desktop.terminal.resize', {
            sessionId,
            terminalId: spawned.terminalId,
            columns: term.cols,
            rows: term.rows,
          }).catch(() => {})
        }
      } catch {
        // The container may be unmounted mid-resize.
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      term.dispose()
      termRef.current = undefined
    }
  }, [palette, sessionId, spawned])

  useEffect(() => {
    if (sessionId === undefined) {
      setSpawned(undefined)
      setError(undefined)
      return
    }
    let active = true
    setError(undefined)
    void terminalRequest<{ terminalId: string; motd: string }>('desktop.terminal.spawn', { sessionId }).then((result) => {
      if (!active) return
      setSpawned({ terminalId: result.terminalId, exited: false })
      termRef.current?.write(result.motd)
      fitRef.current?.fit()
    }, () => {
      if (active) setError(t('terminal.spawnError'))
    })
    return () => { active = false }
  }, [sessionId, t])

  const output = sessionId !== undefined ? state.terminals[sessionId] : undefined
  const lastLength = useRef(0)
  useEffect(() => {
    if (output === undefined) return
    const delta = output.output.slice(lastLength.current)
    if (delta.length > 0) termRef.current?.write(delta)
    lastLength.current = output.output.length
    if (output.status?.kind === 'exited' && spawned !== undefined && !spawned.exited) {
      setSpawned({ ...spawned, exited: true })
    }
  }, [output, spawned])

  const closeTerminal = (): void => {
    if (sessionId === undefined || spawned === undefined) return
    void terminalRequest('desktop.terminal.kill', { sessionId, terminalId: spawned.terminalId }).then(() => {
      setSpawned(undefined)
      termRef.current?.clear()
    }).catch(() => {})
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid ' + palette.inputBorder }}>
        <span style={{ fontSize: 11.5, color: palette.muted }}>{t('terminal.inputHint')}</span>
        {spawned !== undefined && (
          <button onClick={closeTerminal} style={{ background: 'transparent', border: '1px solid ' + palette.inputBorder, color: palette.text, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>{t('terminal.close')}</button>
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, padding: 4 }} />
      {spawned?.exited === true && (
        <div style={{ padding: '2px 8px', fontSize: 11, color: palette.muted, borderTop: '1px solid ' + palette.inputBorder }}>{t('terminal.exited')}</div>
      )}
      {error !== undefined && (
        <div style={{ padding: '8px', fontSize: 12, color: palette.muted }}>{error}</div>
      )}
      {sessionId === undefined && (
        <div style={{ padding: '8px', fontSize: 12, color: palette.muted }}>{t('terminal.noSession')}</div>
      )}
    </div>
  )
}
