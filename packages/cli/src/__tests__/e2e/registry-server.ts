/**
 * Standalone mock registry server — run as a child process.
 * Prints "READY:<port>" on stdout when listening.
 * Serves demo-package archives for E2E tests.
 */
import { pack } from '@nyanifold/kpm-core'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMO_ROOT = resolve(__dirname, '../../../../../demo-packages')

const REGISTRY_PACKAGES: Record<string, { latest: string; versions: string[]; dir: string }> = {
  'python-basics-kpm-demo': { latest: '1.2.0', versions: ['1.0.0', '1.2.0'], dir: 'python-basics' },
  'algebra-basics-kpm-demo': { latest: '1.0.0', versions: ['1.0.0'], dir: 'algebra-basics' },
}

const tmpDir = await mkdtemp(join(tmpdir(), 'kpm-mock-reg-'))

// Build .tar.gz for each demo package
const archives: Record<string, string> = {}
for (const [name, info] of Object.entries(REGISTRY_PACKAGES)) {
  const srcDir = join(DEMO_ROOT, info.dir)
  const result = await pack(srcDir, tmpDir)
  archives[`${name}@${info.latest}`] = result.outputFile
}

const server = createServer(async (req, res) => {
  try {
    const pathname = req.url ?? '/'

    // GET /packages/:name  →  { latest, versions }
    const listMatch = pathname.match(/^\/packages\/([^/]+)$/)
    if (listMatch) {
      const pkg = REGISTRY_PACKAGES[listMatch[1]]
      if (!pkg) { res.writeHead(404); res.end('Not Found'); return }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(pkg))
      return
    }

    // GET /packages/:name/:version/:name@version.tar.gz  →  .tar.gz bytes
    const downloadMatch = pathname.match(/^\/packages\/([^/]+)\/([^/]+)\/([^/]+\.tar\.gz)$/)
    if (downloadMatch) {
      const [, name, version] = downloadMatch
      const pkg = REGISTRY_PACKAGES[name]
      if (!pkg || !pkg.versions.includes(version)) { res.writeHead(404); res.end('Not Found'); return }
      const archivePath = archives[`${name}@${pkg.latest}`]
      if (!archivePath) { res.writeHead(404); res.end('Not Found'); return }
      const data = await readFile(archivePath)
      res.writeHead(200, { 'Content-Type': 'application/gzip' })
      res.end(data)
      return
    }

    // GET /packages/:name/:version  →  metadata with download_url
    const metaMatch = pathname.match(/^\/packages\/([^/]+)\/([^/]+)$/)
    if (metaMatch) {
      const [, name, version] = metaMatch
      const pkg = REGISTRY_PACKAGES[name]
      if (!pkg || !pkg.versions.includes(version)) { res.writeHead(404); res.end('Not Found'); return }
      const port = (server.address() as { port: number }).port
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        name,
        version,
        description: `Demo package: ${name}`,
        authors: ['demo'],
        checksum: 'sha256:mock',
        download_url: `http://127.0.0.1:${port}/packages/${name}/${version}/${name}@${version}.tar.gz`,
      }))
      return
    }

    res.writeHead(404)
    res.end('Not Found')
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500)
      res.end('Internal Error')
    }
  }
})

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as { port: number }).port
  // Signal to parent process that we're ready
  process.stdout.write(`READY:${port}\n`)
})

// Keep running until killed
process.on('SIGTERM', () => {
  server.close()
  // clean up tmp archives
  import('node:fs').then(fs => fs.rmSync(tmpDir, { recursive: true, force: true }))
  process.exit(0)
})
