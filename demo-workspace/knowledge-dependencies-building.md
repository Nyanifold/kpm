# KPM Demo Workspace — Build Log

This workspace was built step by step to demonstrate all four dependency source types.

---

## Step 1: Initialize the workspace

```bash
$ kpm init
Created kpm-dependencies.toml
Created knowledge_modules/
```

State after init:

```
demo-workspace/
├── kpm-dependencies.toml    # empty template
└── knowledge_modules/       # empty directory
```

`kpm-dependencies.toml` contents:

```toml
registries = []

[dependencies]
# "package-name" = "^1.0.0"

[paths]
extra = []
```

---

## Step 2: Install from a local file (`file:`)

```bash
$ kpm add file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz
+ cpp-basics-kpm-demo@1.0.0
  added "cpp-basics-kpm-demo" = "file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz" to kpm-dependencies.toml
```

The dependency is recorded with a `file:` prefix, relative to the workspace root:

```toml
cpp-basics-kpm-demo = "file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz"
```

Knowledge modules after this step:

```
knowledge_modules/
└── cpp-basics-kpm-demo@1.0.0/
```

> The `file:` prefix is required. Without it, KPM tries to resolve the name against a registry and fails:
> ```
> $ kpm add ../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz
> Error: No registry configured.
> ```

---

## Step 3: Install from a direct URL (`http://`)

```bash
$ kpm add http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz
+ algebra-basics-kpm-demo@1.0.0
  added "algebra-basics-kpm-demo" = "http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz" to kpm-dependencies.toml
```

The full URL is recorded verbatim:

```toml
algebra-basics-kpm-demo = "http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz"
```

Knowledge modules:

```
knowledge_modules/
├── algebra-basics-kpm-demo@1.0.0/
└── cpp-basics-kpm-demo@1.0.0/
```

> The registry server may return transient errors (404, `TAR_BAD_ARCHIVE`) if the archive hasn't been uploaded yet or the Worker cold-start is in progress. Retrying the same command resolves it once the server is ready.

---

## Step 4: Install from a registry with `--registry` flag

```bash
$ kpm add python-basics-kpm-demo --registry https://kpm-registry.nyanifold.workers.dev
+ python-basics-kpm-demo@1.3.0
  added "python-basics-kpm-demo" = "registry+https://kpm-registry.nyanifold.workers.dev/python-basics-kpm-demo@^1.3.0" to kpm-dependencies.toml
```

Because `--registry` is passed, the dependency is pinned to that specific registry with the `registry+` prefix:

```toml
python-basics-kpm-demo = "registry+https://kpm-registry.nyanifold.workers.dev/python-basics-kpm-demo@^1.3.0"
```

This means this dependency will always use the pinned registry, regardless of the workspace-level `registries` list.

Knowledge modules:

```
knowledge_modules/
├── algebra-basics-kpm-demo@1.0.0/
├── cpp-basics-kpm-demo@1.0.0/
└── python-basics-kpm-demo@1.3.0/
```

---

## Step 5: Configure the workspace default registry

To resolve bare package names without `--registry`, the `registries` field must be set in `kpm-dependencies.toml`:

```toml
registries = ["https://kpm-registry.nyanifold.workers.dev"]
```

> **There is no default registry.** Without this configuration (or the `KPM_REGISTRY` environment variable), bare names have nowhere to resolve.

---

## Step 6: Install a bare-name dependency (resolved via configured registries)

```bash
$ kpm add logic-basics-kpm-demo
+ logic-basics-kpm-demo@1.0.0
  added "logic-basics-kpm-demo" = "^1.0.0" to kpm-dependencies.toml
```

This time no `--registry` flag is needed — KPM resolves against the configured `registries` list. The dependency is recorded as a bare semver range:

```toml
"logic-basics-kpm-demo" = "^1.0.0"
```

This is the simplest form: anyone with the same registry configured can `kpm sync` to get this package at the latest compatible version.

Final knowledge_modules:

```
knowledge_modules/
├── algebra-basics-kpm-demo@1.0.0/
├── cpp-basics-kpm-demo@1.0.0/
├── logic-basics-kpm-demo@1.0.0/
└── python-basics-kpm-demo@1.3.0/
```

---

## Final `kpm-dependencies.toml`

```toml
registries = ["https://kpm-registry.nyanifold.workers.dev"]

[dependencies]
cpp-basics-kpm-demo = "file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz"
algebra-basics-kpm-demo = "http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz"
python-basics-kpm-demo = "registry+https://kpm-registry.nyanifold.workers.dev/python-basics-kpm-demo@^1.3.0"
logic-basics-kpm-demo = "^1.0.0"

[paths]
extra = []
```

## Dependency source types summary

| Specifier in deps file | Source | How to install |
|---|---|---|
| `"file:../pkg.tar.gz"` | Local archive or directory | `kpm add file:../pkg.tar.gz` |
| `"http://...tar.gz"` | Direct URL | `kpm add http://...tar.gz` |
| `"registry+https://reg.example.com/pkg@^1.0.0"` | Pinned registry | `kpm add pkg --registry https://reg.example.com` |
| `"^1.0.0"` | Default registry(s) | `kpm add pkg` (requires `registries` or `KPM_REGISTRY`) |

## Registry information

The registry used in this demo (`kpm-registry.nyanifold.workers.dev`) is temporary and hosts five packages:

| Name | Versions |
|---|---|
| `python-basics-kpm-demo` | 1.2.0, 1.3.0 |
| `algebra-basics-kpm-demo` | 1.0.0 |
| `cpp-basics-kpm-demo` | 1.0.0 |
| `logic-basics-kpm-demo` | 1.0.0 |

---

## Reproducing this environment elsewhere

The entire environment can be reproduced from `kpm-dependencies.toml` alone — no need to repeat the `kpm add` steps:

```bash
cp kpm-dependencies.toml ../another-directory/
cd ../another-directory
kpm sync
```

`kpm sync` reads the manifest and makes `knowledge_modules/` match exactly: installing missing packages, updating out-of-range ones, and removing anything not declared. The `knowledge_modules/` directory itself is not meant to be committed or shared — only `kpm-dependencies.toml` is.

> **Note:** If the manifest contains `file:` paths (relative or absolute), adjust them for the target directory first. In this example, `file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz` only works when the workspace is next to `demo-packages/`. Registry-backed specifiers (`registry+...` and bare semver ranges) work anywhere as long as the registry is reachable.
