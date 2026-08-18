/**
 * Build DeepSeek-Harness-App-v<version>-macOS-arm64.dmg from a built .app.
 * Simple and professional: the app beside an Applications alias, sensible
 * Finder layout when AppleScript is available, no custom installer.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const appPath = resolve(repo, 'apps/desktop/src-tauri/target/release/bundle/macos/Harness Desktop.app')
if (!existsSync(appPath)) {
  console.error('make-desktop-dmg: bundle missing; run tauri build first')
  process.exit(1)
}

const conf = JSON.parse(readFileSync(resolve(repo, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'))
const version = conf.version
const dmgName = 'DeepSeek-Harness-App-v' + version + '-macOS-arm64.dmg'
const dmgPath = resolve(repo, 'dist-exe', dmgName)
const stage = resolve(repo, 'dist-exe', '.dmg-stage')
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
execFileSync('ditto', [appPath, resolve(stage, 'Harness Desktop.app')])
symlinkSync('/Applications', resolve(stage, 'Applications'))
// License and notice obligations travel with the binary distribution.
copyFileSync(resolve(repo, 'LICENSE'), resolve(stage, 'LICENSE.txt'))
copyFileSync(resolve(repo, 'THIRD_PARTY_NOTICES.md'), resolve(stage, 'THIRD_PARTY_NOTICES.md'))

execFileSync('hdiutil', ['create', '-volname', 'Harness Desktop', '-srcfolder', stage, '-ov', '-format', 'UDZO', dmgPath])

// Finder layout: best-effort AppleScript; the DMG stays valid without it.
const layoutScript = [
  'on run argv',
  'set dmgPath to item 1 of argv',
  'tell application "Finder"',
  'set dmg to disk dmgPath',
  'open dmg',
  'set the bounds of the container window of dmg to {100, 100, 700, 430}',
  'set position of item "Harness Desktop.app" of dmg to {140, 160}',
  'set position of item "Applications" of dmg to {450, 160}',
  'update without registering applications',
  'close dmg',
  'end tell',
  'end run',
].join('\n')
const layout = spawnSync('osascript', ['-e', layoutScript, dmgPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
if (layout.status !== 0) {
  console.log('make-desktop-dmg: Finder layout skipped (' + (layout.stderr || '').trim() + ')')
}

rmSync(stage, { recursive: true, force: true })
console.log('make-desktop-dmg: ' + dmgPath)

// Checksum and release manifest for the public release assets.
const hash = createHash('sha256').update(readFileSync(dmgPath)).digest('hex')
writeFileSync(dmgPath + '.sha256', hash + '  ' + dmgName + '\n')
const upstream = JSON.parse(readFileSync(resolve(repo, 'docs/project/upstream-base.json'), 'utf8'))
const buildCommit = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim() }
  catch { return 'unknown' }
})()
const sbomFilename = 'DeepSeek-Harness-App-v' + version + '-sbom.cdx.json'
const manifest = {
  schemaVersion: 1,
  version,
  desktopProtocol: 1,
  harnessVersion: upstream.version,
  harnessCommit: upstream.commit,
  platform: 'macos',
  arch: 'arm64',
  dmgFilename: dmgName,
  sha256: hash,
  sbomFilename,
  buildCommit,
  buildTimestamp: new Date().toISOString(),
}
writeFileSync(resolve(repo, 'dist-exe', 'DeepSeek-Harness-App-v' + version + '-release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log('make-desktop-dmg: checksum ' + dmgPath + '.sha256')
