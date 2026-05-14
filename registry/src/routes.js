/**
 * KPM Registry — platform-agnostic route handlers.
 *
 * Accept db + archives objects with minimal interfaces so both
 * the Cloudflare Worker and the standalone server can wire them.
 *
 * db:
 *   .prepare(sql).bind(...).all()   → { results: any[]; success: boolean }
 *   .prepare(sql).bind(...).first() → row | null
 *
 * archives:
 *   .get(key) → { body: ReadableStream } | null
 */

function origin(request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function handleList(name, db) {
  const result = await db
    .prepare('SELECT name, version FROM packages WHERE name = ? ORDER BY version DESC')
    .bind(name)
    .all()

  if (!result.success) {
    return new Response('Internal Error', { status: 500 })
  }

  if (result.results.length === 0) {
    return new Response('Not Found', { status: 404 })
  }

  const versions = result.results.map(r => r.version)
  return Response.json({ latest: versions[0], versions })
}

export async function handleMeta(name, version, db, request) {
  const result = await db
    .prepare('SELECT * FROM packages WHERE name = ? AND version = ?')
    .bind(name, version)
    .first()

  if (!result) {
    return new Response('Not Found', { status: 404 })
  }

  const base = origin(request)
  return Response.json({
    name: result.name,
    version: result.version,
    description: result.description,
    authors: JSON.parse(result.authors),
    checksum: result.checksum,
    download_url: `${base}/packages/${name}/${version}/download`,
  })
}

export async function handleDownload(name, version, archives) {
  const key = `${name}@${version}.tar.gz`
  const object = await archives.get(key)

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${key}"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function handleFile(filename, archives) {
  const object = await archives.get(filename)

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

const USAGE = [
  'KPM Registry',
  '',
  '  GET /packages/:name                    List versions',
  '  GET /packages/:name/:version           Package metadata',
  '  GET /packages/:name/:version/download  Download archive',
  '  GET /files/:filename                   Download file by exact name',
].join('\n')

export function createFetchHandler(db, archives) {
  return async function fetchHandler(request) {
    const { pathname } = new URL(request.url)

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // GET /packages/:name/:version/download
    const m = pathname.match(/^\/packages\/([^/]+)\/([^/]+)\/download$/)
    if (m) return handleDownload(m[1], m[2], archives)

    // GET /packages/:name/:version
    const mm = pathname.match(/^\/packages\/([^/]+)\/([^/]+)$/)
    if (mm) return handleMeta(mm[1], mm[2], db, request)

    // GET /packages/:name
    const ml = pathname.match(/^\/packages\/([^/]+)$/)
    if (ml) return handleList(ml[1], db)

    // GET /files/:filename
    const mf = pathname.match(/^\/files\/([^/]+)$/)
    if (mf) return handleFile(decodeURIComponent(mf[1]), archives)

    return new Response(USAGE, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
