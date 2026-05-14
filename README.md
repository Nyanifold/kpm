# KPM — Knowledge Package Manager

[中文](README.zh.md)

KPM (Knowledge Package Manager) is a tool for **structuring, packaging, distributing, and providing AI-accessible interfaces** to systematic knowledge — encompassing notes, reading summaries, textbooks, and curated collections of experience.

When an AI agent addresses a domain-specific task, its effectiveness is often contingent upon the background knowledge available to it. Providing an agent with well-organized, logically coherent reference material markedly improves the quality of its output. Code is already reusable through pip and npm; perhaps it is time for knowledge to become similarly downloadable, installable, and composable — so that users in the same field don't have to repeatedly organize the same foundational knowledge from scratch. KPM aims to realize this vision of "knowledge modularization" — transforming the systematic experience anyone organizes into a distributable, remixable asset that enables agents to operate more effectively across diverse domains.

For knowledge that is highly structured by nature, KPM uses hierarchical Markdown files as the representation. This structure allows AI agents to locate and retrieve information through explicit navigation and search — a complement to vector-based RAG rather than a replacement.

> **Note: Knowledge vs. skills.** A *skill* instructs an agent on how to accomplish a task — it is procedural, task-specific, and scoped to a particular project. *Knowledge*, by contrast, constitutes comprehensive reference material intended for consultation — it is declarative, systematic, and independent of any single task. "When using an unfamiliar library, consult its API reference" is a skill; the API reference itself is knowledge. The two are not mutually exclusive — a knowledge package may incorporate procedural content, and a skill may contain declarative or factual material — but the distinction lies in emphasis: knowledge is oriented toward reference, skills toward execution.

## What it does

