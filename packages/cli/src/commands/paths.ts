import { Command } from 'commander'
import { findWorkspaceRoot, resolveSearchPaths, listInstalled } from '@nyanifold/kpm-core'

export function registerPaths(program: Command): void {
  program
    .command('paths')
    .description('Show and diagnose KPM search paths')
    .option('-v, --verbose', 'also show installed packages per path')
    .option('--json', 'output as JSON')
    .addHelpText('after', `
Examples:
  $ kpm paths                       Show all KPM search paths
  $ kpm paths --verbose            Also list installed packages under each path
  $ kpm paths --json               Output paths as a JSON array

Notes:
  The first path is always the workspace's knowledge_modules/ directory.
  Additional paths come from the KPM_PATH environment variable (colon-separated).
  Use this command to diagnose why a package is or isn't being found.`)
    .action(async (opts: { verbose?: boolean; json?: boolean }) => {
      try {
        const root = await findWorkspaceRoot(process.cwd())
        if (!root) {
          console.error('Error: not inside a KPM workspace.')
          process.exit(1)
        }

        const paths = await resolveSearchPaths(root)

        if (opts.json) {
          console.log(JSON.stringify(paths, null, 2))
          return
        }

        const kpmPathCount = (process.env['KPM_PATH'] ?? '').split(':').filter(Boolean).length
        const labels = [
          'workspace',
          ...Array(kpmPathCount).fill('KPM_PATH'),
          ...Array(Math.max(0, paths.length - 1 - kpmPathCount)).fill('extra'),
        ]

        for (let i = 0; i < paths.length; i++) {
          console.log(`  ${(labels[i] ?? 'extra').padEnd(10)} ${paths[i]}`)
          if (opts.verbose) {
            const pkgs = await listInstalled(paths[i])
            pkgs.forEach(p => console.log(`             └── ${p.name}@${p.version}`))
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
