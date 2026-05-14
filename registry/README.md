# KPM Registry

The KPM Registry is a lightweight package registry that serves `.tar.gz` package archives along with their metadata. It supports two deployment modes:

| Mode | Runtime | Storage |
|------|---------|---------|
| **Cloudflare Workers** | Cloudflare Worker | D1 (SQLite) + R2 |
| **Self-hosted** | Bun | SQLite + local filesystem |

Both modes expose the same HTTP API and share the same route logic (`src/routes.js`).

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/packages/:name` | List all versions of a package |
| `GET` | `/packages/:name/:version` | Get package metadata |
| `GET` | `/packages/:name/:version/download` | Download the archive |
| `GET` | `/files/:filename` | Download archive by exact filename (e.g. `name@1.0.0.tar.gz`) |

### Example responses

**`GET /packages/python-basics`**
```json
{
  "latest": "1.2.0",
  "versions": ["1.2.0", "1.1.0", "1.0.0"]
}
```

**`GET /packages/python-basics/1.2.0`**
```json
{
  "name": "python-basics",
  "version": "1.2.0",
  "description": "A beginner's guide to Python programming",
  "authors": ["KPM Contributors <contrib@kpm.dev>"],
  "checksum": "sha256:abc123...",
  "download_url": "https://your-registry/packages/python-basics/1.2.0/download"
}
```

---

## Package Format

Each package is a `.tar.gz` archive containing a `kpm-meta.toml` file at its root.

**Minimum required `kpm-meta.toml`:**
```toml
name    = "my-package"
version = "1.0.0"
description = "A short description"
authors = [
  "Your Name <you@example.com>",
]
```

Version must follow semver (`x.y.z`). Pre-release suffixes like `1.0.0-beta.1` are accepted.

---

## Deployment — Cloudflare Workers

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed and authenticated (`wrangler login`)
- A Cloudflare account with Workers, D1, and R2 enabled

### 1. Create cloud resources

```bash
# Create R2 bucket for archives
wrangler r2 bucket create kpm-archives

# Create D1 database
wrangler d1 create kpm-registry
```

### 2. Configure `wrangler.toml`

Paste the `database_id` output from the previous step into `wrangler.toml`:

```toml
[[d1_databases]]
binding      = "DB"
database_name = "kpm-registry"
database_id  = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← paste here

[[r2_buckets]]
binding     = "ARCHIVES"
bucket_name = "kpm-archives"
```

### 3. Apply database schema

```bash
wrangler d1 execute kpm-registry --file=schema.sql
```

### 4. Deploy the Worker

```bash
wrangler deploy
# or: bun run deploy
```

The registry is now live at the URL printed by wrangler (e.g. `https://kpm-registry.<your-subdomain>.workers.dev`).

### Local development

```bash
bun run dev   # starts wrangler dev with local D1/R2 simulation
```

---

## Deployment — Self-hosted (Bun)

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.2 installed on the server
- `tar` available in PATH

### 1. Start the server

```bash
# Default: port 8787, data stored in ./data
bun run src/server.js

# Custom port and data directory
KPM_REGISTRY_PORT=3000 KPM_REGISTRY_DATA=/var/kpm/data bun run src/server.js
```

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `KPM_REGISTRY_PORT` | `8787` | HTTP listen port |
| `KPM_REGISTRY_DATA` | `./data` | Directory for SQLite DB and archives |

The server creates the data directory and applies the schema automatically on first run.

### 2. Run as a systemd service (Linux)

Create `/etc/systemd/system/kpm-registry.service`:

```ini
[Unit]
Description=KPM Registry
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/kpm-registry
Environment=KPM_REGISTRY_PORT=8787
Environment=KPM_REGISTRY_DATA=/var/kpm/data
ExecStart=/usr/local/bin/bun run src/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kpm-registry
```

### 3. Reverse proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name registry.example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Publishing Packages (Admin)

### Cloudflare Workers — `scripts/publish.ts`

Publishes to R2 + D1 via the wrangler CLI. Run this locally with wrangler authenticated.

```bash
# From a local package directory
bun run scripts/publish.ts ../demo-packages/python-basics

# From an existing .tar.gz
bun run scripts/publish.ts ./python-basics@1.2.0.tar.gz

# From a remote URL
bun run scripts/publish.ts https://example.com/python-basics@1.2.0.tar.gz
```

What it does:
1. Resolves the source to a `.tar.gz` (packs a directory or downloads a URL if needed)
2. Extracts `kpm-meta.toml` from the archive without fully unpacking it
3. Computes the SHA-256 checksum
4. Uploads the archive to R2 as `name@version.tar.gz`
5. Inserts (or replaces) the metadata row in D1

### Self-hosted — `scripts/publish-local.ts`

Publishes directly to the server's data directory. Run this **on the server** (or mount the data directory remotely).

