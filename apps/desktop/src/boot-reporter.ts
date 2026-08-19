/**
 * First-error reporter for the desktop shell: a separate module from the app
 * entry, so a crash while evaluating the main bundle still surfaces on the
 * window instead of leaving a blank WebView. Idle (invisible) when nothing
 * fails.
 */

function report(kind: string, text: string): void {
  const el = document.getElementById('boot-errors')
  if (el === null) return
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;color:#111;font:13px/1.5 ui-monospace,monospace;padding:1rem;overflow:auto'
  const pre = document.createElement('pre')
  pre.style.whiteSpace = 'pre-wrap'
  pre.textContent = '[' + kind + '] ' + text
  el.appendChild(pre)
}

/** Forward structured diagnostics to the Rust desktop log for post-mortem. */
function forward(kind: string, message: string, stack: string | undefined): void {
  // Tauri 2 exposes the internal invoke on window.__TAURI_INTERNALS__;
  // the typed binding is installed later by tauri-bindings.ts.
  type Internals = { __TAURI_INTERNALS__?: { invoke?: (cmd: string, args: Record<string, unknown>) => Promise<unknown> } }
  const internals = (window as unknown as Internals).__TAURI_INTERNALS__
  void internals?.invoke?.('web_error', { kind, message, stack: stack ?? '' }).catch(() => {})
}

window.addEventListener('error', (event) => {
  const source = event.filename
  const stack = event.error instanceof Error ? event.error.stack : undefined
  report('window-error', event.message + ' @ ' + source + ':' + String(event.lineno))
  forward('window-error', event.message + ' @ ' + source + ':' + String(event.lineno), stack)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason
  const text = reason instanceof Error ? reason.message + '\n' + (reason.stack ?? '') : String(reason)
  report('unhandled-rejection', text)
  forward('unhandled-rejection', reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined)
})
