import { describe, expect, it } from 'vitest'
import { TOKEN, tokenize } from '../src/inspector/highlight-core.ts'

describe('M4 token highlighter regex (M5B.1 regression)', () => {
  it('constructs a valid regular expression (no quantifier-on-nothing)', () => {
    expect(() => new RegExp(TOKEN.source, 'g')).not.toThrow()
  })

  it('tokenizes comments, strings, keywords, and numbers', () => {
    const tokens = tokenize('const a = 1 /* c */ // hi "str" 42')
    expect(tokens).toEqual(['const', '1', '/* c */', '// hi "str" 42'])
  })

  it('matches block comments with inner asterisks and slashes', () => {
    const tokens = tokenize('/* a * b / c */ rest')
    expect(tokens[0]).toBe('/* a * b / c */')
  })

  it('matches escaped quotes inside strings', () => {
    const tokens = tokenize('x = "a\\"b"')
    expect(tokens).toContain('"a\\"b"')
  })
})
