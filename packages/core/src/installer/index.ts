import { detectSource } from './detect.js'
import { installFromLocal } from './local.js'
import { installFromUrl } from './url.js'
import { installFromRegistry } from './registry.js'
import type { InstalledPackage } from '../workspace/paths.js'

async function installFromFirstRegistry(
  name: string,
  version: string,
  destDir: string,
  registries: string[] | undefined,
): Promise<InstalledPackage> {
  const DEFAULT_REGISTRY = ''
  const candidates = [
    ...(registries ?? []),
    process.env['KPM_REGISTRY'] ?? '',
    DEFAULT_REGISTRY,
  ].filter(Boolean)

  if (candidates.length === 0) {
    throw new Error(
      'No registry configured.\n' +
      '  Add a [[registries]] entry to kpm-dependencies.toml, or\n' +
      '  Set KPM_REGISTRY environment variable.\n' +
      '  Example: KPM_REGISTRY=https://your-worker.dev kpm add python-basics',
    )
  }

  const errors: string[] = []
  for (const url of candidates) {
    try {
      return await installFromRegistry(name, version, destDir, url)
    } catch (err) {
      errors.push(`  ${url}: ${(err as Error).message}`)
    }
  }
  throw new Error(
    `Package "${name}@${version}" not found in any registry:\n${errors.join('\n')}`,
  )
}

export interface InstallOptions {
  depsFileDir?: string
  /** Ordered list of registry URLs to try (from kpm-dependencies.toml). Falls back to KPM_REGISTRY env var. */
  registries?: string[]
}

export async function install(
  target: string,
  destDir: string,
  opts: InstallOptions = {},
): Promise<InstalledPackage> {
  const source = detectSource(target)

  switch (source) {
    case 'local':
      return installFromLocal(target, destDir, opts.depsFileDir)

    case 'url':
      return installFromUrl(target, destDir)

    case 'other-registry': {
      // registry+https://my-reg.com/pkg@1.0.0
      const withoutPrefix = target.slice('registry+'.length)
      const atIdx = withoutPrefix.lastIndexOf('@')
      if (atIdx < 0) throw new Error(`Invalid registry+ target (missing @version): ${target}`)
      const registryAndName = withoutPrefix.slice(0, atIdx)
      const version = withoutPrefix.slice(atIdx + 1)
      // Split URL and package name: last path segment is the name
      const url = new URL(registryAndName)
      const parts = url.pathname.split('/').filter(Boolean)
      const name = parts.pop()!
      url.pathname = parts.length > 0 ? '/' + parts.join('/') : ''
      return installFromRegistry(name, version, destDir, url.toString())
    }

    case 'registry': {
      const atIdx = target.indexOf('@')
      const name = atIdx >= 0 ? target.slice(0, atIdx) : target
      const version = atIdx >= 0 ? target.slice(atIdx + 1) : 'latest'
      return installFromFirstRegistry(name, version, destDir, opts.registries)
    }
  }
}

export { detectSource } from './detect.js'
export type { SourceType } from './detect.js'
export { detectArchiveFormat, extractArchive } from './extract.js'
