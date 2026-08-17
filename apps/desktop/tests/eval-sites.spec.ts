import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Source-scan regression for docs/desktop/CSP-EVAL-AUDIT.md: dynamic code
 * generation must stay confined to the audited sites. A new eval site
 * anywhere else fails this test so the CSP audit is revisited in review.
 */

const ROOT = resolve(process.cwd())
const SCOPES = ['vendor', 'packages']

/** The audited dynamic-evaluation sites (file or comment-only mention). */
const AUDITED: ReadonlySet<string> = new Set([
  ['vendor', 'loader', 'src', 'config', 'utils.ts'].join(sep),
  ['vendor', 'schemastery', 'src', 'index.ts'].join(sep),
  ['packages', 'extensions', 'cordis-client-runner', 'src', 'client', 'evaluator.ts'].join(sep),
  ['packages', 'extensions', 'cordis-host-runner', 'src', 'sandbox.ts'].join(sep),
])

const DYNAMIC_CODE = new RegExp('\\bnew\\s+Function\\b|\\beval\\s*\\(|\\bFunction\\s*\\(', 'g')

function collect(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'lib' || entry === 'node_modules' || entry === 'tests' || entry === 'fixtures') continue
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) files.push(...collect(path))
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) files.push(path)
  }
  return files
}

describe('desktop eval-site scan', () => {
  it('confines dynamic code generation to the audited sites', () => {
    const hits: string[] = []
    for (const scope of SCOPES) {
      for (const file of collect(resolve(ROOT, scope))) {
        const text = readFileSync(file, 'utf8')
        if (DYNAMIC_CODE.test(text)) {
          DYNAMIC_CODE.lastIndex = 0
          const rel = relative(ROOT, file)
          if (!AUDITED.has(rel)) hits.push(rel)
        }
      }
    }
    expect(hits).toEqual([])
  })
})
