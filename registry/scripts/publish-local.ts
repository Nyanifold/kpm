/**
 * Publish a KPM package to a self-hosted registry.
 *
 * Usage:
 *   bun run registry/scripts/publish-local.ts <data-dir> <source>
 *
 * <data-dir>  Path to the registry data directory (contains kpm-registry.sqlite
 *             and archives/). Created automatically if it doesn't exist.
 *
 * <source> can be:
 *   - A local directory  (packed with tar)
 *   - A local .tar.gz    (used as-is)
 *   - An http/https URL  (downloaded first)
 */

import { Database } from 'bun:sqlite'
import { mkdtemp, rm, stat, copyFile, readFile } from 'node:fs/promises'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, basename } from 'node:path'

interface Meta {
  name: string
  version: string
  description: string
  authors: string[]
}

// ---------------------------------------------------------------------------
// TOML parser
// ---------------------------------------------------------------------------

function parseKpmMetaToml(content: string): Meta {
  const meta: Record<string, unknown> = {}
  let currentKey = ''
  let inArray = false
  const arrayValues: string[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
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
    const commentIdx = value.indexOf('#')
    if (commentIdx >= 0) value = value.slice(0, commentIdx).trimEnd()
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = [...value.slice(1, -1).matchAll(/"([^"]*)"/g)].map(m => m[1])
      continue
    }
    if (value === '[') { currentKey = key; inArray = true; continue }
    const strMatch = value.match(/^"(.*)"$/)
    meta[key] = strMatch ? strMatch[1] : value
  }

  return {
    name: String(meta['name'] ?? ''),
    version: String(meta['version'] ?? ''),
    description: String(meta['description'] ?? ''),
    authors: (meta['authors'] as string[]) ?? [],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function step(n: number, total: number, msg: string) {
  console.log(`[${n}/${total}] ${msg}`)
}

function run(cmd: string[]): void {
  console.log(`    $ ${cmd.join(' ')}`)
  const proc = Bun.spawnSync(cmd, { stdout: 'inherit', stderr: 'inherit' })
  if (proc.exitCode !== 0) {
    throw new Error(`Command failed (exit ${proc.exitCode}): ${cmd.join(' ')}`)
  }
}

async function sha256(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(await readFile(path))
  return hasher.digest('hex')
}

async function extractMeta(archivePath: string): Promise<Meta> {
  const list = Bun.spawnSync(['tar', '-tf', archivePath], { stdout: 'pipe', stderr: 'pipe' })
  if (list.exitCode !== 0) throw new Error(`tar list failed: ${list.stderr.toString()}`)

  const files = list.stdout.toString().split('\n').map(l => l.trim()).filter(Boolean)
  const metaEntry = files.find(f => /kpm-meta\.(toml|yaml|yml|json)$/.test(f))
  if (!metaEntry) throw new Error('kpm-meta file not found inside archive')

  const extract = Bun.spawnSync(['tar', '-xOf', archivePath, metaEntry], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (extract.exitCode !== 0) throw new Error(`tar extract failed: ${extract.stderr.toString()}`)

  const content = extract.stdout.toString()
  if (metaEntry.endsWith('.toml')) return parseKpmMetaToml(content)
  return JSON.parse(content) as Meta
}

async function packDir(srcDir: string, outDir: string): Promise<string> {
  const glob = new Bun.Glob('kpm-meta.{toml,yaml,yml,json}')
  const entries = [...glob.scanSync(srcDir)]
  if (entries.length === 0) throw new Error(`No kpm-meta file found in ${srcDir}`)
  const content = await Bun.file(join(srcDir, entries[0])).text()
  const meta = entries[0].endsWith('.toml') ? parseKpmMetaToml(content) : JSON.parse(content) as Meta
  const outFile = join(outDir, `${meta.name}@${meta.version}.tar.gz`)
  run(['tar', '-czf', outFile, '-C', srcDir, '.'])
  return outFile
}

async function download(url: string, destDir: string): Promise<string> {
  const filename = basename(new URL(url).pathname) || 'package.tar.gz'
  const destPath = join(destDir, filename)
  console.log(`    URL      : ${url}`)
  console.log(`    Save to  : ${destPath}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  await Bun.write(destPath, res)
  const size = (Bun.file(destPath).size / 1024).toFixed(1)
  console.log(`    Size     : ${size} KB`)
  return destPath
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [dataArg, sourceArg] = process.argv.slice(2)

  if (!dataArg || !sourceArg) {
    console.error('Usage: bun run registry/scripts/publish-local.ts <data-dir> <source>')
    console.error('  source: local directory | local .tar.gz | https://...')
    process.exit(1)
  }

  const TOTAL = 5
  const dataDir = resolve(dataArg)
  const archivesDir = join(dataDir, 'archives')
  const dbPath = join(dataDir, 'kpm-registry.sqlite')

  console.log(`\nPublishing to self-hosted registry\n`)

  // Step 1 — ensure data directory exists
  step(1, TOTAL, 'Preparing data directory')
  const freshDir = !existsSync(archivesDir)
  mkdirSync(archivesDir, { recursive: true })
  console.log(`    Data dir : ${dataDir}`)
  console.log(`    Archives : ${archivesDir}${freshDir ? ' (created)' : ''}`)
  console.log(`    Database : ${dbPath}${existsSync(dbPath) ? '' : ' (will be created)'}`)

  const tmpDir = await mkdtemp(join(tmpdir(), 'kpm-publish-'))

  try {
    // Step 2 — resolve source to a .tar.gz
    let archivePath: string
    if (/^https?:\/\//.test(sourceArg)) {
      step(2, TOTAL, 'Downloading archive')
      archivePath = await download(sourceArg, tmpDir)
    } else {
      const abs = resolve(sourceArg)
      const info = await stat(abs)
      if (info.isDirectory()) {
        step(2, TOTAL, 'Packing directory → .tar.gz')
        console.log(`    Source   : ${abs}`)
        archivePath = await packDir(abs, tmpDir)
        console.log(`    Output   : ${archivePath}`)
      } else {
        step(2, TOTAL, 'Using local archive')
        console.log(`    File     : ${abs}`)
        archivePath = abs
      }
    }

    // Step 3 — read metadata and compute checksum
    step(3, TOTAL, 'Reading metadata and computing checksum')
    const meta = await extractMeta(archivePath)
    if (!meta.name || !meta.version) {
      throw new Error(`Invalid metadata: name="${meta.name}" version="${meta.version}"`)
    }
    const checksum = await sha256(archivePath)
    const size = (Bun.file(archivePath).size / 1024).toFixed(1)
    console.log(`    Package  : ${meta.name}@${meta.version}`)
    console.log(`    Desc     : ${meta.description}`)
    console.log(`    Authors  : ${meta.authors.join(', ') || '(none)'}`)
    console.log(`    Size     : ${size} KB`)
    console.log(`    SHA-256  : ${checksum}`)

    // Step 4 — copy archive to data directory
    const destFile = join(archivesDir, `${meta.name}@${meta.version}.tar.gz`)
    step(4, TOTAL, 'Copying archive to data directory')
    console.log(`    From     : ${archivePath}`)
    console.log(`    To       : ${destFile}`)
    await copyFile(archivePath, destFile)

    // Step 5 — upsert metadata into SQLite
    step(5, TOTAL, 'Updating SQLite database')
    const schemaPath = resolve(import.meta.dir, '../schema.sql')
    const db = new Database(dbPath)
    db.run('PRAGMA journal_mode = WAL')
    db.run(readFileSync(schemaPath, 'utf-8'))
    console.log(`    SQL      : INSERT OR REPLACE INTO packages (${meta.name}, ${meta.version}, ...)`)
    db.prepare(
      `INSERT OR REPLACE INTO packages (name, version, description, authors, checksum)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      meta.name,
      meta.version,
      meta.description ?? '',
      JSON.stringify(meta.authors ?? []),
      checksum,
    )
    db.close()
    console.log(`    DB path  : ${dbPath}`)

    console.log(`\n✓ Published ${meta.name}@${meta.version}\n`)
  } finally {
    await rm(tmpDir, { recursive: true })
  }
}

main().catch(err => {
  console.error('\nPublish failed:', err.message)
  process.exit(1)
})
