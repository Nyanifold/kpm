import { Command } from 'commander'
import {
  install,
  findWorkspaceRoot,
  parseKpmDependencies,
  setKpmDependency,
  listInstalled,
} from '@nyanifold/kpm-core'
import type { InstalledPackage, KpmDependencies } from '@nyanifold/kpm-core'
import { resolve } from 'node:path'
import { mkdir, rm } from 'node:fs/promises'
import { confirm } from '@inquirer/prompts'

async function resolveConflict(
  existing: InstalledPackage,
  force: boolean | undefined,
): Promise<boolean> {
  if (force) return true
  if (!process.stdin.isTTY) {
    console.error(
      `Error: ${existing.name}@${existing.version} already installed. Use --force to replace.`,
    )
    process.exit(1)
  }
  return confirm({
    message: `${existing.name}@${existing.version} already installed. Replace?`,
    default: false,
  })
}

export function registerAdd(program: Command): void {
  program
    .command('add <target>')
    .description('Install a package and record it in kpm-dependencies.toml')
    .option('--path <dir>', 'install to a specific workspace directory')
    .option('-E, --exact', 'write exact version (e.g. 1.2.0)')
    .option('-T, --tilde', 'write tilde range (e.g. ~1.2.0)')
    .option('-f, --force', 'replace existing version without prompting')
    .option('--dry-run', 'simulate without writing')
    .option('--registry <url>', 'registry URL to use for this install (overrides kpm-dependencies.toml and KPM_REGISTRY)')
    .addHelpText('after', `
Examples:
  $ kpm add my-pkg                        Install latest version, record as ^x.y.z
  $ kpm add my-pkg@1.2.0                 Install a specific version
  $ kpm add my-pkg@^1.2                  Install satisfying a semver range
  $ kpm add my-pkg -E                    Install and pin exact version (1.2.0)
  $ kpm add my-pkg -T                    Install and pin tilde range (~1.2.0)
  $ kpm add my-pkg --force               Replace existing version without prompting
  $ kpm add my-pkg --dry-run             Preview what would be installed
  $ kpm add my-pkg --registry https://registry.example.com  Use a specific registry
  $ kpm add file:./local-pkg             Install from a local directory
  $ kpm add https://example.com/pkg.tar.gz  Install from URL
  $ kpm add my-pkg --path ./ws          Install into a specific workspace

Registry resolution order:
  1. --registry flag (this run only)
  2. registries = [...] in kpm-dependencies.toml (tried in order)
  3. KPM_REGISTRY environment variable

Notes:
  Packages are installed into <workspace>/knowledge_modules/.
  The dependency is recorded in kpm-dependencies.toml.
  If a version conflict is detected, you will be prompted unless --force is given.`)
    .action(
      async (
        target: string,
        opts: {
          path?: string
          exact?: boolean
          tilde?: boolean
          force?: boolean
          dryRun?: boolean
          registry?: string
        },
      ) => {
        try {
          const root = opts.path
            ? resolve(opts.path)
            : await findWorkspaceRoot(process.cwd())

          if (!root) {
            console.error(
              'Error: not inside a KPM workspace. Run kpm init --workspace first.',
            )
            process.exit(1)
          }

          const destDir = resolve(root, 'knowledge_modules')

          if (opts.dryRun) {
            console.log(
              `Would install ${target} → ${destDir} and update kpm-dependencies.toml`,
            )
            return
          }

          await mkdir(destDir, { recursive: true })

          const deps = await parseKpmDependencies(root).catch((): KpmDependencies => ({ dependencies: {} }))

          // For registry targets we know the package name before downloading — pre-check.
          const isFixed =
            target.startsWith('file:') ||
            /^https?:\/\//.test(target) ||
            target.startsWith('registry+')

          if (!isFixed) {
            // registry+ targets are excluded by isFixed, so target is a plain name or name@range
            const atIdx = target.indexOf('@')
            const targetName = atIdx > 0 ? target.slice(0, atIdx) : target
            const installed = await listInstalled(destDir)
            const existing = installed.find(p => p.name === targetName)
            if (existing) {
              const ok = await resolveConflict(existing, opts.force)
              if (!ok) {
                console.log('Aborted.')
                process.exit(0)
              }
              await rm(existing.dir, { recursive: true })
            }
          }

          const registries = opts.registry
            ? [opts.registry, ...(deps.registries ?? [])]
            : deps.registries
          const pkg = await install(target, destDir, { depsFileDir: root, registries })

          // For file/url targets: check if other versions of the same name now exist.
          if (isFixed) {
            const freshInstalled = await listInstalled(destDir)
            const others = freshInstalled.filter(
              p => p.name === pkg.name && p.dir !== pkg.dir,
            )
            for (const other of others) {
              const ok = await resolveConflict(other, opts.force)
              if (!ok) {
                await rm(pkg.dir, { recursive: true })
                console.log('Aborted.')
                process.exit(0)
              }
              await rm(other.dir, { recursive: true })
            }
          }

          console.log(`+ ${pkg.name}@${pkg.version}`)

          let versionRange: string
          if (isFixed) {
            versionRange = target
          } else if (opts.exact) {
            versionRange = pkg.version
          } else if (opts.tilde) {
            versionRange = `~${pkg.version}`
          } else {
            versionRange = `^${pkg.version}`
          }

          const specifier = (!isFixed && opts.registry)
            ? `registry+${opts.registry}/${pkg.name}@${versionRange}`
            : versionRange

          await setKpmDependency(root, pkg.name, specifier)
          console.log(`  added "${pkg.name}" = "${specifier}" to kpm-dependencies.toml`)
        } catch (err) {
          if (err instanceof Error && err.constructor.name === 'ExitPromptError') {
            console.log('\nAborted.')
            process.exit(0)
          }
          console.error(`Error: ${(err as Error).message}`)
          process.exit(1)
        }
      },
    )
}
