import { stat, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { create as tarCreate } from 'tar'
import { randomUUID } from 'node:crypto'
import { extractArchive } from './extract.js'
import type { InstalledPackage } from '../workspace/paths.js'

export async function installFromLocal(
  target: string,
  destDir: string,
  depsFileDir?: string,
): Promise<InstalledPackage> {
  const rawPath = target.startsWith('file:') ? target.slice(5) : target
  const absPath = resolve(depsFileDir ?? process.cwd(), rawPath)

  const s = await stat(absPath)

  if (s.isDirectory()) {
    const tmp = await mkdtemp(join(tmpdir(), 'kpm-local-'))
    const tarFile = join(tmp, `${randomUUID()}.tar.gz`)
    try {
      await tarCreate({ gzip: true, file: tarFile, cwd: absPath }, ['.'])
      return await extractArchive(tarFile, destDir)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  }

  return extractArchive(absPath, destDir)
}
