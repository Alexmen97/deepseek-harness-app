// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'

afterEach(cleanup)

function renderMarkdown(text: string): HTMLElement {
  const { container } = render(<MarkdownText text={text} />)
  return container
}

describe('desktop rendered-content safety', () => {
  it('treats raw HTML as text', () => {
    const container = renderMarkdown('<script>window.__pwned = true</script><img src=x onerror=alert(1)>')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<script>')
    expect((globalThis as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('strips unsafe link protocols', () => {
    const container = renderMarkdown('[click](javascript:alert(1)) [file](file:///etc/passwd) [data](data:text/html,x)')
    expect(container.querySelector('a')).toBeNull()
  })

  it('keeps http(s) links with safe window attributes', () => {
    const container = renderMarkdown('[docs](https://example.com/doc)')
    const anchor = container.querySelector('a')
    expect(anchor?.getAttribute('href')).toBe('https://example.com/doc')
    expect(anchor?.getAttribute('target')).toBe('_blank')
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('rejects unsafe image sources and renders the alt text', () => {
    const container = renderMarkdown('![x](javascript:alert(1)) ![y](data:image/svg+xml,<svg onload=alert(1)>)')
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('x')
  })

  it('escapes HTML inside code blocks and tool-style output', () => {
    const container = renderMarkdown('\u0060\u0060\u0060html\n<img src=x onerror=alert(1)>\n\u0060\u0060\u0060')
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img')
  })
})
