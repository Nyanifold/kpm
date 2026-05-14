# KPM Registry

KPM Registry 是一个轻量级包注册表，提供 `.tar.gz` 格式的包归档文件及其元数据。支持两种部署模式：

| 模式 | 运行时 | 存储 |
|------|--------|------|
| **Cloudflare Workers** | Cloudflare Worker | D1（SQLite）+ R2 |
| **自托管** | Bun | SQLite + 本地文件系统 |

两种模式使用相同的 HTTP API 和路由逻辑（`src/routes.js`）。

---

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/packages/:name` | 列出包的所有版本 |
| `GET` | `/packages/:name/:version` | 获取包元数据 |
| `GET` | `/packages/:name/:version/download` | 下载归档文件 |
| `GET` | `/files/:filename` | 按完整文件名下载（如 `name@1.0.0.tar.gz`） |

### 响应示例

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

## 包格式

每个包是一个 `.tar.gz` 归档，根目录下必须包含 `kpm-meta.toml` 文件。

**最小 `kpm-meta.toml` 示例：**
```toml
name    = "my-package"
version = "1.0.0"
description = "简短描述"
authors = [
  "Your Name <you@example.com>",
]
```

版本号必须符合 semver 格式（`x.y.z`），预发布后缀如 `1.0.0-beta.1` 也可接受。

---

## 部署 — Cloudflare Workers

### 前置条件

- 安装并登录 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（`wrangler login`）
- Cloudflare 账号已开通 Workers、D1 和 R2

### 1. 创建云资源

```bash
# 创建 R2 存储桶（存归档文件）
wrangler r2 bucket create kpm-archives

# 创建 D1 数据库（存元数据）
wrangler d1 create kpm-registry
```

### 2. 配置 `wrangler.toml`

将上一步输出的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding       = "DB"
database_name = "kpm-registry"
database_id   = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← 粘贴到这里

[[r2_buckets]]
binding     = "ARCHIVES"
bucket_name = "kpm-archives"
```

### 3. 初始化数据库结构

```bash
wrangler d1 execute kpm-registry --file=schema.sql
```

### 4. 部署 Worker

```bash
wrangler deploy
# 或：bun run deploy
```

部署完成后，wrangler 会打印注册表地址（如 `https://kpm-registry.<your-subdomain>.workers.dev`）。

### 本地开发

```bash
bun run dev   # 启动 wrangler dev，本地模拟 D1/R2
```

---

## 部署 — 自托管（Bun）

### 前置条件

