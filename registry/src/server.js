/**
 * Standalone KPM Registry server — runs anywhere with Bun.
 *
 *   bun run src/server.js
 *
 * Stores data under ./data/:
 *   data/kpm-registry.sqlite   SQLite database
 *   data/archives/              .tar.gz archive files
 *
 * Options (environment variables):
 *   KPM_REGISTRY_PORT  Server port (default 8787)
 *   KPM_REGISTRY_DATA  Data directory (default ./data)
 */

import { Database } from 'bun:sqlite'
import { join, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createFetchHandler } from './router.js'

const PORT = parseInt(process.env['KPM_REGISTRY_PORT'] ?? '8787')
const DATA_DIR = resolve(process.env['KPM_REGISTRY_DATA'] ?? './data')
const DB_PATH = join(DATA_DIR, 'kpm-registry.sqlite')
const ARCHIVES_DIR = join(DATA_DIR, 'archives')

// ---- bootstrap data directory ----
mkdirSync(ARCHIVES_DIR, { recursive: true })

// ---- SQLite adapter (async wrapper matching D1 interface) ----
const db = new Database(DB_PATH)
db.run('PRAGMA journal_mode = WAL')

const SCHEMA_SQL = readFileSync(
  resolve(import.meta.dir, '../schema.sql'),
  'utf-8',
)
db.run(SCHEMA_SQL)

function createDbAdapter(sqliteDb) {
  return {
    prepare(sql) {
      let cached = null
      return {
        bind(...params) {
          if (!cached) cached = sqliteDb.prepare(sql)
          return {
            all() {
              return Promise.resolve({ results: cached.all(...params), success: true })
            },
            first() {
              return Promise.resolve(cached.get(...params) ?? null)
            },
          }
        },
      }
    },
  }
}

// ---- Filesystem archive adapter (matching R2 get interface) ----
function createArchiveAdapter(dir) {
  const fsp = import('node:fs/promises')
  return {
    async get(key) {
      const { readFile } = await fsp
      const path = join(dir, key)
      try {
        const buf = await readFile(path)
        return { body: new ReadableStream({
          start(ctrl) { ctrl.enqueue(buf); ctrl.close() }
        }) }
      } catch {
        return null
      }
    },
  }
}

// ---- start server ----
const archives = createArchiveAdapter(ARCHIVES_DIR)
const dbAdapter = createDbAdapter(db)
const handle = createFetchHandler(dbAdapter, archives)

Bun.serve({
  port: PORT,
  fetch: handle,
})

console.log(`KPM Registry running at http://localhost:${PORT}`)
