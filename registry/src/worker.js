/**
 * Cloudflare Worker entry point.
 *
 * Bindings (configure in wrangler.toml or Dashboard):
 *   DB       → D1 database
 *   ARCHIVES → R2 bucket
 */

import { createFetchHandler } from './router.js'

export default {
  async fetch(request, env) {
    return createFetchHandler(env.DB, env.ARCHIVES)(request)
  },
}
