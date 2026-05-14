import { Command } from 'commander'
import { input } from '@inquirer/prompts'
import { resolve, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

function metaTemplate(
  name: string,
  version: string,
  description: string,
  license: string,
  fmt: 'toml' | 'yaml' | 'json',
): string {
  if (fmt === 'toml') return `\
name        = "${name}"
version     = "${version}"
description = "${description}"
authors     = []
license     = "${license}"
keywords    = []

default_language    = ""
supported_languages = []

entry = ""

[recommendations]
# "other-package" = "^1.0.0"
`
  if (fmt === 'yaml') return `\
name: "${name}"
version: "${version}"
description: "${description}"
authors: []
license: "${license}"
keywords: []

default_language: ""
supported_languages: []

entry: ""

recommendations: {}
  # other-package: "^1.0.0"
`
  return JSON.stringify({
    name,
    version,
    description,
    authors: [],
    license,
    keywords: [],
    default_language: '',
    supported_languages: [],
    entry: '',
    recommendations: {},
  }, null, 2) + '\n'
}

const DEPS_TEMPLATE: Record<'toml' | 'yaml' | 'json', string> = {
  toml: `\
# Registry URLs to search when installing packages (tried in order).
# Falls back to the KPM_REGISTRY environment variable if not set.
registries = []

[dependencies]
# "package-name" = "^1.0.0"

[paths]
# Additional directories to search with \`kpm paths\`.
extra = []
`,
  yaml: `\
# Registry URLs to search when installing packages (tried in order).
# Falls back to the KPM_REGISTRY environment variable if not set.
registries: []

dependencies: {}
  # package-name: "^1.0.0"

paths:
  # Additional directories to search with \`kpm paths\`.
  extra: []
`,
  json: `\
{
  "registries": [],
  "dependencies": {},
  "paths": {
    "extra": []
  }
}
`,
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize a workspace and/or knowledge package in the current directory')
    .option('-p, --package', 'initialize as a knowledge package (creates kpm-meta.toml)')
    .option('-w, --workspace', 'initialize as a workspace (creates kpm-dependencies.toml)')
    .option('--format <fmt>', 'metadata format: toml, yaml, json', 'toml')
    .addHelpText('after', `
Examples:
  $ kpm init                        Create a workspace (kpm-dependencies.toml + knowledge_modules/)
  $ kpm init --workspace            Same as above, explicit
  $ kpm init --package              Create a knowledge package (prompts for name, version, etc.)
  $ kpm init --workspace --package  Initialize both workspace and package metadata
  $ kpm init --package --format yaml  Use YAML format for kpm-meta.yaml

Notes:
  With no flags, --workspace is assumed.
  --package prompts interactively for name, version, description, and license.
  Supported formats: toml (default), yaml, json.`)
    .action(async (opts: { package?: boolean; workspace?: boolean; format: string }) => {
      const dir = resolve('.')
      const fmt = opts.format as 'toml' | 'yaml' | 'json'

      let asPackage = opts.package ?? false
      let asWorkspace = opts.workspace ?? false

      if (!asPackage && !asWorkspace) {
        asWorkspace = true
      }

      if (asPackage) {
        const name = await input({
          message: 'Package name (lowercase letters, digits, hyphens):',
          validate: v => /^[a-z0-9-]+$/.test(v) || 'Invalid package name',
        })
        const version = await input({ message: 'Version:', default: '1.0.0' })
        const description = await input({ message: 'Description (optional):', default: '' })
        const license = await input({ message: 'License:', default: 'CC-BY-4.0' })

        const metaFile = join(dir, `kpm-meta.${fmt}`)
        await writeFile(metaFile, metaTemplate(name, version, description, license, fmt), 'utf-8')
        console.log(`Created kpm-meta.${fmt}`)
      }

      if (asWorkspace) {
        const depsFile = join(dir, `kpm-dependencies.${fmt}`)
        await writeFile(depsFile, DEPS_TEMPLATE[fmt], 'utf-8')
        await mkdir(resolve('knowledge_modules'), { recursive: true })
        console.log(`Created kpm-dependencies.${fmt}`)
        console.log('Created knowledge_modules/')
      }
    })
}
