import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { install } from '../index.js'
import { detectSource } from '../detect.js'

let destDir: string
beforeEach(async () => { destDir = await mkdtemp(join(tmpdir(), 'kpm-install-')) })
afterEach(async () => { await rm(destDir, { recursive: true }) })

describe('detectSource', () => {
  it('detects file: prefix', () => expect(detectSource('file:../foo')).toBe('local'))
  it('detects https:// url', () => expect(detectSource('https://example.com/pkg.tar.gz')).toBe('url'))
  it('detects registry+ prefix', () => expect(detectSource('registry+https://my-reg.com/pkg@1.0.0')).toBe('other-registry'))
  it('detects bare name as registry', () => expect(detectSource('python-basics-kpm-demo')).toBe('registry'))
  it('detects name@version as registry', () => expect(detectSource('python-basics-kpm-demo@1.2.0')).toBe('registry'))
})

describe('install from local path', () => {
  it('installs a package from a local directory', async () => {
    const src = resolve(process.cwd(), '..', '..', 'demo-packages', 'python-basics')
    const pkg = await install(`file:${src}`, destDir)
    expect(pkg.name).toBe('python-basics-kpm-demo')
    expect(pkg.version).toBe('1.2.0')
    const entries = await readdir(destDir)
    expect(entries).toContain('python-basics-kpm-demo@1.2.0')
  })

  it('installs all three demo packages', async () => {
    const pkgNames = ['python-basics', 'cpp-basics', 'algebra-basics']
    for (const name of pkgNames) {
      const src = resolve(process.cwd(), '..', '..', 'demo-packages', name)
      await install(`file:${src}`, destDir)
    }
    const entries = await readdir(destDir)
    expect(entries.filter(e => !e.startsWith('.'))).toHaveLength(3)
  })
})
