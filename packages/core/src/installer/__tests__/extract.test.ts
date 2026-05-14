import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { create as tarCreate } from 'tar'
import { extractArchive } from '../extract.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Test file is at packages/core/src/installer/__tests__/extract.test.ts
// Repo root is 5 levels up
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..')

let base: string
beforeEach(async () => { base = await mkdtemp(join(tmpdir(), 'kpm-extract-')) })
afterEach(async () => { await rm(base, { recursive: true }) })

async function buildTarGz(srcDir: string, destFile: string): Promise<void> {
  await tarCreate({ gzip: true, file: destFile, cwd: srcDir }, ['.'])
}

describe('extractArchive', () => {
  it('extracts tar.gz and returns installed package info', async () => {
    const src = join(REPO_ROOT, 'demo-packages', 'python-basics')
    const tarFile = join(base, 'python-basics.tar.gz')
    await buildTarGz(src, tarFile)

    const pkg = await extractArchive(tarFile, join(base, 'km'))
    expect(pkg.name).toBe('python-basics-kpm-demo')
    expect(pkg.version).toBe('1.2.0')

    const entries = await readdir(join(base, 'km'))
    expect(entries).toContain('python-basics-kpm-demo@1.2.0')
  })

  it('throws when kpm-meta.toml is missing from archive', async () => {
    const emptyDir = join(base, 'empty')
    await mkdir(emptyDir)
    await writeFile(join(emptyDir, 'README.md'), '# test')
    const tarFile = join(base, 'bad.tar.gz')
    await buildTarGz(emptyDir, tarFile)

    await expect(extractArchive(tarFile, join(base, 'km'))).rejects.toThrow('kpm-meta')
  })
})
