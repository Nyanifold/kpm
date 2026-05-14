import { createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { extractArchive } from './extract.js'
import type { InstalledPackage } from '../workspace/paths.js'

function filenameFromResponse(res: Response, url: string): string {
  const disposition = res.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename="([^"]+)"/)
  if (match) return match[1]
  const fromUrl = basename(new URL(url).pathname)
  if (fromUrl && fromUrl.includes('.')) return fromUrl
  return 'package.tar.gz'
}

export async function installFromUrl(url: string, destDir: string): Promise<InstalledPackage> {
  const tmp = await mkdtemp(join(tmpdir(), 'kpm-url-'))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  if (!res.body) throw new Error(`No response body from ${url}`)
  const filename = filenameFromResponse(res, url)
  const destFile = join(tmp, filename)

  try {
    await pipeline(Readable.fromWeb(res.body as import('stream/web').ReadableStream), createWriteStream(destFile))
    return await extractArchive(destFile, destDir)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
