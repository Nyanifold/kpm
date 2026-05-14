import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_ENTRY = resolve(__dirname, '../../index.ts')

export interface KpmResult {
  stdout: string
  stderr: string
  exitCode: number
}

export function kpm(
  args: string[],
  opts: { cwd?: string; env?: Record<string, string> } = {},
): KpmResult {
  const result = spawnSync('bun', ['run', CLI_ENTRY, ...args], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    input: '',
    encoding: 'utf8',
    timeout: 30_000,
  })
  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : result.stdout?.toString() ?? '',
    stderr: typeof result.stderr === 'string' ? result.stderr : result.stderr?.toString() ?? '',
    exitCode: result.status ?? (result.signal === 'SIGTERM' ? 124 : 1),
  }
}

export async function initWorkspace(dir: string): Promise<void> {
  kpm(['init', '--workspace'], { cwd: dir })
}
