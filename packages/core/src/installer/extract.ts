import { extract as tarExtract } from 'tar'
import AdmZip from 'adm-zip'
import { mkdtemp, rm, rename, mkdir, access } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { parseKpmMeta } from '../schema/meta.js'
import type { InstalledPackage } from '../workspace/paths.js'

type ArchiveFormat = 'tar.gz' | 'tar' | 'zip'

export function detectArchiveFormat(filePath: string): ArchiveFormat {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz'
  if (lower.endsWith('.tar')) return 'tar'
  if (lower.endsWith('.zip')) return 'zip'
  throw new Error(`Cannot detect archive format for: ${filePath}`)
}

async function extractTo(archivePath: string, format: ArchiveFormat, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true })
  if (format === 'tar.gz' || format === 'tar') {
    await tarExtract({ file: archivePath, cwd: dest, strip: 0 })
  } else {
    const zip = new AdmZip(archivePath)
    zip.extractAllTo(dest, true)
  }
}

export async function extractArchive(
  archivePath: string,
  destDir: string,
): Promise<InstalledPackage> {
  const format = detectArchiveFormat(archivePath)
  const tmpBase = join(destDir, '.tmp')
  await mkdir(tmpBase, { recursive: true })
  const tmpDest = join(tmpBase, randomUUID())

  try {
    await extractTo(archivePath, format, tmpDest)

    const meta = await parseKpmMeta(tmpDest).catch(() => {
      throw new Error(`kpm-meta.toml not found at root of archive: ${basename(archivePath)}`)
    })

    const finalDir = join(destDir, `${meta.name}@${meta.version}`)

    // If same version already installed, skip
    const alreadyExists = await access(finalDir).then(() => true, () => false)
    if (alreadyExists) {
      await rm(tmpDest, { recursive: true })
      return { name: meta.name, version: meta.version, dir: finalDir }
    }

    await rename(tmpDest, finalDir)
    return { name: meta.name, version: meta.version, dir: finalDir }
  } catch (err) {
    await rm(tmpDest, { recursive: true, force: true })
    throw err
  } finally {
    // tmpBase (.tmp/) may be left as an empty directory after rename; always clean up
    await rm(tmpBase, { recursive: true, force: true })
  }
}
