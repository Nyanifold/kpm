# 将 Python 包文档打包为 KPM 知识包

> English version: [sphinx-to-markdown.md](sphinx-to-markdown.md)

许多 Python 包附带完整的 Sphinx 文档（`.rst` / `.md` 源文件与 docstring），但这些文档通常以网页形式呈现，难以被 AI Agent 直接调用。本文说明如何使用 Sphinx 将其转换为结构化 Markdown，再打包为 KPM 知识包，使 Agent 能够按需检索 API 参考和使用指南，同时便于在团队或社区内分发与复用。

整个流程分两个阶段：

1. **生成**：用 Sphinx 将原始文档构建为 `_build/markdown/` 下的 `.md` 文件
2. **打包**：将输出整理为 KPM 包目录，补充元信息后执行 `kpm pack`

生成阶段覆盖两种典型情形：

- **情形 A**：目标包已安装，可以直接 import
- **情形 B**：目标包未安装（或依赖缺失），需要绕过 import

---

## 前置条件

- Python 3.9+
- `pip`（Python 自带）

建议在虚拟环境中操作，避免污染系统环境：

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
```

---

## 第一步：安装 Sphinx 及 Markdown builder

```bash
pip install sphinx sphinx-markdown-builder
```

如果源文档中有 `.md` 文件或用到了 `myst_parser`，还需要：

```bash
pip install myst-parser
```

如果 `conf.py` 中还引用了其他扩展（如 `autodocsumm`、`sphinx-rtd-theme`），同样需要安装：

```bash
pip install autodocsumm sphinx-rtd-theme
```

---

## 第二步：确认 `conf.py` 是否存在

`docs/conf.py` 是 Sphinx 的配置文件。如果目标包没有，先初始化：

```bash
cd docs/
sphinx-quickstart
```

如果已有 `conf.py`，跳过此步。

---

## 第三步：构建 Markdown

进入包含 `conf.py` 的 docs 目录，执行：

```bash
sphinx-build -b markdown \
  -D extensions="myst_parser,sphinx.ext.autodoc,sphinx.ext.autosummary,sphinx.ext.napoleon" \
  . _build/markdown
```

参数说明：

- `-b markdown`：使用 `sphinx-markdown-builder` 输出 `.md` 文件
- `-D extensions=...`：覆盖 `conf.py` 中的扩展列表，只保留文本相关扩展，去掉 `jupyter_sphinx`、`linkcode`、`intersphinx`、`mathjax` 等需要执行代码或联网的扩展
- `. _build/markdown`：源目录为当前目录，输出到 `_build/markdown/`

---

## 情形 A：目标包已安装

先验证包是否可正常 import：

```bash
python -c "import your_package; print(your_package.__version__)"
```

如果输出版本号，直接执行第三步即可。

### 排查 autodoc 导入失败

构建时若出现：

```
WARNING: autodoc: failed to import class 'Foo' from module 'your_package'
ModuleNotFoundError: No module named 'bar'
```

说明缺少依赖，安装后重建：

```bash
pip install bar
sphinx-build -b markdown ... . _build/markdown
```

重复直到没有 `failed to import` 警告为止。

---

## 情形 B：目标包未安装（或无法安装）

当包依赖复杂（如需要 GPU、编译扩展、私有依赖）时，可以用 `autodoc_mock_imports` 让 autodoc 跳过真实 import，直接从源码静态提取 docstring。

### 在 `conf.py` 中声明 mock 模块

```python
# conf.py
autodoc_mock_imports = [
    "torch",
    "numpy",
    "scipy",
    # 把所有无法安装的依赖都列在这里
]
```

Sphinx 会把列出的模块替换为空 Mock 对象，让 autodoc 可以顺利 import 包的源文件并提取 docstring，而无需真正执行代码。

### conf.py 本身也 import 了目标包怎么办

有些 `conf.py` 在顶部直接写：

```python
from your_package import __version__
```

这会在 Sphinx 加载配置阶段就触发真实 import，此时 `autodoc_mock_imports` 还未生效，导致报错。

解决方法是**直接从源文件读取版本号**，完全绕开 import：

```python
# conf.py 顶部，替换原来的 from your_package import __version__
import os
import re

with open(os.path.join(os.path.dirname(__file__), "../your_package/__init__.py")) as f:
    __version__ = re.search(r'^__version__ = ["\'](.+)["\']', f.read()).group(1)
```

加上 `autodoc_mock_imports` 后，即可在包完全未安装的情况下构建文档。

> **局限**：mock 方式只能提取静态写在源码中的 docstring。若 docstring 由元类、装饰器在运行时动态生成，则无法提取。

---

## 输出结构

构建完成后，`_build/markdown/` 的目录结构与源文档一致：

```
_build/markdown/
├── index.md
├── guide/
│   ├── installation.md
│   └── quickstart.md
└── api/
    ├── module_a.md
    └── module_b.md
```

`.doctrees/` 是 Sphinx 的增量构建缓存，可加入 `.gitignore`，删除后下次构建会自动重建。

---

## 打包为 KPM 知识包

Markdown 生成完成后，可以将其整理为 KPM 知识包并发布共享。

### 第四步：将输出移至包目录

将 `_build/markdown/` 下的所有文件移动到一个以包命名的目录中：

```bash
mkdir your-package-doc
mv _build/markdown/* your-package-doc/
```

目录名建议使用 kebab-case，例如 `openmm-doc`。

### 第五步：补充 index.md（如缺失）

如果 Sphinx 已生成 `index.md`，跳过此步。若没有，手动创建一个，列出所有子文件的链接：

```markdown
# Your Package Documentation

- [Guide](guide/installation.md)
- [Quickstart](guide/quickstart.md)
- [API: module_a](api/module_a.md)
- [API: module_b](api/module_b.md)
```

每个条目对应 `_build/markdown/` 中的一个 `.md` 文件，路径相对于 `index.md` 所在目录。

### 第六步：补充 README.md（如缺失）

`README.md` 描述包的来源与用途，区别于知识内容本身。如果没有，可以写一个简短的：

```markdown
# your-package-doc

本包由 [Your Package](https://your-package.readthedocs.io) 的官方文档通过 Sphinx 转换生成。

原始文档版本：x.y.z
生成工具：sphinx-markdown-builder
```

### 第七步：初始化并打包

```bash
cd your-package-doc
kpm init --package
# 输入 name、version、description、license
kpm pack
# → your-package-doc@1.0.0.tar.gz
```

**版本号建议：** 如果是基于上游文档自行生成的产物，可在上游版本号后附加 `-v1`、`-v2` 等后缀以区分不同构建批次，例如：

```
openmm-doc@8.1.0-v1      # 第一次生成
openmm-doc@8.1.0-v2      # 修正了某些输出格式后重新生成
```

后缀递增表示内容有所改进，而上游版本未变。

---

## 快速参考

| 场景 | 操作 |
|------|------|
| 安装 Sphinx | `pip install sphinx sphinx-markdown-builder myst-parser` |
| 构建 Markdown | `sphinx-build -b markdown -D extensions="myst_parser,sphinx.ext.autodoc,sphinx.ext.napoleon" . _build/markdown` |
| 包未安装时 | 在 `conf.py` 中设置 `autodoc_mock_imports = [...]` |
| conf.py 本身 import 包 | 改为用 `re` 从 `__init__.py` 直接读取版本号 |
| 排查 autodoc 失败 | 查看 `WARNING: autodoc: failed to import`，安装对应缺失依赖 |
| 清除缓存重建 | `rm -rf _build/markdown && sphinx-build ...` |
