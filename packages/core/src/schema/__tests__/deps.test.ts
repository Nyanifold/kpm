import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseKpmDependencies, writeKpmDependencies } from '../deps.js'

let dir: string
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'kpm-test-')) })
afterEach(async () => { await rm(dir, { recursive: true }) })

describe('parseKpmDependencies', () => {
  it('parses a valid toml deps file', async () => {
    await writeFile(join(dir, 'kpm-dependencies.toml'), `
[dependencies]
python-basics = "^1.2.0"
local-notes = "file:../shared-notes"
team-docs = "https://example.com/docs.tar.gz"
`.trim())
    const deps = await parseKpmDependencies(dir)
    expect(deps.dependencies['python-basics']).toBe('^1.2.0')
    expect(deps.dependencies['local-notes']).toBe('file:../shared-notes')
    expect(deps.dependencies['team-docs']).toBe('https://example.com/docs.tar.gz')
  })

  it('returns empty dependencies when file has no [dependencies]', async () => {
    await writeFile(join(dir, 'kpm-dependencies.toml'), '')
    const deps = await parseKpmDependencies(dir)
    expect(deps.dependencies).toEqual({})
  })

  it('throws when no deps file exists', async () => {
    await expect(parseKpmDependencies(dir)).rejects.toThrow('No kpm-dependencies file found')
  })

  it('throws on multiple formats', async () => {
    await writeFile(join(dir, 'kpm-dependencies.toml'), '[dependencies]')
    await writeFile(join(dir, 'kpm-dependencies.yaml'), 'dependencies: {}')
    await expect(parseKpmDependencies(dir)).rejects.toThrow('Multiple kpm-dependencies formats')
  })

  it('parses extra paths', async () => {
    await writeFile(join(dir, 'kpm-dependencies.toml'), `
[dependencies]
[paths]
extra = ["/data/shared"]
`.trim())
    const deps = await parseKpmDependencies(dir)
    expect(deps.paths?.extra).toEqual(['/data/shared'])
  })
})

describe('writeKpmDependencies', () => {
  it('round-trips through toml', async () => {
    const original = { dependencies: { 'python-basics': '^1.2.0' } }
    await writeKpmDependencies(dir, original, 'toml')
    const parsed = await parseKpmDependencies(dir)
    expect(parsed.dependencies['python-basics']).toBe('^1.2.0')
  })
})
