# Packaging Python Package Docs as a KPM Knowledge Package

> 中文版：[sphinx-to-markdown.zh.md](sphinx-to-markdown.zh.md)

Many Python packages ship with complete Sphinx documentation (`.rst` / `.md` source files and docstrings), but that documentation is typically rendered as a website, making it difficult for AI agents to consume directly. This guide explains how to use Sphinx to convert it into structured Markdown and then package it as a KPM knowledge package, so agents can retrieve API references and usage guides on demand while making it easy to distribute and reuse across teams or communities.

The workflow has two phases:

1. **Generate**: use Sphinx to build `.md` files under `_build/markdown/`
2. **Package**: organize the output into a KPM package directory, add metadata, then run `kpm pack`

The generation phase covers two common scenarios:

- **Case A**: the target package is installed and can be imported directly
- **Case B**: the target package is not installed (or has missing dependencies) and import must be bypassed

---

## Prerequisites

- Python 3.9+
- `pip` (bundled with Python)

Working in a virtual environment is recommended to avoid polluting the system environment:

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
```

---

## Step 1: Install Sphinx and the Markdown builder

```bash
pip install sphinx sphinx-markdown-builder
```

If the source docs contain `.md` files or use `myst_parser`:

```bash
pip install myst-parser
```

If `conf.py` references other extensions (e.g. `autodocsumm`, `sphinx-rtd-theme`):

```bash
pip install autodocsumm sphinx-rtd-theme
```

---

## Step 2: Confirm `conf.py` exists

`docs/conf.py` is the Sphinx configuration file. If the target package does not have one, initialize it first:

```bash
cd docs/
sphinx-quickstart
```

If `conf.py` already exists, skip this step.

---

## Step 3: Build Markdown

From the directory that contains `conf.py`, run:

```bash
sphinx-build -b markdown \
  -D extensions="myst_parser,sphinx.ext.autodoc,sphinx.ext.autosummary,sphinx.ext.napoleon" \
  . _build/markdown
```

Flag explanation:

- `-b markdown`: use `sphinx-markdown-builder` to emit `.md` files
- `-D extensions=...`: override the extension list in `conf.py`, keeping only text-related extensions and dropping `jupyter_sphinx`, `linkcode`, `intersphinx`, `mathjax`, etc., which require code execution or network access
- `. _build/markdown`: source directory is the current directory; output goes to `_build/markdown/`

---

## Case A: Target package is installed

First verify the package can be imported:

```bash
python -c "import your_package; print(your_package.__version__)"
```

If it prints a version number, proceed directly to Step 3.

### Troubleshooting autodoc import failures

If the build emits:

```
WARNING: autodoc: failed to import class 'Foo' from module 'your_package'
ModuleNotFoundError: No module named 'bar'
```

a dependency is missing. Install it and rebuild:

```bash
pip install bar
sphinx-build -b markdown ... . _build/markdown
```

Repeat until there are no more `failed to import` warnings.

---

## Case B: Target package is not installed (or cannot be installed)

When a package has complex dependencies (e.g. requires a GPU, compiled extensions, or private dependencies), use `autodoc_mock_imports` to make autodoc skip real imports and extract docstrings statically from source files instead.

### Declare mock modules in `conf.py`

```python
# conf.py
autodoc_mock_imports = [
    "torch",
    "numpy",
    "scipy",
    # list every dependency that cannot be installed
]
```

Sphinx replaces the listed modules with empty Mock objects, allowing autodoc to import the package's source files and extract docstrings without actually executing any code.

### What if `conf.py` itself imports the target package?

Some `conf.py` files have this at the top:

```python
from your_package import __version__
```

This triggers a real import while Sphinx is loading its configuration, before `autodoc_mock_imports` takes effect, causing an error.

The fix is to **read the version directly from the source file**, bypassing import entirely:

```python
# conf.py — replace the original `from your_package import __version__`
import os
import re

with open(os.path.join(os.path.dirname(__file__), "../your_package/__init__.py")) as f:
    __version__ = re.search(r'^__version__ = ["\'](.+)["\']', f.read()).group(1)
```

Combined with `autodoc_mock_imports`, this allows docs to be built even when the package is completely uninstalled.

> **Limitation**: mock mode can only extract docstrings written statically in source code. Docstrings generated dynamically at runtime by metaclasses or decorators will not be captured.

---

## Output structure

After a successful build, `_build/markdown/` mirrors the source documentation layout:

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

`.doctrees/` is Sphinx's incremental build cache. You can add it to `.gitignore`; deleting it forces a full rebuild on the next run.

---

## Packaging as a KPM knowledge package

Once the Markdown is generated, organize it into a KPM knowledge package for distribution.

### Step 4: Move output to a package directory

Move all files under `_build/markdown/` into a directory named after the package:

```bash
mkdir your-package-doc
mv _build/markdown/* your-package-doc/
```

Use kebab-case for the directory name, e.g. `openmm-doc`.

### Step 5: Add `index.md` if missing

If Sphinx already produced `index.md`, skip this step. Otherwise create one that links to every sub-file:

```markdown
# Your Package Documentation

- [Guide](guide/installation.md)
- [Quickstart](guide/quickstart.md)
- [API: module_a](api/module_a.md)
- [API: module_b](api/module_b.md)
```

Each entry corresponds to a `.md` file in `_build/markdown/`, with paths relative to `index.md`.

### Step 6: Add `README.md` if missing

`README.md` describes the package's origin and purpose, distinct from the knowledge content itself. If absent, a short one suffices:

```markdown
# your-package-doc

This package was generated from the official [Your Package](https://your-package.readthedocs.io) documentation using Sphinx.

Upstream docs version: x.y.z
Build tool: sphinx-markdown-builder
```

### Step 7: Initialize and pack

```bash
cd your-package-doc
kpm init --package
# enter name, version, description, license
kpm pack
# → your-package-doc@1.0.0.tar.gz
```

**Version naming tip:** when the package is built from upstream docs rather than released by the upstream project, append a suffix like `-v1`, `-v2` to distinguish build iterations:

```
openmm-doc@8.1.0-v1      # first build
openmm-doc@8.1.0-v2      # rebuilt after fixing some output formatting
```

The incrementing suffix signals improved content while the upstream version remains unchanged.

---

## Quick reference

| Scenario | Action |
|----------|--------|
| Install Sphinx | `pip install sphinx sphinx-markdown-builder myst-parser` |
| Build Markdown | `sphinx-build -b markdown -D extensions="myst_parser,sphinx.ext.autodoc,sphinx.ext.napoleon" . _build/markdown` |
| Package not installed | Set `autodoc_mock_imports = [...]` in `conf.py` |
| `conf.py` imports the package | Replace with `re` to read the version directly from `__init__.py` |
| Troubleshoot autodoc failures | Look for `WARNING: autodoc: failed to import` and install the missing dependency |
| Clear cache and rebuild | `rm -rf _build/markdown && sphinx-build ...` |
