import semver from 'semver'

export function resolveVersion(range: string, available: string[]): string | null {
  return semver.maxSatisfying(available, range)
}
