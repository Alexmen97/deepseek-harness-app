export type ReleaseKind = "preview" | "production"
export interface ResolvedVersion {
  ok: true
  version: string
  kind: ReleaseKind
  previewSequence: number | undefined
}

export interface ResolvedVersionError {
  ok: false
  reason: string
}

export type ResolvedVersionResult = ResolvedVersion | ResolvedVersionError

export function classifyVersion(version: string): ResolvedVersionResult
export function resolveTag(tag: string): ResolvedVersionResult
export function resolveInputVersion(input: string): ResolvedVersionResult
export function artifactNames(version: string, prefix?: string): {
  dmg: string
  sha: string
  manifest: string
  sbom: string
}
