/**
 * Generate the M1B placeholder app icon: a solid rounded-square mark with an
 * H, encoded as a minimal PNG and assembled into icon.icns with sips +
 * iconutil. Explicitly unofficial branding; replace before any distribution.
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
      raw[offset] = pixel[0]
      raw[offset + 1] = pixel[1]
      raw[offset + 2] = pixel[2]
      raw[offset + 3] = pixel[3]
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

mkdirSync(iconset, { recursive: true })
const icon = resolve(iconset, 'icon.png')
writeFileSync(icon, png(1024, [47, 111, 237, 255]))
const work = resolve(iconset, 'icon.iconset')
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
for (const size of [16, 32, 64, 128, 256, 512]) {
  execFileSync('sips', ['-z', String(size), String(size), icon, '--out', resolve(work, 'icon_' + size + 'x' + size + '.png')], { stdio: 'ignore' })
  execFileSync('sips', ['-z', String(size * 2), String(size * 2), icon, '--out', resolve(work, 'icon_' + size + 'x' + size + '@2x.png')], { stdio: 'ignore' })
}
execFileSync('iconutil', ['-c', 'icns', work, '-o', resolve(iconset, 'icon.icns')], { stdio: 'ignore' })
console.log('desktop-icon: generated apps/desktop/src-tauri/icons/icon.icns')
