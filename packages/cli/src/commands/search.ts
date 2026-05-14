import { Command } from 'commander'

const DEFAULT_REGISTRY = 'https://registry.kpm.dev'

export function registerSearch(program: Command): void {
  program
    .command('search <query>')
    .description('Search for packages in the registry')
    .option('--registry <url>', 'registry URL', DEFAULT_REGISTRY)
    .option('--lang <lang>', 'filter by language (BCP 47)')
    .option('--limit <n>', 'max results', '20')
    .option('--json', 'output as JSON')
    .addHelpText('after', `
Examples:
  $ kpm search typescript          Search for packages matching "typescript"
  $ kpm search ml --lang zh        Filter results by language (BCP 47 tag)
  $ kpm search api --limit 5       Limit to 5 results
  $ kpm search guide --json        Output raw JSON from the registry

Notes:
  Language tags follow BCP 47 (e.g. en, zh, fr, ja).
  Default registry: ${DEFAULT_REGISTRY}
  Use --registry to point at a private or local registry.`)
    .action(async (query: string, opts: { registry: string; lang?: string; limit: string; json?: boolean }) => {
      try {
        const params = new URLSearchParams({ q: query, limit: opts.limit })
        if (opts.lang) params.set('lang', opts.lang)
        const res = await fetch(`${opts.registry}/search?${params}`)
        if (!res.ok) throw new Error(`Search failed: ${res.status}`)
        const data = await res.json() as { total: number; results: Array<{ name: string; version: string; description?: string; supported_languages?: string[] }> }

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2))
          return
        }

        data.results.forEach(pkg => {
          const langs = pkg.supported_languages ? `[${pkg.supported_languages.join(', ')}]` : ''
          console.log(`${pkg.name.padEnd(25)} ${pkg.version.padEnd(10)} ${(pkg.description ?? '').padEnd(35)} ${langs}`)
        })
        console.log(`\n${data.total} result(s)`)
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
