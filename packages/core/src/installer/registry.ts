import { installFromUrl } from './url.js'
import { resolveVersion } from '../resolver/index.js'
import type { InstalledPackage } from '../workspace/paths.js'

// TODO: fill in when a public default registry is available
const DEFAULT_REGISTRY = ''

export async function installFromRegistry(
  name: string,
  range: string,
  destDir: string,
  registryUrl?: string,
): Promise<InstalledPackage> {
  const url = registryUrl ?? process.env['KPM_REGISTRY'] ?? DEFAULT_REGISTRY
  if (!url) {
    throw new Error(
      'No registry configured.\n' +
      '  Set KPM_REGISTRY environment variable, or\n' +
      '  Use a file: path, or\n' +
      '  Use an https:// URL directly.\n' +
      `  Example: KPM_REGISTRY=https://your-worker.dev kpm add ${name}`,
    )
  }

  const baseUrl = url.replace(/\/+$/, '')
  const listRes = await fetch(`${baseUrl}/packages/${name}`)
  if (!listRes.ok) throw new Error(`Package not found: ${name} (${listRes.status})`)
  const ct = listRes.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(`Unexpected response from ${baseUrl} (expected JSON, got ${ct || 'no content type'})`)
  }
  const list = await listRes.json() as { versions: string[]; latest: string }

  const version = range === 'latest'
    ? list.latest
    : resolveVersion(range, list.versions)
  if (!version) throw new Error(`No version of ${name} satisfies range: ${range}`)

  const metaRes = await fetch(`${baseUrl}/packages/${name}/${version}`)
  if (!metaRes.ok) throw new Error(`Cannot fetch metadata for ${name}@${version}`)
  const meta = await metaRes.json() as { download_url: string }

  return installFromUrl(meta.download_url, destDir)
}
