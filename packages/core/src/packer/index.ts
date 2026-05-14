import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { create as tarCreate } from 'tar'
import { validatePackDir } from './validate.js'
import { readKpmIgnore, shouldExclude } from './ignore.js'

export interface PackOptions {
  dryRun?: boolean
}

export interface PackResult {
  outputFile: string
  files: string[]
}

async function collectFiles(dir: string, base: string, patterns: string[]): Promise<string[]> {
  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const rel = relative(base, join(dir, entry.name))
    if (shouldExclude(rel, patterns)) continue
    if (entry.isDirectory()) {
      results.push(...await collectFiles(join(dir, entry.name), base, patterns))
    } else {
      results.push(rel)
    }
  }
  return results
}

export async function pack(srcDir: string, outDir: string, opts: PackOptions = {}): Promise<PackResult> {
  const { meta } = await validatePackDir(srcDir)
  const ignorePatterns = await readKpmIgnore(srcDir)

  // kpm-meta files are always included — remove from exclude patterns if present
  const effectivePatterns = ignorePatterns.filter(p => !p.includes('kpm-meta'))

  const files = await collectFiles(srcDir, srcDir, effectivePatterns)
  // Ensure kpm-meta file is always in the list
  const rootEntries = await readdir(srcDir)
  const metaFile = rootEntries.find(e => e.startsWith('kpm-meta.'))
  if (metaFile && !files.includes(metaFile)) {
    files.unshift(metaFile)
  }

  const outputFile = join(outDir, `${meta.name}@${meta.version}.tar.gz`)

  if (!opts.dryRun) {
    await tarCreate({ gzip: true, file: outputFile, cwd: srcDir, portable: true }, files)
  }

  return { outputFile, files }
}
