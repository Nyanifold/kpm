import { z } from 'zod'
import TOML from '@iarna/toml'
import yaml from 'js-yaml'
import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

export const KpmDependenciesSchema = z.object({
  registries: z.array(z.string().url()).optional(),
  dependencies: z.record(z.string()).default({}),
  paths: z.object({
    extra: z.array(z.string()).optional(),
  }).optional(),
})

export type KpmDependencies = z.infer<typeof KpmDependenciesSchema>

const DEPS_CANDIDATES = ['kpm-dependencies.toml', 'kpm-dependencies.yaml', 'kpm-dependencies.json'] as const

async function exists(p: string): Promise<boolean> {
  return access(p).then(() => true, () => false)
}

export async function parseKpmDependencies(dir: string): Promise<KpmDependencies> {
  const found: string[] = []
  for (const fn of DEPS_CANDIDATES) {
    if (await exists(join(dir, fn))) found.push(fn)
  }
  if (found.length > 1) throw new Error(`Multiple kpm-dependencies formats found in ${dir}: ${found.join(', ')}`)
  if (found.length === 0) throw new Error(`No kpm-dependencies file found in ${dir}`)

  const filepath = join(dir, found[0])
  const content = await readFile(filepath, 'utf-8')
  let raw: unknown
  if (found[0].endsWith('.toml')) raw = TOML.parse(content)
  else if (found[0].endsWith('.yaml')) raw = yaml.load(content)
  else raw = JSON.parse(content)

  return KpmDependenciesSchema.parse(raw ?? {})
}

export async function writeKpmDependencies(
  dir: string,
  deps: KpmDependencies,
  format: 'toml' | 'yaml' | 'json' = 'toml',
): Promise<void> {
  let content: string
  if (format === 'toml') content = TOML.stringify(deps as TOML.JsonMap)
  else if (format === 'yaml') content = yaml.dump(deps)
  else content = JSON.stringify(deps, null, 2) + '\n'

  const ext = format === 'toml' ? '.toml' : format === 'yaml' ? '.yaml' : '.json'
  await writeFile(join(dir, `kpm-dependencies${ext}`), content, 'utf-8')
}

/** Find which deps file exists in dir, returning its path and format. */
async function findDepsFile(dir: string): Promise<{ path: string; format: 'toml' | 'yaml' | 'json' } | null> {
  for (const fn of DEPS_CANDIDATES) {
    const p = join(dir, fn)
    if (await exists(p)) {
      const format = fn.endsWith('.toml') ? 'toml' : fn.endsWith('.yaml') ? 'yaml' : 'json'
      return { path: p, format }
    }
  }
  return null
}

/**
 * Set a single dependency entry in the existing deps file without disturbing
 * comments, empty fields, or other sections. Falls back to writeKpmDependencies
 * if no file exists yet or the format is JSON.
 */
export async function setKpmDependency(dir: string, name: string, specifier: string): Promise<void> {
  const found = await findDepsFile(dir)

  if (!found || found.format === 'json') {
    const deps = found
      ? KpmDependenciesSchema.parse(JSON.parse(await readFile(found.path, 'utf-8')))
      : { dependencies: {} }
    deps.dependencies[name] = specifier
    await writeKpmDependencies(dir, deps, found?.format ?? 'toml')
    return
  }

  let text = await readFile(found.path, 'utf-8')

  if (found.format === 'toml') {
    text = upsertTomlDep(text, name, specifier)
  } else {
    text = upsertYamlDep(text, name, specifier)
  }

  await writeFile(found.path, text, 'utf-8')
}

/** Insert or replace `name = "specifier"` inside the [dependencies] section. */
function upsertTomlDep(text: string, name: string, specifier: string): string {
  const line = `${name} = "${specifier}"`
  // Match existing key (quoted or unquoted)
  const keyPattern = new RegExp(`^[ \\t]*(?:"${escapeRegex(name)}"|${escapeRegex(name)})[ \\t]*=.*$`, 'm')

  if (keyPattern.test(text)) {
    return text.replace(keyPattern, line)
  }

  // Find [dependencies] section and append before the next section or EOF
  const sectionMatch = text.match(/^(\[dependencies\][ \t]*)$/m)
  if (!sectionMatch || sectionMatch.index === undefined) {
    // No [dependencies] section — append one
    return text.trimEnd() + `\n\n[dependencies]\n${line}\n`
  }

  const afterSection = sectionMatch.index + sectionMatch[0].length
  const nextSection = text.slice(afterSection).search(/^\[(?![\[])/m)
  const insertAt = nextSection === -1
    ? text.length
    : afterSection + nextSection

  const before = text.slice(0, insertAt).replace(/\n+$/, '')
  const after = text.slice(insertAt)
  return `${before}\n${line}\n${after.startsWith('\n') ? after : '\n' + after}`
}

/** Insert or replace `"name": "specifier"` inside the dependencies mapping. */
function upsertYamlDep(text: string, name: string, specifier: string): string {
  const line = `  "${name}": "${specifier}"`
  const keyPattern = new RegExp(`^[ \\t]+(?:"${escapeRegex(name)}"|${escapeRegex(name)}):.*$`, 'm')

  if (keyPattern.test(text)) {
    return text.replace(keyPattern, line)
  }

  const sectionMatch = text.match(/^dependencies:[ \t]*$/m)
  if (!sectionMatch || sectionMatch.index === undefined) {
    return text.trimEnd() + `\n\ndependencies:\n${line}\n`
  }

  const afterSection = sectionMatch.index + sectionMatch[0].length
  // Find next top-level key (non-indented, non-comment line)
  const nextKey = text.slice(afterSection).search(/^[^\s#]/m)
  const insertAt = nextKey === -1 ? text.length : afterSection + nextKey

  const before = text.slice(0, insertAt).replace(/\n+$/, '')
  const after = text.slice(insertAt)
  return `${before}\n${line}\n${after.startsWith('\n') ? after : '\n' + after}`
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
