import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REGISTRY_SERVER = resolve(__dirname, './registry-server.ts')

export interface MockRegistry {
  url: string
  stop: () => void
}

export async function startMockRegistry(): Promise<MockRegistry> {
  return new Promise((res, rej) => {
    const child = spawn('bun', ['run', REGISTRY_SERVER], {
      stdio: ['ignore', 'pipe', 'inherit'],
    })

    const timer = setTimeout(() => rej(new Error('Mock registry timed out after 30s')), 30_000)

    let buf = ''
    child.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      const m = buf.match(/READY:(\d+)/)
      if (m) {
        clearTimeout(timer)
        const port = Number(m[1])
        res({
          url: `http://127.0.0.1:${port}`,
          stop: () => child.kill('SIGTERM'),
        })
      }
    })

    child.on('error', rej)
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        rej(new Error(`Registry server exited with code ${code}`))
      }
    })
  })
}
