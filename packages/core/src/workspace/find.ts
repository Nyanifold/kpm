import { access } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const WORKSPACE_MARKERS = [
  'kpm-dependencies.toml',
  'kpm-dependencies.yaml',
  'kpm-dependencies.json',
  'kpm-meta.toml',
  'kpm-meta.yaml',
  'kpm-meta.json',
]

async function hasMarker(dir: string): Promise<boolean> {
  for (const marker of WORKSPACE_MARKERS) {
    const found = await access(join(dir, marker)).then(() => true, () => false)
    if (found) return true
  }
  return false
}

export async function findWorkspaceRoot(cwd: string): Promise<string | null> {
  let current = cwd
  while (true) {
    if (await hasMarker(current)) return current
    const parent = dirname(current)
    if (parent === current) return null   // reached filesystem root
    current = parent
  }
}
