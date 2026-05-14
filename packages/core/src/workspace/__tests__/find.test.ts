import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findWorkspaceRoot } from '../find.js'

let base: string
beforeEach(async () => { base = await mkdtemp(join(tmpdir(), 'kpm-ws-')) })
afterEach(async () => { await rm(base, { recursive: true }) })

describe('findWorkspaceRoot', () => {
  it('returns dir when kpm-dependencies.toml is present', async () => {
    await writeFile(join(base, 'kpm-dependencies.toml'), '')
    expect(await findWorkspaceRoot(base)).toBe(base)
  })

  it('returns dir when kpm-meta.toml is present', async () => {
    await writeFile(join(base, 'kpm-meta.toml'), '')
    expect(await findWorkspaceRoot(base)).toBe(base)
  })

  it('walks up to find root', async () => {
    await writeFile(join(base, 'kpm-dependencies.toml'), '')
    const nested = join(base, 'a', 'b', 'c')
    await mkdir(nested, { recursive: true })
    expect(await findWorkspaceRoot(nested)).toBe(base)
  })

  it('stops at inner workspace (independence)', async () => {
    await writeFile(join(base, 'kpm-dependencies.toml'), '')
    const inner = join(base, 'subproject')
    await mkdir(inner)
    await writeFile(join(inner, 'kpm-dependencies.toml'), '')
    const deep = join(inner, 'src')
    await mkdir(deep)
    expect(await findWorkspaceRoot(deep)).toBe(inner)
  })

  it('returns null when no marker found', async () => {
    expect(await findWorkspaceRoot(base)).toBeNull()
  })
})
