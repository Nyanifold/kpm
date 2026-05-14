import { Command } from 'commander'
import {
  findWorkspaceRoot,
  parseKpmDependencies,
  listInstalled,
  install,
} from '@nyanifold/kpm-core'
import { resolve, join } from 'node:path'
import { rm, mkdir } from 'node:fs/promises'

export function registerUpdate(program: Command): void {
  program
    .command('update [name]')
    .description(
      'Update installed packages to the latest version satisfying their range',
    )
    .option('--path <dir>', 'update packages in a specific workspace')
    .option('--dry-run', 'show what would be updated without installing')
    .addHelpText('after', `
Examples:
  $ kpm update                      Update all declared packages
  $ kpm update my-pkg              Update a single package
  $ kpm update --dry-run           Preview updates without installing
  $ kpm update my-pkg --dry-run    Preview a single package update
  $ kpm update --path ./my-ws     Update packages in a specific workspace

Notes:
  Only packages declared in kpm-dependencies.toml are updated.
  Packages pinned to a file:, http://, or registry+ source are skipped.
  The installed version must satisfy the declared semver range; if it already
  does and is the latest, it is left in place.`)
    .action(
      async (
        name: string | undefined,
        opts: { path?: string; dryRun?: boolean },
      ) => {
        try {
          const root = opts.path
            ? resolve(opts.path)
            : await findWorkspaceRoot(process.cwd())

          if (!root) {
            console.error('Error: not inside a KPM workspace.')
            process.exit(1)
          }

          const deps = await parseKpmDependencies(root)
          const km = join(root, 'knowledge_modules')
          await mkdir(km, { recursive: true })
          const installed = await listInstalled(km)

          const targets = name
            ? Object.entries(deps.dependencies).filter(([n]) => n === name)
            : Object.entries(deps.dependencies)

          if (targets.length === 0) {
            console.log(
              name
                ? `${name} is not in kpm-dependencies.toml`
                : 'No dependencies declared.',
            )
            return
          }

          for (const [pkgName, specifier] of targets) {
            const current = installed.find(p => p.name === pkgName)

            if (
              specifier.startsWith('file:') ||
              /^https?:\/\//.test(specifier) ||
              specifier.startsWith('registry+')
            ) {
              console.log(
                `${pkgName.padEnd(20)} ${current?.version ?? '(not installed)'}  (skipped — fixed source)`,
              )
              continue
            }

            if (opts.dryRun) {
              console.log(
                `${pkgName.padEnd(20)} ${current?.version ?? '?'}  (would check for updates)`,
              )
              continue
            }

            const pkg = await install(`${pkgName}@${specifier}`, km, {
              depsFileDir: root,
            })
            const changed = current?.version !== pkg.version
            if (changed && current) {
              await rm(current.dir, { recursive: true })
            }
            console.log(
              `${pkgName.padEnd(20)} ${current?.version ?? '?'}  →  ${pkg.version}${changed ? '' : '  (already latest)'}`,
            )
          }
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`)
          process.exit(1)
        }
      },
    )
}
