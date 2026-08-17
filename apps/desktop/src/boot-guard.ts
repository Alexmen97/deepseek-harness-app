/**
 * Boot-time guard for the CSP eval audit: the vendored Cordis loader
 * evaluates YAML !!js expression nodes, and the production CSP permits
 * self-origin eval for that loader. The desktop manifest must therefore
 * never contain an expression node; this guard fails the boot with an
 * actionable error before any entry materializes. See
 * docs/desktop/CSP-EVAL-AUDIT.md.
 */

const JS_EXPR_KEY = '__jsExpr' as const

/** True when the value contains a serialized loader JavaScript expression. */
export function containsJsExpr(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsJsExpr)
  if (value === null || typeof value !== 'object') return false
  if (JS_EXPR_KEY in (value as Record<string, unknown>)) return true
  return Object.values(value as Record<string, unknown>).some(containsJsExpr)
}

/** Fail fast when a manifest carries a !!js expression node. */
export function assertNoJsExpr(manifest: unknown): void {
  if (containsJsExpr(manifest)) {
    throw new Error(
      'desktop boot: the manifest contains a !!js expression node; '
      + 'the desktop composition must not evaluate loader expressions (CSP-EVAL-AUDIT)',
    )
  }
}
