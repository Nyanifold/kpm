import { Command } from 'commander'
import {
  findWorkspaceRoot,
  parseKpmDependencies,
  listInstalled,
  install,
} from '@nyanifold/kpm-core'
import semver from 'semver'
import { resolve, join } from 'node:path'
import { rm, mkdir } from 'node:fs/promises'

type SyncAction = 'install' | 'update' | 'skip' | 'remove'

interface SyncItem {
  name: string
  action: SyncAction
  from?: string
  to?: string
}

export function registerSync(program: Command): void {
  program
    .command('sync')
    .description('Align knowledge_modules with kpm-dependencies.toml')
    .option('--path <dir>', 'specify workspace directory')
    .option('--dry-run', 'show planned changes without applying')
    .addHelpText('after', `
Examples:
  $ kpm sync                        Sync knowledge_modules with kpm-dependencies.toml
  $ kpm sync --dry-run             Preview changes without applying them
  $ kpm sync --path ./my-ws       Sync a specific workspace

Output symbols:
  +  package will be installed
  ~  package will be updated
  =  package already satisfies its range (skipped)
  -  package is installed but not declared (will be removed)

Notes:
  sync installs missing packages, updates out-of-range ones, and removes
  packages not listed in kpm-dependencies.toml.
  Packages with fixed sources (file:, http://, registry+) are left in place.`)
    .action(async (opts: { path?: string; dryRun?: boolean }) => {
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

        const installedMap = new Map(installed.map(p => [p.name, p]))
        const declaredNames = new Set(Object.keys(deps.dependencies))

        const plan: SyncItem[] = []

        for (const [name, specifier] of Object.entries(deps.dependencies)) {
          const existing = installedMap.get(name)
          if (!existing) {
            plan.push({ name, action: 'install', to: specifier })
          } else {
            const isFixed =
              specifier.startsWith('file:') ||
              /^https?:\/\//.test(specifier) ||
              specifier.startsWith('registry+')
            if (!isFixed) {
              const satisfies = semver.satisfies(existing.version, specifier)
              if (!satisfies) {
                plan.push({
                  name,
                  action: 'update',
                  from: existing.version,
                  to: specifier,
                })
              } else {
                plan.push({ name, action: 'skip', from: existing.version })
              }
            } else {
              plan.push({ name, action: 'skip', from: existing.version })
            }
          }
        }

        for (const pkg of installed) {
          if (!declaredNames.has(pkg.name)) {
            plan.push({ name: pkg.name, action: 'remove', from: pkg.version })
          }
        }

        const symbols: Record<SyncAction, string> = {
          install: '+',
          update: '~',
          skip: '=',
          remove: '-',
        }

        if (opts.dryRun) {
          plan.forEach(item => {
            const detail =
              item.action === 'update'
                ? `${item.from} → ${item.to}`
                : item.from ?? item.to ?? ''
            console.log(`${symbols[item.action]} ${item.name}@${detail}`)
          })
          console.log(`\n${plan.length} packages planned`)
          return
        }

        let count = 0
        for (const item of plan) {
          if (item.action === 'remove') {
            const pkg = installedMap.get(item.name)!
            await rm(pkg.dir, { recursive: true })
            console.log(`- ${item.name}@${item.from}  removing... done`)
          } else if (item.action === 'skip') {
            console.log(`= ${item.name}@${item.from}  already satisfied`)
          } else {
            const specifier = deps.dependencies[item.name]
            if (item.action === 'update') {
              const oldPkg = installedMap.get(item.name)
              if (oldPkg) await rm(oldPkg.dir, { recursive: true })
            }
            // Bare version specs (no prefix) need the package name prepended.
            // e.g. specifier "^1.0.0" → install target "logic-basics-kpm-demo@^1.0.0"
            // Fixed sources (file:, http://, registry+) are passed as-is.
            const isFixed =
              specifier.startsWith('file:') ||
              /^https?:\/\//.test(specifier) ||
              specifier.startsWith('registry+')
            const installTarget = isFixed ? specifier : `${item.name}@${specifier}`
            const pkg = await install(installTarget, km, { depsFileDir: root, registries: deps.registries })
            const verb =
              item.action === 'update'
                ? `updating from ${item.from}...`
                : 'installing...'
            console.log(
              `${symbols[item.action]} ${item.name}@${pkg.version}  ${verb} done`,
            )
          }
          count++
        }

        console.log(`\n${count} packages processed`)
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
