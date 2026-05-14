export type SourceType = 'local' | 'url' | 'other-registry' | 'registry'

export function detectSource(target: string): SourceType {
  if (target.startsWith('file:')) return 'local'
  if (/^https?:\/\//.test(target)) return 'url'
  if (target.startsWith('registry+')) return 'other-registry'
  return 'registry'
}