```bash
# Usage
bun run scripts/publish-local.ts <data-dir> <source>

# Examples
bun run scripts/publish-local.ts /var/kpm/data ../demo-packages/python-basics
bun run scripts/publish-local.ts /var/kpm/data ./python-basics@1.2.0.tar.gz
bun run scripts/publish-local.ts /var/kpm/data https://example.com/python-basics@1.2.0.tar.gz
```

What it does:
1. Same source resolution as the Cloudflare script
2. Creates `<data-dir>/archives/` if it doesn't exist
3. Copies the archive to `<data-dir>/archives/name@version.tar.gz`
4. Opens `<data-dir>/kpm-registry.sqlite` and runs `INSERT OR REPLACE` (initializes schema if the DB is new)

### Seeding demo packages

The `scripts/seed.ts` script packs all packages under `demo-packages/` and prints the wrangler commands needed to upload them (Cloudflare mode only):

```bash
bun run scripts/seed.ts
# Follow the printed wrangler commands
```

---

## Data Storage

### Database (SQLite / D1)

Both deployment modes use the same schema (`schema.sql`). In Cloudflare mode this is a D1 database; in self-hosted mode it is a SQLite file at `<data-dir>/kpm-registry.sqlite` opened in WAL mode.

#### `packages` table

```sql
CREATE TABLE IF NOT EXISTS packages (
  name        TEXT NOT NULL,
  version     TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  authors     TEXT NOT NULL DEFAULT '[]',
  checksum    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (name, version)
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
```

| Column | Type | Description |
|--------|------|-------------|
| `name` | `TEXT` | Package name, e.g. `python-basics` |
| `version` | `TEXT` | Semver version string, e.g. `1.2.0` |
| `description` | `TEXT` | Short description from `kpm-meta.toml` |
| `authors` | `TEXT` | JSON array serialized as a string, e.g. `["Alice <a@b.com>"]` |
| `checksum` | `TEXT` | SHA-256 hex digest of the `.tar.gz` archive |
| `created_at` | `TEXT` | ISO-8601 UTC timestamp, set automatically on insert |

**Primary key** is `(name, version)` — the same package version can only exist once. Publishing the same version again overwrites the row (`INSERT OR REPLACE`).

**Index** on `name` alone speeds up the `GET /packages/:name` version-listing query.

#### `authors` encoding

The `authors` column stores a JSON array rather than a normalized table, keeping the schema simple and the API response trivially assemby-able:

```sql
-- stored value
'["Alice <alice@example.com>", "Bob <bob@example.com>"]'

-- decoded in the API handler
JSON.parse(result.authors)  -- → string[]
```

#### `checksum` format

Raw lowercase hex of the SHA-256 digest (64 characters), computed over the exact bytes of the `.tar.gz` file:

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

Clients can verify a downloaded archive by computing `sha256(file)` and comparing to this value.

---

### Archive Storage

Archives are stored as plain `.tar.gz` files under a flat namespace. No subdirectories are used.

#### Naming convention

```
{name}@{version}.tar.gz
```

Examples:
```
python-basics@1.2.0.tar.gz
algebra-basics@1.0.0.tar.gz
```

#### Cloudflare R2

| Property | Value |
|----------|-------|
| Bucket | `kpm-archives` (configured in `wrangler.toml`) |
| Object key | `{name}@{version}.tar.gz` |
| Content-Type served | `application/gzip` |
| Cache-Control served | `public, max-age=86400` |

Objects are immutable once uploaded. To replace a version, upload a new object with the same key (the old one is overwritten).

#### Self-hosted filesystem

| Property | Value |
|----------|-------|
| Base directory | `$KPM_REGISTRY_DATA/archives/` (default: `./data/archives/`) |
| File path | `$KPM_REGISTRY_DATA/archives/{name}@{version}.tar.gz` |

The directory is created automatically by `server.js` on startup and by `publish-local.ts` on first publish.

#### Archive contents

There is no enforced directory layout inside the archive beyond the requirement for a `kpm-meta.toml` at the root. A typical archive looks like:

```
./kpm-meta.toml          ← required
./README.md
./chapter-01.md
./chapter-02.md
./assets/diagram.png
```

The publish scripts locate `kpm-meta.toml` by listing the archive with `tar -tf` and matching the first entry that matches `kpm-meta.(toml|yaml|yml|json)`, without fully extracting the archive.

---

## Directory Structure

```
registry/
├── src/
│   ├── routes.js        # Platform-agnostic HTTP route handlers
│   ├── server.js        # Bun standalone server (self-hosted)
│   └── worker.js        # Cloudflare Worker entry point
├── scripts/
│   ├── publish.ts       # Publish to Cloudflare (wrangler)
│   ├── publish-local.ts # Publish to self-hosted registry
│   └── seed.ts          # Seed all demo packages (Cloudflare)
├── schema.sql           # SQLite / D1 schema
└── wrangler.toml        # Cloudflare deployment config
```
