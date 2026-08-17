import { describe, expect, it } from 'vitest'
import { assertNoJsExpr, containsJsExpr } from '../src/boot-guard.ts'

describe('desktop boot guard', () => {
  it('accepts the plain manifest shape', () => {
    const manifest = {
      rev: 'desktop-1',
      entries: [{ id: 'a', url: 'static://a', rev: 'desktop-1', inject: [], immediately: true }],
    }
    expect(containsJsExpr(manifest)).toBe(false)
    expect(() => assertNoJsExpr(manifest)).not.toThrow()
  })

  it('rejects a !!js expression node anywhere in the manifest', () => {
    const cases: unknown[] = [
      { __jsExpr: 'ctx.webStartup.port' },
      { entries: [{ config: { nested: { __jsExpr: '1 + 1' } } }] },
      { entries: [{ disabled: { __jsExpr: 'false' } }] },
      { entries: [{ config: { list: [{ __jsExpr: 'true' }] } }] },
    ]
    for (const manifest of cases) {
      expect(containsJsExpr(manifest)).toBe(true)
      expect(() => assertNoJsExpr(manifest)).toThrow(/!!js expression node/)
    }
  })
})
