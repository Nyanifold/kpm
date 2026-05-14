import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listInstalled } from '../paths.js'

let base: string
beforeEach(async () => { base = await mkdtemp(join(tmpdir(), 'kpm-paths-')) })
afterEach(async () => { await rm(base, { recursive: true }) })

describe('listInstalled', () => {
  it('returns packages from knowledge_modules', async () => {
    const km = join(base, 'knowledge_modules')
    await mkdir(join(km, 'python-basics@1.2.0'), { recursive: true })
    await mkdir(join(km, 'algebra-basics@1.0.0'), { recursive: true })
    const pkgs = await listInstalled(km)
    expect(pkgs.map(p => p.name).sort()).toEqual(['algebra-basics', 'python-basics'])
    expect(pkgs.find(p => p.name === 'python-basics')?.version).toBe('1.2.0')
  })

  it('returns empty array when directory does not exist', async () => {
    expect(await listInstalled(join(base, 'knowledge_modules'))).toEqual([])
  })
})
