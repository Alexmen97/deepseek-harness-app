/**
 * Report the pinned upstream base: the repository, commit, and Harness
 * release this checkout is derived from. Reads docs/project/upstream-base.json.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const base = JSON.parse(readFileSync(resolve(repo, 'docs/project/upstream-base.json'), 'utf8'))
console.log('Upstream base:')
console.log('  repository  ' + base.repository)
console.log('  commit      ' + base.commit)
console.log('  version     ' + base.version)
