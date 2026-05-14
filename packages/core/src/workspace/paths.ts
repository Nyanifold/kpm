import { readdir, access } from 'node:fs/promises'
import { join } from 'node:path'

export interface InstalledPackage {
  name: string
  version: string
  dir: string
}

function parseInstalledDir(entry: string): { name: string; version: string } | null {
  const at = entry.lastIndexOf('@')
  if (at <= 0) return null
  return { name: entry.slice(0, at), version: entry.slice(at + 1) }
}

export async function listInstalled(knowledgeModulesDir: string): Promise<InstalledPackage[]> {
  const ok = await access(knowledgeModulesDir).then(() => true, () => false)
  if (!ok) return []

  const entries = await readdir(knowledgeModulesDir)
  const results: InstalledPackage[] = []
  for (const entry of entries) {
    const parsed = parseInstalledDir(entry)
    if (parsed) {
      results.push({ ...parsed, dir: join(knowledgeModulesDir, entry) })
    }
  }
  return results
}

export async function findInstalledPackage(
  name: string,
  searchPaths: string[],
): Promise<InstalledPackage | null> {
  for (const p of searchPaths) {
    const pkgs = await listInstalled(p)
    const found = pkgs.find(pkg => pkg.name === name)
    if (found) return found
  }
  return null
}

export async function resolveSearchPaths(
  workspaceRoot: string,
  workspaceExtra?: string[],
): Promise<string[]> {
  const paths: string[] = []

  // 1. workspace local — writable, managed by kpm add/remove/update
  paths.push(join(workspaceRoot, 'knowledge_modules'))

  // 2. KPM_PATH — read-only external collections (team shared dirs, system libraries).
  //    kpm add/remove/update never write here; only list/paths/search read from here.
  const kpmPath = process.env['KPM_PATH']
  if (kpmPath) paths.push(...kpmPath.split(':').filter(Boolean))

  // 3. workspace [paths].extra — additional read-only locations declared in kpm-dependencies.toml
  if (workspaceExtra) paths.push(...workspaceExtra)

  return paths
}
