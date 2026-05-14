import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir, readdir, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extract as tarExtract } from 'tar'
import { pack } from '../index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Test file is at packages/core/src/packer/__tests__/packer.test.ts
// Repo root is 5 levels up
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..')

let base: string
beforeEach(async () => { base = await mkdtemp(join(tmpdir(), 'kpm-pack-')) })
afterEach(async () => { await rm(base, { recursive: true }) })

describe('pack', () => {
  it('packs demo-packages/python-basics into a tar.gz', async () => {
    const src = join(REPO_ROOT, 'demo-packages', 'python-basics')
    const outDir = join(base, 'out')
    await mkdir(outDir)
    const result = await pack(src, outDir)
    expect(result.outputFile).toMatch(/python-basics-kpm-demo@1\.2\.0\.tar\.gz$/)

    // Extract and verify kpm-meta.toml is at root
    const verifyDir = join(base, 'verify')
    await mkdir(verifyDir)
    await tarExtract({ file: result.outputFile, cwd: verifyDir })
    const entries = await readdir(verifyDir)
    expect(entries).toContain('kpm-meta.toml')
    expect(entries).toContain('python-basics-kpm-demo.md')
  })

  it('dry-run returns file list without writing', async () => {
    const src = join(REPO_ROOT, 'demo-packages', 'python-basics')
    const outDir = join(base, 'out')
    await mkdir(outDir)
    const result = await pack(src, outDir, { dryRun: true })
    expect(result.files.length).toBeGreaterThan(0)
    expect(result.files).toContain('kpm-meta.toml')
    // output file should not exist
    await expect(access(result.outputFile)).rejects.toThrow()
  })

  it('throws when no README exists', async () => {
    const pkgDir = join(base, 'nopkg')
    await mkdir(pkgDir)
    await writeFile(join(pkgDir, 'kpm-meta.toml'), 'name = "test"\nversion = "1.0.0"')
    await writeFile(join(pkgDir, 'index.md'), '# hi')
    await expect(pack(pkgDir, base)).rejects.toThrow('README')
  })

  it('throws when no entry file exists', async () => {
    const pkgDir = join(base, 'noentry')
    await mkdir(pkgDir)
    await writeFile(join(pkgDir, 'kpm-meta.toml'), 'name = "test"\nversion = "1.0.0"')
    await writeFile(join(pkgDir, 'README.md'), '# README')
    await expect(pack(pkgDir, base)).rejects.toThrow(/entry/i)
  })

  it('excludes knowledge_modules and kpm-dependencies.toml in file list', async () => {
    const src = join(REPO_ROOT, 'demo-packages', 'python-basics')
    const outDir = join(base, 'out')
    await mkdir(outDir)
    const result = await pack(src, outDir, { dryRun: true })
    expect(result.files).not.toContain('knowledge_modules')
    expect(result.files).not.toContain('kpm-dependencies.toml')
  })
})
