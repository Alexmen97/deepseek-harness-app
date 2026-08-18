#!/usr/bin/env tsx
/**
 * Best-effort hardcoded-copy scanner for the desktop surface: flags
 * user-facing English phrases written directly into desktop TSX attributes
 * (placeholder, aria-label, title, alt) and JSX text children. It is
 * deliberately narrow — protocol ids, RPC names, URLs, log strings, and
 * test fixtures stay out of scope, and a curated allowlist holds the few
 * legitimate technical literals (docs/desktop/LOCALIZATION-AUDIT.md).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const SCOPES = ['apps/desktop/src', 'packages/desktop', 'packages/credentials/credentials-keychain/src']

/** Exact line snippets that are technical, not user-facing copy. */
const ALLOWLIST = [
  "aria-label={t('",
  "title={t('",
  "placeholder={t('",
  "alt={t('",
]

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'tests' || entry === 'test') continue
      walk(path)
      continue
    }
    if (!/\.tsx?$/.test(entry) || entry.endsWith('.d.ts')) continue
    files.push(path)
  }
}
for (const scope of SCOPES) walk(resolve(root, scope))

const failures = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    if (ALLOWLIST.some((entry) => line.includes(entry))) return
    const attribute = /(?:placeholder|aria-label|title|alt)=\{\{?['"]([A-Z][A-Za-z]+(?: [A-Za-z]+)+)['"]/.exec(line)
    if (attribute) {
      failures.push(file.replace(root + '/', '') + ':' + (index + 1) + ' hardcoded attribute copy: ' + JSON.stringify(attribute[1]))
      return
    }
    const textChild = />([A-Z][a-z]+ [a-z]+(?: [a-z]+)*)</.exec(line)
    if (textChild) {
      failures.push(file.replace(root + '/', '') + ':' + (index + 1) + ' hardcoded JSX text: ' + JSON.stringify(textChild[1]))
    }
  })
}

if (failures.length > 0) {
  console.error('check-desktop-hardcoded-strings: ' + failures.length + ' suspicious literal(s):')
  for (const failure of failures) console.error('  ' + failure)
  process.exit(1)
}
console.log('check-desktop-hardcoded-strings: ' + files.length + ' desktop files scanned, no hardcoded user-facing copy.')
