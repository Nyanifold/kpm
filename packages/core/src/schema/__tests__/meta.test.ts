import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseKpmMeta, writeKpmMeta } from '../meta.js'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kpm-test-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true })
})

describe('parseKpmMeta', () => {
  it('parses a valid toml meta file', async () => {
    await writeFile(
      join(dir, 'kpm-meta.toml'),
      `
name = "python-basics"
version = "1.2.0"
description = "A beginner guide"
`.trim(),
    )
    const meta = await parseKpmMeta(dir)
    expect(meta.name).toBe('python-basics')
    expect(meta.version).toBe('1.2.0')
    expect(meta.description).toBe('A beginner guide')
  })

  it('throws when no meta file exists', async () => {
    await expect(parseKpmMeta(dir)).rejects.toThrow('No kpm-meta file found')
  })

  it('throws when name contains uppercase', async () => {
    await writeFile(join(dir, 'kpm-meta.toml'), 'name = "Python-Basics"\nversion = "1.0.0"')
    await expect(parseKpmMeta(dir)).rejects.toThrow()
  })

  it('throws when multiple formats coexist', async () => {
    await writeFile(join(dir, 'kpm-meta.toml'), 'name = "p"\nversion = "1.0.0"')
    await writeFile(join(dir, 'kpm-meta.json'), '{"name":"p","version":"1.0.0"}')
    await expect(parseKpmMeta(dir)).rejects.toThrow('Multiple kpm-meta formats')
  })

  it('parses a valid yaml meta file', async () => {
    await writeFile(join(dir, 'kpm-meta.yaml'), 'name: "from-yaml"\nversion: "1.0.0"')
    const meta = await parseKpmMeta(dir)
    expect(meta.name).toBe('from-yaml')
  })

  it('parses a valid json meta file', async () => {
    await writeFile(join(dir, 'kpm-meta.json'), '{"name":"from-json","version":"1.0.0"}')
    const meta = await parseKpmMeta(dir)
    expect(meta.name).toBe('from-json')
  })

  it('parses optional fields', async () => {
    await writeFile(
      join(dir, 'kpm-meta.toml'),
      `
name = "test-pkg"
version = "2.0.0"
authors = ["Alice <alice@example.com>"]
keywords = ["test", "demo"]
default_language = "en"
supported_languages = ["en", "zh-CN"]
entry = "test-pkg.md"

[recommendations]
"algebra-basics" = "^1.0.0"
`.trim(),
    )
    const meta = await parseKpmMeta(dir)
    expect(meta.authors).toEqual(['Alice <alice@example.com>'])
    expect(meta.recommendations).toEqual({ 'algebra-basics': '^1.0.0' })
  })
})

describe('writeKpmMeta', () => {
  it('writes toml and reads it back', async () => {
    const meta = { name: 'test-pkg', version: '1.0.0', description: 'hello' }
    await writeKpmMeta(dir, meta, 'toml')
    const parsed = await parseKpmMeta(dir)
    expect(parsed.name).toBe('test-pkg')
    expect(parsed.description).toBe('hello')
  })

  it('writes json and reads it back', async () => {
    const meta = { name: 'test-pkg', version: '1.0.0' }
    await writeKpmMeta(dir, meta, 'json')
    const parsed = await parseKpmMeta(dir)
    expect(parsed.name).toBe('test-pkg')
  })
})
