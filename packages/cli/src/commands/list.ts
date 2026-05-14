import { Command } from 'commander'
import { findWorkspaceRoot, resolveSearchPaths, listInstalled } from '@nyanifold/kpm-core'
import { resolve } from 'node:path'

export function registerList(program: Command): void {
  program
    .command('list [path]')
    .description('List installed knowledge packages')
    .option('-a, --all', 'show packages across all KPM search paths')
    .option('--json', 'output as JSON')
    .addHelpText('after', `
Examples:
  $ kpm list                        List packages in current workspace
  $ kpm list ./my-workspace        List packages in a specific workspace
  $ kpm list --all                 List packages across all KPM search paths
  $ kpm list --json                Output as JSON
  $ kpm list --all --json          All paths, JSON output

Notes:
  Without --all, lists only packages in <workspace>/knowledge_modules/.
  With --all, groups packages by search path (workspace + KPM_PATH entries).
  Search paths are resolved via the KPM_PATH environment variable.`)
    .action(async (pathArg: string | undefined, opts: { all?: boolean; json?: boolean }) => {
      try {
        const cwd = pathArg ? resolve(pathArg) : process.cwd()
        const root = await findWorkspaceRoot(cwd)
        if (!root) {
          console.error('Error: not inside a KPM workspace.')
          process.exit(1)
        }

        if (opts.all) {
          const searchPaths = await resolveSearchPaths(root)
          const groups: Record<string, { name: string; version: string }[]> = {}
          for (const p of searchPaths) {
            const pkgs = await listInstalled(p)
            if (pkgs.length > 0) groups[p] = pkgs
          }
          if (opts.json) {
            console.log(JSON.stringify(groups, null, 2))
          } else {
            for (const [p, pkgs] of Object.entries(groups)) {
              console.log(`\n  ${p}`)
              pkgs.forEach(pkg => console.log(`    ${pkg.name}@${pkg.version}`))
            }
          }
        } else {
          const km = resolve(root, 'knowledge_modules')
          const pkgs = await listInstalled(km)
          if (opts.json) {
            console.log(JSON.stringify(pkgs.map(p => `${p.name}@${p.version}`), null, 2))
          } else {
            pkgs.forEach(pkg => console.log(`${pkg.name}@${pkg.version}`))
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
