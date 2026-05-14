import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseKpmMeta } from '../schema/meta.js'
import type { KpmMeta } from '../schema/meta.js'

async function exists(p: string): Promise<boolean> {
  return access(p).then(() => true, () => false)
}

async function findEntryFile(dir: string, name: string): Promise<string | null> {
  const candidates = [
    `${name}.md`,
    'index.md',
  ]
  const entries = await readdir(dir)
  for (const c of candidates) {
    if (entries.includes(c)) return c
  }
  // Language-tagged variants
  const langPattern = new RegExp(`^(${name}|index)\\.[a-z]{2}(-[A-Z]{2})?\\.md$`)
  const langMatch = entries.find(e => langPattern.test(e))
  if (langMatch) return langMatch
  return null
}

export interface ValidationResult {
  meta: KpmMeta
  entryFile: string
}

export async function validatePackDir(dir: string): Promise<ValidationResult> {
  const meta = await parseKpmMeta(dir)

  // Check README
  const entries = await readdir(dir)
  const hasReadme = entries.some(e => e === 'README.md' || /^README\.[a-z]/.test(e))
  if (!hasReadme) throw new Error(`Pack validation failed: no README.md found in ${dir}`)

  // Check entry file
  const entryFile = meta.entry ?? await findEntryFile(dir, meta.name)
  if (!entryFile || !(await exists(join(dir, entryFile)))) {
    throw new Error(`Pack validation failed: no entry file found in ${dir} (checked ${meta.entry ?? `${meta.name}.md, index.md`})`)
  }

  return { meta, entryFile }
}
