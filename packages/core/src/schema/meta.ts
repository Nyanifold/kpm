import { z } from 'zod'
import TOML from '@iarna/toml'
import yaml from 'js-yaml'
import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

export const KpmMetaSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, 'name must match /^[a-z0-9-]+$/'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'version must be valid semver (x.y.z)'),
  description: z.string().optional(),
  authors: z.array(z.string()).optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  default_language: z.string().optional(),
  supported_languages: z.array(z.string()).optional(),
  entry: z.string().optional(),
  recommendations: z.record(z.string()).optional(),
})

export type KpmMeta = z.infer<typeof KpmMetaSchema>

const META_CANDIDATES = ['kpm-meta.toml', 'kpm-meta.yaml', 'kpm-meta.json'] as const

async function exists(p: string): Promise<boolean> {
  return access(p).then(() => true, () => false)
}

export async function parseKpmMeta(dir: string): Promise<KpmMeta> {
  const found: string[] = []
  for (const fn of META_CANDIDATES) {
    if (await exists(join(dir, fn))) found.push(fn)
  }
  if (found.length > 1)
    throw new Error(`Multiple kpm-meta formats found in ${dir}: ${found.join(', ')}`)
  if (found.length === 0) throw new Error(`No kpm-meta file found in ${dir}`)

  const filepath = join(dir, found[0])
  const content = await readFile(filepath, 'utf-8')
  let raw: unknown
  if (found[0].endsWith('.toml')) raw = TOML.parse(content)
  else if (found[0].endsWith('.yaml')) raw = yaml.load(content)
  else raw = JSON.parse(content)

  return KpmMetaSchema.parse(raw)
}

export async function writeKpmMeta(
  dir: string,
  meta: KpmMeta,
  format: 'toml' | 'yaml' | 'json' = 'toml',
): Promise<void> {
  let content: string
  if (format === 'toml') content = TOML.stringify(meta as TOML.JsonMap)
  else if (format === 'yaml') content = yaml.dump(meta)
  else content = JSON.stringify(meta, null, 2) + '\n'

  const ext = format === 'toml' ? '.toml' : format === 'yaml' ? '.yaml' : '.json'
  await writeFile(join(dir, `kpm-meta${ext}`), content, 'utf-8')
}
