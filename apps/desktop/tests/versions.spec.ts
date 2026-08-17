import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Version source-of-truth consistency: the Rust constants, the TypeScript
 * protocol constant, the app manifest, and the pinned harness release must
 * all agree. A drift fails this test before any artifact ships.
 */

const ROOT = resolve(process.cwd())
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8')

function rustConst(name: string): string {
  const source = read('apps/desktop/src-tauri/src/manager.rs')
  const match = source.match(new RegExp('pub const ' + name + '.*= ("[^"]+"|\\d+)'))
  if (match === null || match[1] === undefined) throw new Error(name + ' constant not found in manager.rs')
  return match[1].replace(/"/g, '')
}

describe('desktop version consistency', () => {
  it('pins the harness release from the repository root package.json', () => {
    const root = JSON.parse(read('package.json')) as { version: string }
    expect(rustConst('HARNESS_VERSION')).toBe(root.version)
  })

  it('mirrors the protocol version between Rust and TypeScript', () => {
    const types = read('packages/desktop/desktop-protocol/src/types.ts')
    const match = types.match(/DESKTOP_PROTOCOL_VERSION = (\d+)/)
    expect(match).not.toBeNull()
    expect(rustConst('DESKTOP_PROTOCOL_VERSION')).toBe(match?.[1])
  })

  it('keeps the app manifest and the crate version identical', () => {
    const conf = JSON.parse(read('apps/desktop/src-tauri/tauri.conf.json')) as { version: string }
    const cargo = read('apps/desktop/src-tauri/Cargo.toml')
    const match = cargo.match(/^version = "([^"]+)"/m)
    expect(match).not.toBeNull()
    expect(conf.version).toBe(match?.[1])
  })
})