- 服务器上安装 [Bun](https://bun.sh) ≥ 1.2
- PATH 中有 `tar`

### 1. 启动服务器

```bash
# 默认：端口 8787，数据存储在 ./data
bun run src/server.js

# 自定义端口和数据目录
KPM_REGISTRY_PORT=3000 KPM_REGISTRY_DATA=/var/kpm/data bun run src/server.js
```

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `KPM_REGISTRY_PORT` | `8787` | HTTP 监听端口 |
| `KPM_REGISTRY_DATA` | `./data` | SQLite 数据库和归档文件的存储目录 |

服务器首次启动时会自动创建数据目录并初始化数据库结构。

### 2. 配置为 systemd 服务（Linux）

创建 `/etc/systemd/system/kpm-registry.service`：

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

### 3. 反向代理（nginx 示例）

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

## 发布包（管理员操作）

### Cloudflare 模式 — `scripts/publish.ts`

通过 wrangler CLI 将包上传到 R2 和 D1。需在已登录 wrangler 的本地机器上执行。

```bash
# 从本地包目录发布（自动打包）
bun run scripts/publish.ts ../demo-packages/python-basics

# 从已有的 .tar.gz 文件发布
bun run scripts/publish.ts ./python-basics@1.2.0.tar.gz

# 从远程 URL 下载后发布
bun run scripts/publish.ts https://example.com/python-basics@1.2.0.tar.gz
```

执行步骤：
1. 将来源解析为 `.tar.gz`（目录则先打包，URL 则先下载）
2. 从归档中提取 `kpm-meta.toml`（无需完整解压）
3. 计算 SHA-256 校验和
4. 以 `name@version.tar.gz` 为 key 上传到 R2
5. 在 D1 中插入或更新元数据行

### 自托管模式 — `scripts/publish-local.ts`

直接写入服务器的数据目录。在**服务器本地**执行（或通过挂载远程目录）。

```bash
# 用法
bun run scripts/publish-local.ts <数据目录> <来源>

# 示例
bun run scripts/publish-local.ts /var/kpm/data ../demo-packages/python-basics
bun run scripts/publish-local.ts /var/kpm/data ./python-basics@1.2.0.tar.gz
bun run scripts/publish-local.ts /var/kpm/data https://example.com/python-basics@1.2.0.tar.gz
```

执行步骤：
1. 同 Cloudflare 脚本的来源解析逻辑
2. 若 `<数据目录>/archives/` 不存在则自动创建
3. 将归档复制到 `<数据目录>/archives/name@version.tar.gz`
4. 打开 `<数据目录>/kpm-registry.sqlite`，执行 `INSERT OR REPLACE`（数据库不存在时自动初始化）

### 批量导入 Demo 包

`scripts/seed.ts` 会打包 `demo-packages/` 下的所有包，并输出上传所需的 wrangler 命令（仅适用于 Cloudflare 模式）：

```bash
bun run scripts/seed.ts
# 按输出执行 wrangler 命令
```

---

## 数据存储

### 数据库（SQLite / D1）

两种部署模式使用相同的数据库结构（`schema.sql`）。Cloudflare 模式下为 D1 数据库；自托管模式下为 `<数据目录>/kpm-registry.sqlite` 文件，以 WAL 模式打开。

#### `packages` 表

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

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `TEXT` | 包名，如 `python-basics` |
| `version` | `TEXT` | Semver 版本字符串，如 `1.2.0` |
| `description` | `TEXT` | 来自 `kpm-meta.toml` 的简短描述 |
| `authors` | `TEXT` | 序列化为字符串的 JSON 数组，如 `["Alice <a@b.com>"]` |
| `checksum` | `TEXT` | `.tar.gz` 归档文件的 SHA-256 十六进制摘要 |
| `created_at` | `TEXT` | 插入时自动设置的 ISO-8601 UTC 时间戳 |

**主键**为 `(name, version)` 组合——同一包的同一版本只能存在一条记录。重复发布相同版本会覆盖原行（`INSERT OR REPLACE`）。

**索引**建在 `name` 列上，加速 `GET /packages/:name` 的版本列举查询。

#### `authors` 字段编码

`authors` 存储 JSON 数组字符串，而非独立的关联表，使结构保持简单，API 响应也无需额外拼接：

```sql
-- 数据库中存储的值
'["Alice <alice@example.com>", "Bob <bob@example.com>"]'

-- API 处理层解码
JSON.parse(result.authors)  -- → string[]
```

#### `checksum` 格式

对 `.tar.gz` 文件字节流计算 SHA-256，结果以小写十六进制存储（64 个字符）：

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

客户端可在下载归档后自行计算 `sha256(文件)`，与此值比对以验证完整性。

---

### 归档文件存储

归档文件以扁平命名空间存储，不使用子目录。

#### 命名规则

```
{包名}@{版本}.tar.gz
```

示例：
```
python-basics@1.2.0.tar.gz
algebra-basics@1.0.0.tar.gz
```

#### Cloudflare R2

| 属性 | 值 |
|------|----|
| 存储桶 | `kpm-archives`（在 `wrangler.toml` 中配置） |
| 对象 key | `{包名}@{版本}.tar.gz` |
| 响应 Content-Type | `application/gzip` |
| 响应 Cache-Control | `public, max-age=86400` |

对象上传后视为不可变。若需替换某版本，使用相同 key 重新上传即可覆盖。

#### 自托管文件系统

| 属性 | 值 |
|------|----|
| 基础目录 | `$KPM_REGISTRY_DATA/archives/`（默认：`./data/archives/`） |
| 文件路径 | `$KPM_REGISTRY_DATA/archives/{包名}@{版本}.tar.gz` |

`server.js` 启动时以及 `publish-local.ts` 首次发布时都会自动创建该目录。

#### 归档内容结构

归档内部没有强制的目录布局，唯一要求是根目录下必须存在 `kpm-meta.toml`。典型结构如下：

```
./kpm-meta.toml          ← 必须
./README.md
./chapter-01.md
./chapter-02.md
./assets/diagram.png
```

发布脚本通过 `tar -tf` 列出归档内容，匹配第一个符合 `kpm-meta.(toml|yaml|yml|json)` 的条目来定位元数据文件，无需完整解压归档。

---

## 目录结构

```
registry/
├── src/
│   ├── routes.js        # 平台无关的 HTTP 路由处理逻辑
│   ├── server.js        # Bun 独立服务器（自托管）
│   └── worker.js        # Cloudflare Worker 入口
├── scripts/
│   ├── publish.ts       # 发布到 Cloudflare（wrangler）
│   ├── publish-local.ts # 发布到自托管注册表
│   └── seed.ts          # 批量导入 Demo 包（Cloudflare）
├── schema.sql           # SQLite / D1 表结构
└── wrangler.toml        # Cloudflare 部署配置
```
