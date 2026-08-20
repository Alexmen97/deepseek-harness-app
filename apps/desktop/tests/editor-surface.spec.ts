import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SRC = readFileSync(new URL('../src/inspector/EditorSurface.tsx', import.meta.url), 'utf8')

describe('M5A editor tab routing', () => {
  it('writes and saves through the current active-tab ref instead of the first render closure', () => {
    expect(SRC).toContain('const activePathRef = useRef<string | undefined>(undefined)')
    expect(SRC).toContain('activePathRef.current = editor.activePath')
    expect(SRC).toContain('const activePath = activePathRef.current')
    expect(SRC).toContain('setBufferContent(activePath, update.state.doc.toString())')
    expect(SRC).toContain('saveBuffer(activePathRef.current)')
    expect(SRC).not.toContain('setBufferContent(editor.activePath, update.state.doc.toString())')
  })

  it('wraps the external-change banner so long localized labels never truncate', () => {
    expect(SRC).toContain("flexWrap: 'wrap'")
    expect(SRC).toContain("flex: '1 1 100%'")
    expect(SRC).toContain("whiteSpace: 'nowrap'")
  })
})
