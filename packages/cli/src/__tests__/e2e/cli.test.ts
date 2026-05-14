import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startMockRegistry, type MockRegistry } from './mock-registry.js'
import { kpm } from './helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMO_ROOT = resolve(__dirname, '../../../../../demo-packages')

let registry: MockRegistry
let workspace: string

beforeAll(async () => {
  registry = await startMockRegistry()
})

afterAll(() => {
  registry.stop()
})

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'kpm-e2e-'))
  kpm(['init', '--workspace'], { cwd: workspace })
})

afterEach(async () => {
  await rm(workspace, { recursive: true })
})

describe('kpm init', () => {
  it('creates kpm-dependencies.toml', async () => {
    const depsPath = join(workspace, 'kpm-dependencies.toml')
    await expect(access(depsPath)).resolves.toBeUndefined()
  })
})

describe('kpm add (registry)', () => {
  const PKG = 'python-basics-kpm-demo'

  it('installs a package and records it in deps', () => {
    const result = kpm(['add', PKG], {
      cwd: workspace,
      env: { KPM_REGISTRY: registry.url },
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`+ ${PKG}@`)
    expect(result.stdout).toContain('kpm-dependencies.toml')
  })

  it('errors when package already installed and stdin is not TTY', () => {
    const setup = kpm(['add', PKG], { cwd: workspace, env: { KPM_REGISTRY: registry.url } })
    expect(setup.exitCode, `setup: add ${PKG}`).toBe(0)
    const result = kpm(['add', PKG], {
      cwd: workspace,
      env: { KPM_REGISTRY: registry.url },
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('already installed')
    expect(result.stderr).toContain('--force')
  })

  it('replaces existing version when --force is passed', () => {
    const setup = kpm(['add', PKG], { cwd: workspace, env: { KPM_REGISTRY: registry.url } })
    expect(setup.exitCode, `setup: add ${PKG}`).toBe(0)
    const result = kpm(['add', '--force', PKG], {
      cwd: workspace,
      env: { KPM_REGISTRY: registry.url },
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`+ ${PKG}@`)
  })
})

describe('kpm add (local file)', () => {
  it('installs from a local directory', () => {
    const src = join(DEMO_ROOT, 'algebra-basics')
    const result = kpm(['add', `file:${src}`], { cwd: workspace })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('+ algebra-basics-kpm-demo@')
  })
})

describe('kpm remove', () => {
  const PKG = 'python-basics-kpm-demo'

  it('removes an installed package and clears deps', async () => {
    const setup = kpm(['add', PKG], { cwd: workspace, env: { KPM_REGISTRY: registry.url } })
    expect(setup.exitCode, `setup: add ${PKG}`).toBe(0)
    const result = kpm(['remove', PKG], { cwd: workspace })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`- ${PKG}@`)
    expect(result.stdout).toContain('kpm-dependencies.toml')

    const km = join(workspace, 'knowledge_modules')
    const entries = await readdir(km).catch(() => [])
    expect(entries.some(e => e.startsWith(PKG))).toBe(false)
  })

  it('warns (does not error) when package is not installed', async () => {
    const result = kpm(['remove', 'nonexistent-package'], { cwd: workspace })
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toContain('Warning')
    expect(result.stdout).toContain('kpm-dependencies.toml')
  })
})

describe('kpm update', () => {
  it('runs without error when deps are declared', () => {
    const setup = kpm(['add', 'python-basics-kpm-demo'], { cwd: workspace, env: { KPM_REGISTRY: registry.url } })
    expect(setup.exitCode, 'setup: add python-basics-kpm-demo').toBe(0)
    const result = kpm(['update'], {
      cwd: workspace,
      env: { KPM_REGISTRY: registry.url },
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/python-basics-kpm-demo/)
  })
})

describe('kpm list', () => {
  it('lists installed packages', () => {
    const setup = kpm(['add', 'python-basics-kpm-demo'], { cwd: workspace, env: { KPM_REGISTRY: registry.url } })
    expect(setup.exitCode, 'setup: add python-basics-kpm-demo').toBe(0)
    const result = kpm(['list'], { cwd: workspace })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('python-basics-kpm-demo@')
  })
})
