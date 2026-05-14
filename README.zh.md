# KPM — 知识包管理器

[English](README.md)

KPM (Knowledge Package Manager) 是一款对系统性知识（笔记、书目、经验总结等）进行**结构化组织、打包分发**的工具。

AI Agent 在应对特定领域任务时，其表现往往取决于所能调用的背景知识。如果能为其提供一套组织严密、逻辑清晰的参考资料，其输出质量便会显著提升。我们都很熟悉基于 pip 和 npm 等工具的代码复用；或许，对 Agent 系统而言，知识本身也应当具备可下载、可安装、可组合的特性，避免同一领域的用户重复整理相同知识。KPM 的目标正是实现这种"知识模块化"——使每个人梳理的系统性知识都能转化为可分发、可重组的资产，从而让 Agent 更好地应对各个领域的任务。

对于高度结构化的领域知识，KPM 采用 Markdown 文件的层次化表示。这种结构允许 AI Agent 通过显性的导航与搜索来精准定位和检索知识，与向量检索式 RAG 形成正交互补。

> **注意：知识与技能的区别。** 技能（skill）提示 Agent 如何完成一项任务——它是流程性的、针对特定任务的、范围限定于某一类任务之内。知识则是成体系的、供查阅的参考信息——它是陈述性的、系统化的，不绑定于任何单一任务。"使用陌生库时查阅其 API 文档"属于技能，而 API 文档本身属于知识。但是二者并非互斥——知识包中可以包含流程性内容，技能中也可以包含描述性或事实性内容。二者的区别更加在于侧重点：知识面向查阅，技能面向执行。

## 已完成的功能

