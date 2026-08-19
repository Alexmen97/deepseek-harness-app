/** Pure Quick Open index and fuzzy ranking; no IO, no bindings. */

export interface QuickOpenEntry {
  path: string
  name: string
}

export interface QuickOpenMatch {
  entry: QuickOpenEntry
  score: number
}

/** Default result cap; the palette stays responsive on huge repositories. */
export const QUICK_OPEN_LIMIT = 50

/** Case-insensitive subsequence match; -1 when the needle is absent. */
export function subsequenceIndex(haystack: string, needle: string): number {
  if (needle === '') return 0
  let hayIndex = 0
  let needleIndex = 0
  let gaps = 0
  let previous = -2
  while (needleIndex < needle.length && hayIndex < haystack.length) {
    if (haystack.charAt(hayIndex).toLowerCase() === needle.charAt(needleIndex).toLowerCase()) {
      if (hayIndex !== previous + 1) gaps += 1
      previous = hayIndex
      needleIndex += 1
    }
    hayIndex += 1
  }
  return needleIndex === needle.length ? gaps : -1
}

/** Rank one entry against a query; null when it does not match. */
export function rankEntry(entry: QuickOpenEntry, query: string): QuickOpenMatch | null {
  const q = query.trim().toLowerCase()
  if (q === '') return { entry, score: 0 }
  const name = entry.name.toLowerCase()
  const path = entry.path.toLowerCase()
  if (name.startsWith(q)) return { entry, score: 1000 - name.length }
  const nameGaps = subsequenceIndex(name, q)
  if (nameGaps >= 0) return { entry, score: 600 - nameGaps * 8 }
  const pathGaps = subsequenceIndex(path, q)
  if (pathGaps >= 0) return { entry, score: 250 - pathGaps * 8 - path.length / 100 }
  return null
}

/** Rank and sort the whole index; ties break on path length, then path. */
export function filterIndex(entries: QuickOpenEntry[], query: string, limit = QUICK_OPEN_LIMIT): QuickOpenMatch[] {
  const matches: QuickOpenMatch[] = []
  for (const entry of entries) {
    const match = rankEntry(entry, query)
    if (match !== null) matches.push(match)
  }
  matches.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    const lengthDiff = left.entry.path.length - right.entry.path.length
    if (lengthDiff !== 0) return lengthDiff
    return left.entry.path < right.entry.path ? -1 : left.entry.path > right.entry.path ? 1 : 0
  })
  return matches.slice(0, limit)
}

/** Build the in-memory index from workspace-relative paths (path metadata only). */
export function buildIndex(paths: string[]): QuickOpenEntry[] {
  return paths
    .map(path => ({ path, name: path.split('/').pop() ?? path }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
}

/** Same filename in different directories stays distinguishable by path. */
export function findEntryByPath(entries: QuickOpenEntry[], path: string): QuickOpenEntry | undefined {
  return entries.find(entry => entry.path === path)
}
