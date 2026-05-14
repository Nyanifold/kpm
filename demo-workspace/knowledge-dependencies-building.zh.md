# KPM 演示工作区 — 构建日志

本工作区逐步构建，展示了所有四种依赖源类型。

---

## 步骤 1：初始化工作区

```bash
$ kpm init
Created kpm-dependencies.toml
Created knowledge_modules/
```

初始化后的状态：

```
demo-workspace/
├── kpm-dependencies.toml    # 空白模板
└── knowledge_modules/       # 空目录
```

`kpm-dependencies.toml` 内容：

```toml
registries = []

[dependencies]
# "package-name" = "^1.0.0"

[paths]
extra = []
```

---

## 步骤 2：从本地文件安装（`file:`）

```bash
$ kpm add file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz
+ cpp-basics-kpm-demo@1.0.0
  added "cpp-basics-kpm-demo" = "file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz" to kpm-dependencies.toml
```

依赖以 `file:` 前缀记录，路径相对于工作区根目录：

```toml
cpp-basics-kpm-demo = "file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz"
```

此步骤后的知识模块：

```
knowledge_modules/
└── cpp-basics-kpm-demo@1.0.0/
```

> `file:` 前缀是必需的。如果不写，KPM 会尝试从注册表解析该名称并报错：
> ```
> $ kpm add ../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz
> Error: No registry configured.
> ```

---

## 步骤 3：从直接 URL 安装（`http://`）

```bash
$ kpm add http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz
+ algebra-basics-kpm-demo@1.0.0
  added "algebra-basics-kpm-demo" = "http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz" to kpm-dependencies.toml
```

完整 URL 会原样记录：

```toml
algebra-basics-kpm-demo = "http://kpm-registry.nyanifold.workers.dev/files/algebra-basics-kpm-demo@1.0.0.tar.gz"
```

知识模块：

```
knowledge_modules/
├── algebra-basics-kpm-demo@1.0.0/
└── cpp-basics-kpm-demo@1.0.0/
```

> 如果归档文件尚未上传或 Worker 冷启动正在进行中，注册表服务器可能会返回临时错误（404、`TAR_BAD_ARCHIVE`）。服务器就绪后重试相同命令即可解决。

---

## 步骤 4：使用 `--registry` 标志从注册表安装

```bash
$ kpm add python-basics-kpm-demo --registry https://kpm-registry.nyanifold.workers.dev
+ python-basics-kpm-demo@1.3.0
  added "python-basics-kpm-demo" = "registry+https://kpm-registry.nyanifold.workers.dev/python-basics-kpm-demo@^1.3.0" to kpm-dependencies.toml
```

由于传入了 `--registry`，该依赖通过 `registry+` 前缀锁定到特定注册表：

```toml
python-basics-kpm-demo = "registry+https://kpm-registry.nyanifold.workers.dev/python-basics-kpm-demo@^1.3.0"
```

这意味着此依赖将始终使用锁定的注册表，不受工作区级别的 `registries` 列表影响。

知识模块：

```
knowledge_modules/
├── algebra-basics-kpm-demo@1.0.0/
├── cpp-basics-kpm-demo@1.0.0/
└── python-basics-kpm-demo@1.3.0/
```

---

## 步骤 5：配置工作区默认注册表

为了在不使用 `--registry` 的情况下解析裸包名，需要在 `kpm-dependencies.toml` 中设置 `registries` 字段：

```toml
registries = ["https://kpm-registry.nyanifold.workers.dev"]
```

> **没有默认注册表。** 如果不进行此配置（或不设置 `KPM_REGISTRY` 环境变量），裸包名将无处解析。

---

## 步骤 6：安装裸名依赖（通过已配置的注册表解析）

```bash
$ kpm add logic-basics-kpm-demo
+ logic-basics-kpm-demo@1.0.0
  added "logic-basics-kpm-demo" = "^1.0.0" to kpm-dependencies.toml
```

这次不需要 `--registry` 标志——KPM 会根据已配置的 `registries` 列表进行解析。依赖以裸语义化版本范围的形式记录：

```toml
"logic-basics-kpm-demo" = "^1.0.0"
```

这是最简洁的形式：任何配置了相同注册表的人只需执行 `kpm sync` 即可获取该包的最新兼容版本。

最终的知识模块：

```
knowledge_modules/
├── algebra-basics-kpm-demo@1.0.0/
├── cpp-basics-kpm-demo@1.0.0/
├── logic-basics-kpm-demo@1.0.0/
└── python-basics-kpm-demo@1.3.0/
```

---

## 最终的 `kpm-dependencies.toml`

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

## 依赖源类型汇总

| 依赖文件中的声明 | 来源 | 安装方式 |
|---|---|---|
| `"file:../pkg.tar.gz"` | 本地归档或目录 | `kpm add file:../pkg.tar.gz` |
| `"http://...tar.gz"` | 直接 URL | `kpm add http://...tar.gz` |
| `"registry+https://reg.example.com/pkg@^1.0.0"` | 锁定注册表 | `kpm add pkg --registry https://reg.example.com` |
| `"^1.0.0"` | 默认注册表 | `kpm add pkg`（需要配置 `registries` 或 `KPM_REGISTRY`） |

## 注册表信息

本演示使用的注册表（`kpm-registry.nyanifold.workers.dev`）是临时的，托管了四个包：

| 名称 | 版本 |
|---|---|
| `python-basics-kpm-demo` | 1.2.0、1.3.0 |
| `algebra-basics-kpm-demo` | 1.0.0 |
| `cpp-basics-kpm-demo` | 1.0.0 |
| `logic-basics-kpm-demo` | 1.0.0 |

---

## 在其它地方复现此环境

整个环境可以仅通过 `kpm-dependencies.toml` 重新构建——无需重复执行 `kpm add` 步骤：

```bash
cp kpm-dependencies.toml ../another-directory/
cd ../another-directory
kpm sync
```

`kpm sync` 读取清单文件并使 `knowledge_modules/` 完全匹配：安装缺失的包、更新超出范围的版本，并移除任何未声明的模块。`knowledge_modules/` 目录本身不应提交或共享——只应提交 `kpm-dependencies.toml`。

> **注意：** 如果清单中包含 `file:` 路径（相对或绝对），请先在目标目录中调整它们。在本示例中，`file:../demo-packages/cpp-basics-kpm-demo@1.0.0.tar.gz` 仅在当前工作区目录与 `demo-packages/` 相邻时才有效。基于注册表的声明（`registry+...` 和裸语义化版本范围）则可以在任何位置使用，只要注册表可访问。
