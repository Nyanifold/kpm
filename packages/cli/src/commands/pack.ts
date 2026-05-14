import { Command } from 'commander'
import { pack } from '@nyanifold/kpm-core'
import { resolve, dirname } from 'node:path'
import { statSync, existsSync } from 'node:fs'
import { rename, mkdir } from 'node:fs/promises'

function isDir(p: string): boolean {
  // Explicit trailing slash → directory
  if (p.endsWith('/')) return true
  // Exists on disk → use what the filesystem says
  if (existsSync(p)) return statSync(p).isDirectory()
  // Doesn't exist → treat as file
  return false
}

export function registerPack(program: Command): void {
  program
    .command('pack [dir]')
    .description('Pack a knowledge package directory into a .tar.gz archive')
    .option('-o, --out <path>', 'output path (directory or file)', '.')
    .option('--dry-run', 'list files without writing the archive')
    .addHelpText('after', `
Examples:
  $ kpm pack                        Pack current directory, write .tar.gz here
  $ kpm pack ./my-pkg              Pack a specific directory
  $ kpm pack -o ./dist             Write archive into the dist/ directory
  $ kpm pack -o ./dist/pkg.tar.gz  Write archive to a specific file path
  $ kpm pack --dry-run             List files that would be packed without writing

Notes:
  The output filename defaults to <name>-<version>.tar.gz based on kpm-meta.toml.
  If --out points to a directory, the archive is placed inside it with the default name.
  If --out points to a file path (no trailing slash), that exact path is used.`)
    .action(async (dir: string | undefined, opts: { out: string; dryRun?: boolean }) => {
      const srcDir = resolve(dir ?? '.')
      const outTarget = resolve(opts.out)

      try {
        if (isDir(outTarget)) {
          // Output to directory with default filename
          await mkdir(outTarget, { recursive: true })
          const result = await pack(srcDir, outTarget, { dryRun: opts.dryRun })
          if (opts.dryRun) {
            console.log(`will pack ${result.files.length} files:\n`)
            result.files.forEach(f => console.log(`  ${f}`))
            console.log(`\noutput: ${result.outputFile}`)
          } else {
            console.log(`packed: ${result.outputFile}`)
          }
        } else {
          // Output to specific filename
          const outDir = dirname(outTarget)
          await mkdir(outDir, { recursive: true })
          const result = await pack(srcDir, outDir, { dryRun: opts.dryRun })
          if (opts.dryRun) {
            console.log(`will pack ${result.files.length} files:\n`)
            result.files.forEach(f => console.log(`  ${f}`))
            console.log(`\noutput: ${outTarget}`)
          } else {
            await rename(result.outputFile, outTarget)
            console.log(`packed: ${outTarget}`)
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
