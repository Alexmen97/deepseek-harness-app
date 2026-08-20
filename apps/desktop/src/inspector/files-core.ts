/** Classifies a failed file preview without exposing host error text in the UI. */
export function previewReadErrorKey(error: unknown): 'files.tooLarge' | 'files.binary' | 'files.loadError' {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('FS_TOO_LARGE:')) return 'files.tooLarge'
  if (message.includes('binary files cannot be previewed')) return 'files.binary'
  return 'files.loadError'
}
