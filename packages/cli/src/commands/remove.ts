import { Command } from 'commander'
import {
  findWorkspaceRoot,
  listInstalled,
  parseKpmDependencies,
  writeKpmDependencies,
} from '@nyanifold/kpm-core'
import { resolve, join } from 'node:path'
import { rm } from 'node:fs/promises'

export function registerRemove(program: Command): void {
  program
    .command('remove <name>')
    .description('Remove an installed package and its entry from kpm-dependencies.toml')
    .option('--path <dir>', 'remove from a specific workspace directory')
    .addHelpText('after', `
Examples:
  $ kpm remove my-pkg              Remove package from knowledge_modules/ and deps file
  $ kpm remove my-pkg --path ./ws  Remove from a specific workspace directory

Notes:
  Removes the package directory from knowledge_modules/ and deletes its entry
  from kpm-dependencies.toml.
  If the package is not installed but exists in the deps file, only the deps
  entry is removed (a warning is shown).`)
    .action(async (name: string, opts: { path?: string }) => {
      try {
        const root = opts.path
          ? resolve(opts.path)
          : await findWorkspaceRoot(process.cwd())

        if (!root) {
          console.error('Error: not inside a KPM workspace.')
          process.exit(1)
        }

        const destDir = join(root, 'knowledge_modules')
        const installed = await listInstalled(destDir)
        const pkg = installed.find(p => p.name === name)

        if (!pkg) {
          console.warn(`Warning: ${name} is not installed in ${destDir} (will still remove from deps)`)
        } else {
          await rm(pkg.dir, { recursive: true })
          console.log(`- ${pkg.name}@${pkg.version}`)
        }

        const deps = await parseKpmDependencies(root).catch(() => ({ dependencies: {} }))
        if ('dependencies' in deps && name in deps.dependencies) {
          delete (deps.dependencies as Record<string, string>)[name]
        }
        await writeKpmDependencies(root, deps)
        console.log(`  removed "${name}" from kpm-dependencies.toml`)
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
