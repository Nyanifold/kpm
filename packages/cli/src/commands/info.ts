import { Command } from 'commander'

const DEFAULT_REGISTRY = 'https://registry.kpm.dev'

export function registerInfo(program: Command): void {
  program
    .command('info <name>')
    .description('Show package metadata from the registry')
    .option('--registry <url>', 'registry URL', DEFAULT_REGISTRY)
    .option('--json', 'output as JSON')
    .addHelpText('after', `
Examples:
  $ kpm info my-pkg                Show all available versions and latest
  $ kpm info my-pkg@1.2.0         Show metadata for a specific version
  $ kpm info my-pkg --json         Output raw JSON metadata
  $ kpm info my-pkg --registry https://my-registry.internal

Notes:
  Without a version, lists all available versions and the latest tag.
  With a version (name@x.y.z), shows full metadata for that release.
  download_url and checksum fields are hidden in the default output.`)
    .action(async (name: string, opts: { registry: string; json?: boolean }) => {
      const [pkgName, version] = name.includes('@') ? name.split('@') : [name, undefined]
      try {
        const url = version
          ? `${opts.registry}/packages/${pkgName}/${version}`
          : `${opts.registry}/packages/${pkgName}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Package not found: ${name} (${res.status})`)
        const data = await res.json() as Record<string, unknown>

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2))
          return
        }

        if ('versions' in data) {
          console.log(`name:     ${data['name']}`)
          console.log(`versions: ${(data['versions'] as string[]).join(', ')}`)
          console.log(`latest:   ${data['latest']}`)
        } else {
          for (const [k, v] of Object.entries(data)) {
            if (k === 'download_url' || k === 'checksum') continue
            console.log(`${k.padEnd(14)} ${Array.isArray(v) ? (v as unknown[]).join(', ') : v}`)
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