- **Package** structured knowledge (Markdown chapters, images, metadata) into versioned `.tar.gz` archives
- **Resolve** dependencies with [semver](https://semver.org) ranges (`^1.2.0`, `~1.2.0`)
- **Install** from multiple sources: local files, HTTP URLs, and package registries
- **Sync** workspaces to exactly match declared dependencies (`kpm sync`)
- **Serve** packages via a registry server (Cloudflare Worker or standalone)

A temporary demo registry is available at `https://kpm-registry.nyanifold.workers.dev` with the following packages:

| Name | Versions | Description |
|---|---|---|
| `python-basics-kpm-demo` | 1.2.0, 1.3.0 | A beginner's guide to Python programming |
| `algebra-basics-kpm-demo` | 1.0.0 | Foundations of algebra: sets, functions, and linear equations |
| `cpp-basics-kpm-demo` | 1.0.0 | An introduction to C++ programming for beginners |
| `logic-basics-kpm-demo` | 1.0.0 | Foundations of mathematical logic: propositions, equivalences, quantifiers, and proof techniques |

## Install

```bash
npm install -g @nyanifold/kpm        # npm
bun install -g @nyanifold/kpm        # bun
```

---

## Creating a Knowledge Package

A knowledge package is a directory of Markdown files, images, and a metadata file.

```
my-algebra/
├── kpm-meta.toml
├── index.md
├── sets/
│   ├── sets.md
│   └── img/
│       └── venn-diagram.svg
├── functions/
│   ├── functions.md
│   └── img/
│       └── function-mapping.svg
└── linear-equations/
    ├── linear-equations.md
    └── img/
        └── two-lines.svg
```

Initialize the package:

```bash
cd my-algebra
kpm init --package
# prompts for name, version, description, license
```

This creates `kpm-meta.toml`. Then add your content files and run:

```bash
kpm pack
# → my-algebra@1.0.0.tar.gz
```

The archive is ready to be uploaded to a registry or shared directly.

### Naming and sizing

- **Naming:** Use descriptive kebab-case. Avoid overly generic names to prevent conflicts.
  - **Textbooks / literature:** Include the author, e.g. `linear-algebra-gilbert-strang`.
  - **Personal notes / summaries:** Include the author or domain, e.g. `quantum-chemistry-xue-d-e`.
  - **Technical documentation:** Use the tool or project name, e.g. `openmm-doc`.
- **Size:** Keep individual packages focused. Split by subject or project boundary rather than bundling everything into one large package.

### Package structure

Recommended layout:

```
{package}/
├── kpm-meta.toml              # required
├── README.md                  # about the package itself
├── index.md                   # first page of knowledge content
├── img/                       # top-level images
├── chapter1/
│   ├── index.md               # references direct children only
│   ├── topic-a.md
│   └── img/                   # resources for this chapter
└── chapter2/
    ├── topic-b.md
    └── img/
```

**README vs entry file:** `README.md` describes what the package is and how to use it (like an npm package README). The entry file (`index.md` or `{name}.md`) is the first page of the knowledge content itself, referencing all child chapters.

**Entry file lookup** (first match in order):

1. `entry` field in `kpm-meta.toml`
2. `{name}.md`
3. `{name}.{lang}.md`
4. `index.md`
5. `index.{lang}.md`

**Language suffixes** follow BCP 47, e.g. `index.zh-CN.md`, `index.ja.md`. For a request in `zh-CN`, the fallback chain is: `{stem}.zh-CN.md` → `{stem}.zh.md` → `{stem}.md`.

**Resource files** (images, videos, attachments) must live in sibling directories named by type:

| Directory | Purpose |
|---|---|
| `img/` | Images (`png`, `svg`, `jpg`) |
| `video/` | Video files |
| `audio/` | Audio files |
| `file/` | Attachments (`pdf`, `zip`) |

Cross-directory references (e.g. `chapter1/intro.md` referencing `![fig](../chapter2/img/diagram.png)`) are discouraged — keep resources local to each chapter.

**Nesting** is allowed to arbitrary depth. Each level follows the same conventions. An `index.md` at any level should only reference its direct children — grandchildren are handled by their own `index.md`.

---

## Using Packages (Workspace)

A workspace is any directory with `kpm-dependencies.toml`:

```bash
mkdir my-project && cd my-project
kpm init                   # creates kpm-dependencies.toml + knowledge_modules/
```

### Adding dependencies

```bash
kpm add file:../my-algebra.tar.gz          # local archive
kpm add https://example.com/pkg.tar.gz     # direct URL
kpm add my-package                         # bare name — see note below
```

### Syncing

```bash
kpm sync
```

After `kpm sync`, installed content lives under `knowledge_modules/`:

```
my-project/
├── kpm-dependencies.toml        # you edit this
└── knowledge_modules/           # kpm manages this
    └── my-algebra@1.0.0/
```

> **Important:** There is no default registry. When using bare package names (like `kpm add my-package`), you must configure a registry. Either set the environment variable:
> ```bash
> export KPM_REGISTRY=https://your-registry.example.com
> ```
> or configure it in `kpm-dependencies.toml`:
> ```toml
> registries = ["https://your-registry.example.com"]
> ```
> Without this, bare names have nowhere to resolve and will error. `file:` and `https://` specifiers work without any registry configuration.

### What to version-control

`knowledge_modules/` is a generated directory — like `node_modules` or `.venv` — and should not be committed. Only `kpm-dependencies.toml` needs to be tracked:

```
.gitignore:
knowledge_modules/
```

Anyone can reproduce the environment with `kpm sync`.

> **Exception: `file:` dependencies.** If your manifest references a local path (e.g. `file:../my-pkg.tar.gz`), that file must also be available to others. Either publish the referenced archive alongside the workspace, or replace `file:` with a registry or URL specifier before sharing.

---

## kpm-meta.toml Reference

Placed at the root of a knowledge package.

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | yes | `string` | Lowercase letters, digits, hyphens. Package identifier. |
| `version` | yes | `string` | Semver (`x.y.z`). Current version of the knowledge content. |
| `description` | no | `string` | Short summary of what the package contains. |
| `authors` | no | `string[]` | List of `"Name <email>"` entries. |
| `license` | no | `string` | SPDX identifier or license name (e.g. `"CC-BY-4.0"`, `"MIT"`). |
| `keywords` | no | `string[]` | Terms used for search and discovery. |
| `default_language` | no | `string` | Language code used when no language is specified (e.g. `"en"`). |
| `supported_languages` | no | `string[]` | All languages the package provides (e.g. `["en", "zh-CN"]`). |
| `entry` | no | `string` | Path to the entry file. Falls back to `{name}.md`, then `index.md`. |
| `recommendations` | no | `object` | Suggested companion packages as `"name" = "^version"` pairs. |

Example:

```toml
name = "algebra-basics"
version = "1.0.0"
description = "Foundations of algebra: sets, functions, and linear equations"
authors = ["KPM Contributors <contrib@kpm.dev>"]
license = "CC-BY-4.0"
keywords = ["algebra", "mathematics"]
default_language = "en"
supported_languages = ["en"]
entry = "index.md"

[recommendations]
# "other-package" = "^1.0.0"
```

## kpm-dependencies.toml Reference

Placed at the root of a workspace.

| Field | Required | Type | Description |
|---|---|---|---|
| `registries` | no | `string[]` | Registry URLs to search when resolving bare names. Tried in order until one succeeds. Falls back to `KPM_REGISTRY` env var. |
| `dependencies` | no | `object` | Map of package name → version specifier. See specifier types below. |
| `paths.extra` | no | `string[]` | Additional directories searched by `kpm paths`. |

### Dependency Specifiers

| Prefix | Example | Meaning |
|---|---|---|
| none (bare) | `"^1.0.0"` | Resolved against configured registries. Requires `registries` to be set. |
| `file:` | `"file:../pkg.tar.gz"` | Local path, relative to workspace root. |
| `http://` / `https://` | `"https://example.com/pkg.tar.gz"` | Direct download from URL. |
| `registry+` | `"registry+https://reg.example.com/pkg@^1.0.0"` | Pinned to a specific registry URL, independent of the workspace `registries` list. |

Example:

```toml
registries = ["https://kpm-registry.example.com"]

[dependencies]
algebra-basics = "^1.0.0"
my-notes = "file:../my-notes.tar.gz"
team-docs = "https://files.example.com/docs.tar.gz"
external-pkg = "registry+https://other-registry.example.com/external-pkg@^2.0.0"

[paths]
extra = []
```

---

## Repository Structure

| Directory | Purpose |
|---|---|
| `packages/cli` | CLI tool (`@nyanifold/kpm`) — the `kpm` command |
| `packages/core` | Core library (bundled inside `@nyanifold/kpm`) — schema, resolver, installer |
| `registry/` | Registry server — Cloudflare Worker + standalone Bun server |
| `demo-packages/` | Example knowledge packages (algebra, C++, Python, logic) |
| `demo-workspace/` | Example workspace showing all dependency source types |
| `docs/` | Getting-started guide and design notes |

## License

MIT
