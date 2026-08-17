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

window.addEventListener('error', (event) => {
  const source = event.filename
  report('window-error', event.message + ' @ ' + source + ':' + String(event.lineno))
})

window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason
  const text = reason instanceof Error ? reason.message + '\n' + (reason.stack ?? '') : String(reason)
  report('unhandled-rejection', text)
})