- **打包** 结构化知识（Markdown 章节、图片、元信息）为带版本号的 `.tar.gz` 归档
- **解析** 基于 [semver](https://semver.org) 的版本约束（`^1.2.0`、`~1.2.0`）
- **安装** 支持四种来源：本地文件、HTTP 直链、默认 registry、显式 registry
- **同步** 使 `knowledge_modules/` 与 `kpm-dependencies.toml` 精确对齐（`kpm sync`）
- **发布** 通过 registry 服务（Cloudflare Worker / Bun 独立服务器）分发知识包

临时演示 registry 位于 `https://kpm-registry.nyanifold.workers.dev`，包含以下知识包：

| 名称 | 版本 | 描述 |
|---|---|---|
| `python-basics-kpm-demo` | 1.2.0, 1.3.0 | A beginner's guide to Python programming |
| `algebra-basics-kpm-demo` | 1.0.0 | Foundations of algebra: sets, functions, and linear equations |
| `cpp-basics-kpm-demo` | 1.0.0 | An introduction to C++ programming for beginners |
| `logic-basics-kpm-demo` | 1.0.0 | Foundations of mathematical logic: propositions, equivalences, quantifiers, and proof techniques |

## 安装

```bash
npm install -g @nyanifold/kpm        # npm
bun install -g @nyanifold/kpm        # bun
```

---

## 编写知识包

知识包是一个包含 Markdown 文件、图片和元信息文件的目录。

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

初始化知识包：

```bash
cd my-algebra
kpm init --package
# 交互式输入：name、version、description、license
```

这会创建 `kpm-meta.toml`。然后放入内容文件，执行：

```bash
kpm pack
# → my-algebra@1.0.0.tar.gz
```

生成的归档可以上传到 registry 或直接分享。

### 命名与规模

- **命名：** 使用具有描述性的短横线命名法（kebab-case）。避免使用过于宽泛的名称，以免产生命名冲突。
  - **教材/文献：** 包含作者名以区分，如 `linear-algebra-gilbert-strang`。
  - **个人总结：** 包含作者或领域，如 `quantum-chemistry-xue-d-e`。
  - **技术文档：** 直接使用工具或项目名，如 `openmm-doc`。
- **规模：** 单个模块不宜过大，建议按学科或项目边界拆分。

### 包结构

推荐布局：

```
{package}/
├── kpm-meta.toml              # 必须存在
├── README.md                  # 介绍包本身
├── index.md                   # 知识内容的第一页
├── img/                       # 顶层图片
├── chapter1/
│   ├── index.md               # 仅引用直接子级
│   ├── topic-a.md
│   └── img/                   # 本章节的资源
└── chapter2/
    ├── topic-b.md
    └── img/
```

**README 与入口文件的区别：** `README.md` 描述这个包是什么、如何使用（类似 npm 包的 README）。入口文件（`index.md` 或 `{name}.md`）是知识内容本身的第一页，引用各子章节。

**入口文件查找**（依次匹配，首次命中即停止）：

1. `kpm-meta.toml` 中的 `entry` 字段
2. `{name}.md`
3. `{name}.{lang}.md`
4. `index.md`
5. `index.{lang}.md`

**语言后缀** 遵循 BCP 47 格式，如 `index.zh-CN.md`、`index.ja.md`。请求 `zh-CN` 时的回退链：`{stem}.zh-CN.md` → `{stem}.zh.md` → `{stem}.md`。

**资源文件**（图片、视频、附件）必须放在同级对应类型的子目录中：

| 目录 | 用途 |
|---|---|
| `img/` | 图片（`png`、`svg`、`jpg`） |
| `video/` | 视频文件 |
| `audio/` | 音频文件 |
| `file/` | 附件（`pdf`、`zip`） |

不推荐跨目录引用（如 `chapter1/intro.md` 中写 `![图](../chapter2/img/diagram.png)`）——建议各章节资源保持局部化。

**嵌套** 支持任意深度，每一层遵循相同规范。各层的 `index.md` 只负责引用本层直接子级——孙层由其自己的 `index.md` 管理。

---

## 使用知识包（工作区）

包含 `kpm-dependencies.toml` 的目录即为工作区：

```bash
mkdir my-project && cd my-project
kpm init                   # 创建 kpm-dependencies.toml + knowledge_modules/
```

### 添加依赖

```bash
kpm add file:../my-algebra.tar.gz          # 本地归档
kpm add https://example.com/pkg.tar.gz     # 直接 URL
kpm add my-package                         # 裸名称——注意下方说明
```

### 同步

```bash
kpm sync
```

执行后，已安装的内容位于 `knowledge_modules/`：

```
my-project/
├── kpm-dependencies.toml        # 你手动编辑此文件
└── knowledge_modules/           # kpm 自动管理此目录
    └── my-algebra@1.0.0/
```

> **重要：** 目前没有默认 registry。使用裸包名（如 `kpm add my-package`）时，必须配置 registry。可以通过环境变量：
> ```bash
> export KPM_REGISTRY=https://your-registry.example.com
> ```
> 或在 `kpm-dependencies.toml` 中配置：
> ```toml
> registries = ["https://your-registry.example.com"]
> ```
> 不配置的话，裸名称无处解析，会直接报错。`file:` 和 `https://` 来源不需要 registry 即可使用。

### 版本控制

`knowledge_modules/` 是生成目录——类似 `node_modules` 或 `.venv`——不应提交到版本控制。只需追踪 `kpm-dependencies.toml`：

```
.gitignore:
knowledge_modules/
```

其他人通过 `kpm sync` 即可复现完整环境。

> **例外：`file:` 依赖。** 如果 manifest 引用了本地路径（如 `file:../my-pkg.tar.gz`），该文件也需要一并提供。可以选择将引用的归档一同发布，或在分享前将 `file:` 替换为 registry 或 URL 声明。

---

## kpm-meta.toml 参考

放置在知识包根目录。

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `name` | 是 | `string` | 小写字母、数字、连字符。包的标识符。 |
| `version` | 是 | `string` | 语义化版本 `x.y.z`。知识内容的当前版本。 |
| `description` | 否 | `string` | 包的简要描述。 |
| `authors` | 否 | `string[]` | `"姓名 <邮箱>"` 格式的列表。 |
| `license` | 否 | `string` | SPDX 标识或许可证名称（如 `"CC-BY-4.0"`、`"MIT"`）。 |
| `keywords` | 否 | `string[]` | 用于搜索和发现的标签。 |
| `default_language` | 否 | `string` | 未指定语言时使用的默认语言代码（如 `"en"`）。 |
| `supported_languages` | 否 | `string[]` | 包提供的所有语言（如 `["en", "zh-CN"]`）。 |
| `entry` | 否 | `string` | 入口文件路径。缺失时依次回退到 `{name}.md`、`index.md`。 |
| `recommendations` | 否 | `object` | 推荐配套包，格式为 `"包名" = "^版本范围"`。 |

示例：

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

## kpm-dependencies.toml 参考

放置在工作区根目录。

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `registries` | 否 | `string[]` | Registry URL 列表。解析裸名称时按顺序尝试，首个成功即停止。未设置时回退到 `KPM_REGISTRY` 环境变量。 |
| `dependencies` | 否 | `object` | 包名 → 版本声明 的映射。声明格式见下表。 |
| `paths.extra` | 否 | `string[]` | `kpm paths` 额外搜索的目录列表。 |

### 依赖声明类型

| 前缀 | 示例 | 含义 |
|---|---|---|
| 无（裸名称） | `"^1.0.0"` | 通过 registries 解析。**需要配置 `registries` 字段。** |
| `file:` | `"file:../pkg.tar.gz"` | 本地路径，相对于工作区根目录。 |
| `http://` / `https://` | `"https://example.com/pkg.tar.gz"` | 直接从 URL 下载。 |
| `registry+` | `"registry+https://reg.example.com/pkg@^1.0.0"` | 绑定到特定 registry URL，不受工作区 `registries` 列表影响。 |

示例：

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

## 仓库结构

| 目录 | 用途 |
|---|---|
| `packages/cli` | CLI 工具 (`@nyanifold/kpm`)——`kpm` 命令 |
| `packages/core` | 核心库（打包在 `@nyanifold/kpm` 内部）——schema、解析器、安装器 |
| `registry/` | Registry 服务——Cloudflare Worker + Bun 独立服务器 |
| `demo-packages/` | 示例知识包（代数、C++、Python、逻辑） |
| `demo-workspace/` | 示例工作区，展示全部四种依赖来源 |
| `docs/` | 入门指南与设计笔记 |

## 许可证

MIT
