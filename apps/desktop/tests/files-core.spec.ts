import { describe, expect, it } from 'vitest'
import { previewReadErrorKey } from '../src/inspector/files-core.ts'

describe('previewReadErrorKey', () => {
  it('keeps size-limited text distinct from binary files', () => {
    expect(previewReadErrorKey('FS_TOO_LARGE: file exceeds the 524288-byte preview limit')).toBe('files.tooLarge')
    expect(previewReadErrorKey('binary files cannot be previewed')).toBe('files.binary')
    expect(previewReadErrorKey('cannot read file')).toBe('files.loadError')
  })
})
