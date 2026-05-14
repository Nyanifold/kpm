/**
 * Seed script for KPM registry.
 *
 * Packs demo packages and outputs wrangler commands to upload them to
 * Cloudflare R2 and D1. No external dependencies required — uses only
 * Bun built-ins and system tar.
 *
 *   bun run packages/registry/scripts/seed.ts
 *
 * Setup steps (one-time):
 *   1. wrangler r2 bucket create kpm-archives
 *   2. wrangler d1 create kpm-registry
 *   3. Paste the database_id into packages/registry/wrangler.toml
 *   4. wrangler d1 execute kpm-registry --file=packages/registry/schema.sql
 */

import { readFile, readdir, mkdtemp, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DEMO_ROOT = resolve(import.meta.dir, '../../../demo-packages')

interface Meta {
  name: string
  version: string
  description: string
  authors: string[]
}

// Minimal TOML parser for kpm-meta.toml — handles the subset we need.
function parseKpmMetaToml(content: string): Meta {
  const meta: Record<string, unknown> = {}
  let currentKey = ''
  let inArray = false
  const arrayValues: string[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    // skip comments and blanks
    if (!trimmed || trimmed.startsWith('#')) continue

    if (inArray) {
      const arrMatch = trimmed.match(/^"(.+)"$/)
      if (arrMatch) arrayValues.push(arrMatch[1])
      if (trimmed === ']') {
        meta[currentKey] = [...arrayValues]
        arrayValues.length = 0
        inArray = false
      }
      continue
    }

    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
    if (!kvMatch) continue

    const key = kvMatch[1]
    let value = kvMatch[2]

    // strip trailing comment
    const commentIdx = value.indexOf('#')
    if (commentIdx >= 0) value = value.slice(0, commentIdx).trimEnd()

    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = [...value.slice(1, -1).matchAll(/"([^"]*)"/g)].map(m => m[1])
      continue
    }

    if (value === '[') {
      currentKey = key
      inArray = true
      continue
    }

    // quoted string
    const strMatch = value.match(/^"(.*)"$/)
    if (strMatch) {
      meta[key] = strMatch[1]
    } else {
      meta[key] = value
    }
  }

  return {
    name: String(meta['name'] ?? ''),
    version: String(meta['version'] ?? ''),
    description: String(meta['description'] ?? ''),
    authors: (meta['authors'] as string[]) ?? [],
  }
}

async function readKpmMeta(pkgDir: string): Promise<Meta> {
  const entries = await readdir(pkgDir)
  const metaFile = entries.find(
    e => e.startsWith('kpm-meta.') && !e.endsWith('.yaml') && !e.endsWith('.json'),
  )
  if (!metaFile) throw new Error(`No kpm-meta file in ${pkgDir}`)
  const content = await readFile(join(pkgDir, metaFile), 'utf-8')
  if (metaFile.endsWith('.toml')) return parseKpmMetaToml(content)
  // YAML/JSON: delegate to Bun's built-in capabilities
  if (metaFile.endsWith('.yaml') || metaFile.endsWith('.yml')) {
    // Use Bun's native YAML support (no external dep needed in Bun 1.2+)
    const raw = Bun.file(join(pkgDir, metaFile))
    return (await raw.json()) as Meta
  }
  return JSON.parse(content) as Meta
}

async function packDir(srcDir: string, outDir: string): Promise<string> {
  const meta = await readKpmMeta(srcDir)
  const outputFile = join(outDir, `${meta.name}@${meta.version}.tar.gz`)

  const proc = Bun.spawnSync(
    ['tar', '-czf', outputFile, '-C', srcDir, '.'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  if (proc.exitCode !== 0) {
    throw new Error(`tar failed: ${proc.stderr.toString()}`)
  }
  return outputFile
}

async function main() {
  const tmpDir = await mkdtemp(join(tmpdir(), 'kpm-seed-'))

  try {
    const entries = await readdir(DEMO_ROOT, { withFileTypes: true })
    const pkgDirs = entries.filter(e => e.isDirectory()).map(e => e.name)

    console.log('# Seed KPM registry with demo packages\n')

    const sqlStatements: string[] = []
    const uploadCommands: string[] = []

    for (const name of pkgDirs) {
      const srcDir = join(DEMO_ROOT, name)
      const meta = await readKpmMeta(srcDir)

      console.log(`  Packing ${srcDir}...`)
      const outputFile = await packDir(srcDir, tmpDir)
      console.log(`    → ${outputFile}`)

      uploadCommands.push(
        `wrangler r2 object put kpm-archives/${meta.name}@${meta.version}.tar.gz --file="${outputFile}"`,
      )

      sqlStatements.push(
        `INSERT INTO packages (name, version, description, authors, checksum) VALUES (` +
          `'${meta.name}', ` +
          `'${meta.version}', ` +
          `'${(meta.description ?? '').replace(/'/g, "''")}', ` +
          `'${JSON.stringify(meta.authors ?? [])}', ` +
          `''` +
          `);`,
      )
    }

    console.log('\n# Run these wrangler commands to seed the registry:\n')

    console.log('  # Upload archives to R2:')
    uploadCommands.forEach(c => console.log(`  ${c}`))

    // Write seed SQL file to avoid shell escaping issues
    const seedFile = join(tmpDir, 'seed.sql')
    const sqlContent = sqlStatements.join('\n') + '\n'
    await Bun.write(seedFile, sqlContent)
    console.log(`\n  # Seed SQL written to: ${seedFile}`)
    console.log(`  wrangler d1 execute kpm-registry --file="${seedFile}"`)
  } finally {
    await rm(tmpDir, { recursive: true })
  }
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
