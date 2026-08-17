/**
 * Generate the Harness Desktop app icon: a squircle tile with a blue-violet
 * gradient and a white harness mark (two rails joined by a diagonal strap).
 * Original geometry, no third-party artwork. Encoded as a minimal PNG and
 * assembled into icon.icns with sips + iconutil.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const iconset = resolve(repo, 'apps/desktop/src-tauri/icons')

function crc32(buffer) {
  let table = crc32.table
  if (table === undefined) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      table[n] = c
    }
  }
  let value = -1
  for (let i = 0; i < buffer.length; i += 1) value = (value >>> 8) ^ table[(value ^ buffer[i]) & 0xff]
  return (value ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length)
  return out
}

function png(size, pixel) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x += 1) {
      const offset = y * stride + 1 + x * 4
      const [r, g, b, a] = pixel(x, y)
      raw[offset] = r
      raw[offset + 1] = g
      raw[offset + 2] = b
      raw[offset + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const clamp01 = (value) => Math.max(0, Math.min(1, value))
const lerp = (a, b, t) => a + (b - a) * t

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r
  const qy = Math.abs(py - cy) - hh + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const t = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay))
  return Math.hypot(pax - bax * t, pay - bay * t)
}

/** The icon art: squircle tile, diagonal gradient, white harness mark. */
function iconPixel(size) {
  const half = size / 2
  const bgRadius = size * 0.228
  const barHalfWidth = size * 0.052
  const barHalfHeight = size * 0.205
  const barRadius = size * 0.048
  const strapHalf = size * 0.042
  const leftX = size * 0.365
  const rightX = size * 0.635
  const midY = size * 0.5
  return (x, y) => {
    const tile = sdRoundRect(x, y, half, half, half - 1.5, half - 1.5, bgRadius)
    const tileAlpha = smoothstep(1, 0, tile)
    if (tileAlpha <= 0) return [0, 0, 0, 0]
    const t = clamp01((x + y) / (2 * size))
    const top = [31, 79, 216]
    const bottom = [109, 59, 216]
    const base = [lerp(top[0], bottom[0], t), lerp(top[1], bottom[1], t), lerp(top[2], bottom[2], t)]
    const leftBar = sdRoundRect(x, y, leftX, midY, barHalfWidth, barHalfHeight, barRadius)
    const rightBar = sdRoundRect(x, y, rightX, midY, barHalfWidth, barHalfHeight, barRadius)
    const strap = sdSegment(x, y, leftX, midY + size * 0.10, rightX, midY - size * 0.10) - strapHalf
    const glyph = Math.min(leftBar, rightBar, strap)
    const glyphAlpha = smoothstep(1, 0, glyph)
    const r = Math.round(lerp(base[0], 255, glyphAlpha))
    const g = Math.round(lerp(base[1], 255, glyphAlpha))
    const b = Math.round(lerp(base[2], 255, glyphAlpha))
    return [r, g, b, Math.round(tileAlpha * 255)]
  }
}

mkdirSync(iconset, { recursive: true })
const icon = resolve(iconset, 'icon.png')
writeFileSync(icon, png(1024, iconPixel(1024)))
const work = resolve(iconset, 'icon.iconset')
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
for (const size of [16, 32, 64, 128, 256, 512]) {
  execFileSync('sips', ['-z', String(size), String(size), icon, '--out', resolve(work, 'icon_' + size + 'x' + size + '.png')], { stdio: 'ignore' })
  execFileSync('sips', ['-z', String(size * 2), String(size * 2), icon, '--out', resolve(work, 'icon_' + size + 'x' + size + '@2x.png')], { stdio: 'ignore' })
}
execFileSync('iconutil', ['-c', 'icns', work, '-o', resolve(iconset, 'icon.icns')], { stdio: 'ignore' })
console.log('desktop-icon: generated apps/desktop/src-tauri/icons/icon.icns')
