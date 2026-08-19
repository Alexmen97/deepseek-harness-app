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
  // `t` is a fresh arrow per render; the spawn effect must not re-run on
  // every locale/state render or each re-run would kill+respawn the PTY and
  // briefly accumulate bash children (M5C.5 PTY-leak fix).
  const tRef = useRef(t)
  tRef.current = t
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

  // Serialized PTY lifecycle: one in-flight kill+spawn chain per mount.
  // A concurrent re-run (sessionId flapping, remount) waits for the previous
  // chain instead of spawning in parallel, so the runtime never accumulates
  // more than one bash per tab (M5C.5 PTY-leak fix).
  // One live PTY per mount: the latest effect run wins and cancels earlier
  // runs before they can spawn. `spawnRunRef` is bumped on every re-run so a
  // stale async chain (sessionId flapping, remount) never spawns after a
  // newer chain claimed the slot. `ownedTerminalRef` tracks the terminal the
  // current run has spawned even before the async setState lands, so a newer
  // run always kills the previous PTY before spawning (M5C.5 PTY-leak fix).
  const spawnRunRef = useRef(0)
  const ownedTerminalRef = useRef<SpawnedTerminal | undefined>(undefined)

  useEffect(() => {
    if (sessionId === undefined) {
      setSpawned(undefined)
      setError(undefined)
      return
    }
    const run = ++spawnRunRef.current
    const disposed = { value: false }
    setError(undefined)
    const previous = ownedTerminalRef.current
    ownedTerminalRef.current = undefined
    void (async (): Promise<void> => {
      if (previous !== undefined && !previous.exited) {
        await terminalRequest('desktop.terminal.kill', { sessionId, terminalId: previous.terminalId }).catch(() => {})
      }
      if (disposed.value || run !== spawnRunRef.current) return
      const result = await terminalRequest<{ terminalId: string; motd: string }>('desktop.terminal.spawn', { sessionId })
      if (run !== spawnRunRef.current) {
        // A newer effect run claimed the slot: never leave its PTY behind.
        await terminalRequest('desktop.terminal.kill', { sessionId, terminalId: result.terminalId }).catch(() => {})
        return
      }
      ownedTerminalRef.current = { terminalId: result.terminalId, exited: false }
      spawnedRef.current = ownedTerminalRef.current
      setSpawned(ownedTerminalRef.current)
      termRef.current?.write(result.motd)
      fitRef.current?.fit()
    })().catch(() => {
      if (!disposed.value && run === spawnRunRef.current) setError(tRef.current('terminal.spawnError'))
    })
    return () => {
      disposed.value = true
      const current = ownedTerminalRef.current ?? spawnedRef.current
      if (current !== undefined && !current.exited) {
        void terminalRequest('desktop.terminal.kill', { sessionId, terminalId: current.terminalId }).catch(() => {})
      }
    }
  }, [sessionId])

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
