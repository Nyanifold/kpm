import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const ALWAYS_EXCLUDED = ['knowledge_modules', '.kpmignore', 'kpm-dependencies.toml', 'kpm-dependencies.yaml', 'kpm-dependencies.json', '.tmp', 'node_modules']

export async function readKpmIgnore(dir: string): Promise<string[]> {
  const ignorePath = join(dir, '.kpmignore')
  const ok = await access(ignorePath).then(() => true, () => false)
  const userPatterns = ok ? (await readFile(ignorePath, 'utf-8')).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')) : []
  return [...ALWAYS_EXCLUDED, ...userPatterns]
}

export function shouldExclude(relativePath: string, patterns: string[]): boolean {
  const parts = relativePath.split('/')
  for (const pattern of patterns) {
    const clean = pattern.replace(/\/$/, '')
    if (parts[0] === clean) return true
    if (relativePath === clean) return true
    // glob-style wildcard suffix
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1)
      if (relativePath.endsWith(ext)) return true
    }
  }
  return false
}
