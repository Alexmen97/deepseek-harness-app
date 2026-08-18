#!/usr/bin/env tsx
/**
 * Desktop localization coverage gate: every shipped locale must carry the
 * exact canonical key set of every desktop namespace — no missing keys, no
 * orphan keys, no empty values, and placeholder parity with the English
 * templates. Exits nonzero when any supported locale is incomplete; CI and
 * the release workflow both run it (docs/desktop/LOCALIZATION-AUDIT.md).
 */

import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const LOCALES = ['en', 'zh', 'it', 'es', 'fr', 'de', 'pt-BR']

/** Namespace dictionary files whose exports are per-locale key maps. */
const NAMESPACES = [
  'packages/client/locale/src/locales/index.ts',
  'packages/client/locale/src/locales/settings.ts',
  'packages/client/ui-agent-preset/src/client/locales.ts',
  'packages/client/ui-commands/src/client/locales.ts',
  'packages/client/ui-conversation/src/client/locales.ts',
  'packages/client/ui-deliverables/src/client/locales.ts',
  'packages/client/ui-goal/src/client/locales.ts',
  'packages/client/ui-input-trigger/src/client/locales.ts',
  'packages/client/ui-jobs/src/client/locales.ts',
  'packages/client/ui-message-feedback/src/client/locales.ts',
  'packages/client/ui-model-selection/src/client/locales.ts',
  'packages/client/ui-permission-presets/src/client/locales.ts',
  'packages/client/ui-plan/src/client/locales.ts',
  'packages/client/ui-settings-general/src/client/locales.ts',
  'packages/client/ui-settings-models/src/client/locales.ts',
  'packages/client/ui-settings-plugin-inventory/src/client/locales.ts',
  'packages/client/ui-settings-plugins/src/client/locales.ts',
  'packages/client/ui-sidebar/src/client/locales.ts',
  'packages/client/ui-skill/src/client/locales.ts',
  'packages/client/ui-subagent/src/client/locales.ts',
  'packages/client/ui-theme/src/client/locales.ts',
  'packages/client/ui-trajectory/src/client/locales.ts',
  'packages/client/ui-user-questions/src/client/locales.ts',
  'packages/client/ui-workflow-run/src/client/locales.ts',
  'packages/client/ui-workspace/src/client/locales.ts',
  'packages/extensions/ui-cordis/src/client/locales.ts',
  'packages/session-query/session-log-export/src/client/locales.ts',
]

/** Per-locale dict exports to read from each module. */
const EXPORTS = {
  en: 'en', zh: 'zh', it: 'it', es: 'es', fr: 'fr', de: 'de', 'pt-BR': 'ptBr',
}

const failures = []
const missingCount = Object.fromEntries(LOCALES.map((locale) => [locale, 0]))
const emptyCount = Object.fromEntries(LOCALES.map((locale) => [locale, 0]))
let totalKeys = 0

const placeholders = (value) => {
  const found = new Set()
  for (const match of value.matchAll(/\\{(\\w+)\\}/g)) found.add(match[1])
  return found
}

const setEquals = (a, b) => a.size === b.size && [...a].every((item) => b.has(item))

for (const rel of NAMESPACES) {
  const module = await import(pathToFileURL(resolve(root, rel)).href)
  const canonical = module.zh ?? module.en
  if (typeof canonical !== 'object' || canonical === null) {
    failures.push(rel + ': no canonical zh/en dictionary exported')
    continue
  }
  const canonicalKeys = Object.keys(canonical)
  totalKeys += canonicalKeys.length
  for (const locale of LOCALES) {
    const dict = module[EXPORTS[locale]] ?? module[locale]
    if (typeof dict !== 'object' || dict === null) {
      failures.push(rel + ': ' + locale + ' dictionary is not exported')
      continue
    }
    const missing = canonicalKeys.filter((key) => !(key in dict))
    const extra = Object.keys(dict).filter((key) => !canonicalKeys.includes(key))
    const empty = Object.keys(dict).filter((key) => typeof dict[key] !== 'string' || dict[key].trim() === '')
    missingCount[locale] += missing.length
    emptyCount[locale] += empty.length
    for (const key of missing) failures.push(rel + ': ' + locale + ' missing key ' + JSON.stringify(key))
    for (const key of extra) failures.push(rel + ': ' + locale + ' orphan key ' + JSON.stringify(key))
    for (const key of empty) failures.push(rel + ': ' + locale + ' empty value for ' + JSON.stringify(key))
    if (locale !== 'en' && module.en !== undefined) {
      for (const key of canonicalKeys) {
        const enValue = module.en[key]
        const value = dict[key]
        if (typeof enValue !== 'string' || typeof value !== 'string') continue
        if (!setEquals(placeholders(enValue), placeholders(value))) {
          failures.push(rel + ': ' + locale + ' placeholder mismatch for ' + JSON.stringify(key))
        }
      }
    }
  }
}

// Desktop-owned strings: en is canonical, all seven dicts live in one module.
const desktop = await import(pathToFileURL(resolve(root, 'packages/desktop/desktop-client/src/ui/strings.ts')).href)
const desktopKeys = Object.keys(desktop.en)
totalKeys += desktopKeys.length
for (const locale of LOCALES) {
  const dict = desktop[EXPORTS[locale]]
  const missing = desktopKeys.filter((key) => !(key in dict))
  const extra = Object.keys(dict).filter((key) => !desktopKeys.includes(key))
  const empty = desktopKeys.filter((key) => typeof dict[key] !== 'string' || dict[key].trim() === '')
  missingCount[locale] += missing.length
  emptyCount[locale] += empty.length
  for (const key of missing) failures.push('desktop strings: ' + locale + ' missing key ' + JSON.stringify(key))
  for (const key of extra) failures.push('desktop strings: ' + locale + ' orphan key ' + JSON.stringify(key))
  for (const key of empty) failures.push('desktop strings: ' + locale + ' empty value for ' + JSON.stringify(key))
  if (locale !== 'en') {
    for (const key of desktopKeys) {
      if (!setEquals(placeholders(desktop.en[key]), placeholders(dict[key]))) {
        failures.push('desktop strings: ' + locale + ' placeholder mismatch for ' + JSON.stringify(key))
      }
    }
  }
}

console.log('Locale  Keys            Missing  Empty  Coverage')
for (const locale of LOCALES) {
  const missing = missingCount[locale]
  const empty = emptyCount[locale]
  const coverage = Math.round(((totalKeys - missing - empty) / totalKeys) * 100)
  console.log(locale.padEnd(8) + String(totalKeys).padEnd(16) + String(missing).padEnd(9) + String(empty).padEnd(7) + coverage + '%')
}
if (failures.length > 0) {
  console.error('desktop:i18n:check failed:')
  for (const failure of failures) console.error('  ' + failure)
  process.exit(1)
}
console.log('desktop:i18n:check: ' + totalKeys + ' keys x ' + LOCALES.length + ' locales across ' + (NAMESPACES.length + 1) + ' surfaces, all complete.')
