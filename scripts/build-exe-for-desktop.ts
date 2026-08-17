/**
 * Build the desktop runtime single executables with the same @yao-pkg/pkg
 * --sea route as scripts/build-exe-for-python-sdk.ts: pnpm deploy
 * materializes the dsh-desktop-agent-pkg closure, then pkg packs the staged
 * tree with Node embedded. The desktop staging directory lives under
 * dist-exe/ (gitignored) instead of a Python carrier because no Python wheel
 * consumes this runtime; the packaged executable is the deliverable.
 *
 * @module scripts/build-exe-for-desktop
 */

import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { chmod, copyFile, cp, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const root = resolve(import.meta.dirname, '..')

/** The closure manifest whose dependencies define the executable. */
const DEPLOY_ROOT_PACKAGE = 'dsh-desktop-agent-pkg'
/** The closed-runtime app entry inside the deployed closure. */
const ENTRY_BIN = 'node_modules/@deepseek-ai/dsh-desktop-runtime/lib/packaged-bin.js'
const OUTPUT_BASENAME = 'dsh-desktop-runtime'
const DEFAULT_NODE_RANGE = 'node24'
/** Pinned for reproducible builds. */
const PKG_SPEC = '@yao-pkg/pkg@6.21.0'
const OUT_DIR = 'dist-exe'
const STAGING_DIR = 'dist-exe/.desktop-staging'
/** The deploy root's own node_modules tree (the pnpm links of its closure). */
const DEPLOY_SOURCE_NODE_MODULES = 'apps/desktop-agent-pkg/node_modules'

/**
 * Whole-tree assets cover Cordis's runtime bare-package imports, which pkg's
 * static analysis cannot see. Package manifests are explicit because bare-name
 * resolution depends on them.
 */
const ASSET_GLOBS = [
  'package.json',
  'node_modules/**/*.js',
  'node_modules/**/*.cjs',
  'node_modules/**/*.mjs',
  'node_modules/**/package.json',
  'node_modules/**/*.json',
  'node_modules/**/*.node',
  'node_modules/**/*.wasm',
  'node_modules/**/*.dylib',
  'node_modules/**/*.so',
]

const PLATFORMS = ['linux', 'macos'] as const
const ARCHES = ['x64', 'arm64'] as const
type Platform = (typeof PLATFORMS)[number]
type Arch = (typeof ARCHES)[number]

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value)
}

function isArch(value: string): value is Arch {
  return (ARCHES as readonly string[]).includes(value)
}

/** A parsed pkg target triple. */
class Target {
  private constructor(
    readonly nodeRange: string,
    readonly platform: Platform,
    readonly arch: Arch,
  ) {}

  get spec(): string {
    return this.nodeRange + '-' + this.platform + '-' + this.arch
  }

  static parse(spec: string): Target {
    const parts = spec.split('-')
    const [nodeRange, platform, arch] = parts
    if (parts.length !== 3 || nodeRange === undefined || platform === undefined || arch === undefined) {
      throw new Error('build-exe-for-desktop: target ' + JSON.stringify(spec) + ' must be <nodeRange>-<platform>-<arch>, e.g. node24-macos-arm64.')
    }
    if (!/^node\d+$/.test(nodeRange)) {
      throw new Error('build-exe-for-desktop: node range must look like node24, got ' + JSON.stringify(nodeRange) + '.')
    }
    if (!isPlatform(platform)) {
      throw new Error('build-exe-for-desktop: platform must be one of ' + PLATFORMS.join(', ') + ', got ' + JSON.stringify(platform) + '.')
    }
    if (!isArch(arch)) {
      throw new Error('build-exe-for-desktop: architecture must be one of ' + ARCHES.join(', ') + ', got ' + JSON.stringify(arch) + '.')
    }
    return new Target(nodeRange, platform, arch)
  }

  static host(): Target {
    const platform = process.platform === 'darwin' ? 'macos' : process.platform === 'linux' ? 'linux' : undefined
    if (platform === undefined) {
      throw new Error('build-exe-for-desktop: unsupported host platform ' + process.platform + '; pass --targets explicitly.')
    }
    const arch = process.arch === 'x64' || process.arch === 'arm64' ? process.arch : undefined
    if (arch === undefined) {
      throw new Error('build-exe-for-desktop: unsupported host architecture ' + process.arch + '; pass --targets explicitly.')
    }
    return new Target(DEFAULT_NODE_RANGE, platform, arch)
  }
}

/** Command-line options for the desktop packaging spike. */
class BuildCli {
  readonly targets: Target[]
  readonly skipBuild: boolean
  readonly dryRun: boolean

  private constructor(targets: Target[], skipBuild: boolean, dryRun: boolean) {
    this.targets = targets
    this.skipBuild = skipBuild
    this.dryRun = dryRun
  }

  static parse(argv: string[]): BuildCli {
    const { values } = parseArgs({
      args: argv,
      options: {
        targets: { type: 'string' },
        'skip-build': { type: 'boolean' },
        'dry-run': { type: 'boolean' },
      },
    })
    const targets = values.targets === undefined || values.targets === ''
      ? [Target.host()]
      : values.targets.split(',').map(spec => Target.parse(spec.trim()))
    return new BuildCli(targets, values['skip-build'] === true, values['dry-run'] === true)
  }
}

function pnpmBin(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

/** Render a command for logs and errors, quoting arguments with spaces. */
function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(part => (part.includes(' ') ? JSON.stringify(part) : part)).join(' ')
}

/** Sequential build pipeline. Subprocesses inherit stdio and errors include the command. */
class SingleExeBuild {
  readonly staging = resolve(root, STAGING_DIR)
  private readonly outDir = resolve(root, OUT_DIR)

  constructor(private readonly cli: BuildCli) {}

  private async run(label: string, command: string, args: string[]): Promise<void> {
    if (this.cli.dryRun) {
      console.log('build-exe-for-desktop: [dry-run] ' + label + ': ' + formatCommand(command, args))
      return
    }
    console.log('build-exe-for-desktop: ' + label + ': ' + formatCommand(command, args))
    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(command, args, {
        cwd: root,
        // stdin closed: package managers and dlx then run non-interactively
        // (approve-builds prompts are auto-denied) instead of blocking on a
        // TTY question the build cannot answer.
        stdio: ['ignore', 'inherit', 'inherit'],
        env: { ...process.env, CI: 'true' },
      })
      child.once('error', (error) => {
        reject(new Error('build-exe-for-desktop: ' + label + ' failed to spawn: ' + error.message))
      })
      child.once('exit', (code, signal) => {
        if (code === 0) {
          resolvePromise()
          return
        }
        const cause = code === null ? 'signal ' + (signal ?? 'unknown') : 'exit code ' + String(code)
        reject(new Error('build-exe-for-desktop: ' + label + ' failed (' + cause + ')'))
      })
    })
  }

  /** Verify the closure before compiling or packaging. */
  async verifyClosure(): Promise<void> {
    // Run tsx directly: `pnpm exec` performs its own dependency-status
    // check and can prompt for a modules purge the build cannot answer.
    await this.run('runtime dependency closure', process.execPath, [
      '--experimental-strip-types', 'scripts/verify-runtime-closure.ts', '--manifest', 'apps/desktop-agent-pkg/package.json',
    ])
  }

  /** Build all package artifacts unless --skip-build was passed. */
  async build(): Promise<void> {
    if (this.cli.skipBuild) {
      console.log('build-exe-for-desktop: skipping pnpm run build (--skip-build)')
      return
    }
    await this.run('build', pnpmBin(), [
      '--config.confirmModulesPurge=false',
      '--config.strictDepBuilds=false',
      'run',
      'build',
    ])
  }

  /** Clear and deploy the runtime closure into the staging directory. */
  async deployStaging(): Promise<void> {
    if (this.staging === root || root.startsWith(this.staging + sep)) {
      throw new Error('build-exe-for-desktop: refusing to clear staging dir ' + this.staging + ': it contains the repo root.')
    }
    if (!this.cli.dryRun) await rm(this.staging, { recursive: true, force: true })
    await this.run('deploy', pnpmBin(), [
      '--filter',
      DEPLOY_ROOT_PACKAGE,
      '--config.confirmModulesPurge=false',
      '--config.strictDepBuilds=false',
      'deploy',
      '--legacy',
      '--prod',
      '--config.node-linker=hoisted',
      '--config.auto-install-peers=false',
      '--config.link-workspace-packages=true',
      this.staging,
    ])
    await this.restoreLegacyHoists()
    await this.materializeStagedLinks()
  }

  /** Restore direct packages that pnpm's legacy hoister places beside the deploy source instead of in the target. */
  private async restoreLegacyHoists(): Promise<void> {
    if (this.cli.dryRun) {
      console.log('build-exe-for-desktop: [dry-run] restore direct dependencies omitted by legacy deploy')
      return
    }
    const manifestPath = join(this.staging, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const sourceNodeModules = resolve(root, DEPLOY_SOURCE_NODE_MODULES)
    const restored: string[] = []
    for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) {
      const destination = join(this.staging, 'node_modules', dependency)
      if (existsSync(destination)) continue
      const source = join(sourceNodeModules, dependency)
      if (!existsSync(source)) {
        throw new Error('build-exe-for-desktop: deployed dependency ' + dependency + ' is absent from both ' + destination + ' and ' + source + '.')
      }
      await mkdir(dirname(destination), { recursive: true })
      const nestedNodeModules = join(source, 'node_modules')
      await cp(source, destination, {
        recursive: true,
        dereference: true,
        filter: path => path !== nestedNodeModules && !path.startsWith(nestedNodeModules + sep),
      })
      restored.push(dependency)
    }
    const stillMissing = Object.keys(manifest.dependencies ?? {})
      .filter(dependency => !existsSync(join(this.staging, 'node_modules', dependency)))
    if (stillMissing.length > 0) {
      throw new Error('build-exe-for-desktop: staged dependencies remain missing: ' + stillMissing.join(', ') + '.')
    }
    if (restored.length > 0) {
      console.log('build-exe-for-desktop: restored legacy deploy hoists: ' + restored.join(', '))
    }
  }

  /** Replace deploy-time package links with files and reject any remaining link. */
  private async materializeStagedLinks(): Promise<void> {
    if (this.cli.dryRun) {
      console.log('build-exe-for-desktop: [dry-run] materialize staged package links')
      return
    }
    const nodeModules = join(this.staging, 'node_modules')
    let remaining = await this.findSymlink(nodeModules)
    while (remaining !== undefined) {
      const segments = remaining.slice(nodeModules.length + 1).split(sep)
      const binIndex = segments.lastIndexOf('.bin')
      if (binIndex >= 0) {
        await rm(join(nodeModules, ...segments.slice(0, binIndex + 1)), { recursive: true, force: true })
        remaining = await this.findSymlink(nodeModules)
        continue
      }
      const destination = remaining
      const source = await realpath(destination)
      const nestedNodeModules = join(source, 'node_modules')
      await rm(destination, { recursive: true, force: true })
      await cp(source, destination, {
        recursive: true,
        dereference: true,
        filter: path => path !== nestedNodeModules && !path.startsWith(nestedNodeModules + sep),
      })
      remaining = await this.findSymlink(nodeModules)
    }
  }

  /** Return the first symbolic link below a directory, if one exists. */
  private async findSymlink(directory: string): Promise<string | undefined> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const metadata = await lstat(path)
      if (metadata.isSymbolicLink()) return path
      if (metadata.isDirectory()) {
        const nested = await this.findSymlink(path)
        if (nested !== undefined) return nested
      }
    }
    return undefined
  }

  /** Add the executable entry and pkg assets to the staged manifest. */
  async injectPkgConfig(): Promise<void> {
    const patch = { bin: ENTRY_BIN, pkg: { assets: ASSET_GLOBS } }
    const manifestPath = join(this.staging, 'package.json')
    if (this.cli.dryRun) {
      console.log('build-exe-for-desktop: [dry-run] patch ' + manifestPath + ' with ' + JSON.stringify(patch))
      return
    }
    if (!existsSync(manifestPath)) {
      throw new Error('build-exe-for-desktop: ' + manifestPath + ' missing — pnpm deploy did not produce a staged package.')
    }
    if (!existsSync(join(this.staging, ENTRY_BIN))) {
      throw new Error('build-exe-for-desktop: ' + join(this.staging, ENTRY_BIN) + ' missing — run without --skip-build so lib/ artifacts exist.')
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>
    await writeFile(manifestPath, JSON.stringify({ ...manifest, ...patch }, null, 2) + '\n')
    console.log('build-exe-for-desktop: injected pkg config into ' + manifestPath)
  }

  /** Package one target; SEA mode accepts one target per invocation. */
  async pack(target: Target): Promise<string> {
    const product = join(this.outDir, OUTPUT_BASENAME + '-' + target.platform + '-' + target.arch)
    if (!this.cli.dryRun) await mkdir(this.outDir, { recursive: true })
    const pkgBin = process.env['DSH_PKG_BIN']
    const pkgCommand = pkgBin !== undefined && pkgBin !== '' ? pkgBin : pnpmBin()
    const pkgArgs = pkgBin !== undefined && pkgBin !== ''
      ? [this.staging, '--sea', '--targets', target.spec, '--output', product]
      : [
        '--config.strictDepBuilds=false',
        '--config.confirmModulesPurge=false',
        'dlx',
        PKG_SPEC,
        this.staging,
        '--sea',
        '--targets',
        target.spec,
        '--output',
        product,
      ]
    await this.run('pkg ' + target.spec, pkgCommand, pkgArgs)
    if (!this.cli.dryRun && !existsSync(product)) {
      throw new Error('build-exe-for-desktop: product ' + product + ' is missing after the pkg run; inspect ' + this.outDir + '.')
    }
    if (target.platform !== 'macos') return product
    const spawnHelper = product + '-spawn-helper'
    const source = join(this.staging, 'node_modules', 'node-pty', 'prebuilds', 'darwin-' + target.arch, 'spawn-helper')
    if (this.cli.dryRun) {
      console.log('build-exe-for-desktop: [dry-run] cp ' + source + ' ' + spawnHelper)
    } else {
      await copyFile(source, spawnHelper)
      await chmod(spawnHelper, 0o755)
    }
    return product
  }

  /** Print each product path and, outside dry-run mode, its size. */
  printProducts(products: string[]): void {
    console.log(this.cli.dryRun ? 'build-exe-for-desktop: [dry-run] would produce:' : 'build-exe-for-desktop: products:')
    for (const path of products) {
      if (this.cli.dryRun) {
        console.log('  ' + path)
        continue
      }
      const megabytes = statSync(path).size / (1024 * 1024)
      console.log('  ' + path + '  (' + megabytes.toFixed(1) + ' MB)')
    }
  }
}

async function main(): Promise<void> {
  const cli = BuildCli.parse(process.argv.slice(2))
  const pipeline = new SingleExeBuild(cli)
  console.log('build-exe-for-desktop: targets: ' + cli.targets.map(target => target.spec).join(', '))
  console.log('build-exe-for-desktop: staging: ' + pipeline.staging)
  await pipeline.verifyClosure()
  await pipeline.build()
  await pipeline.deployStaging()
  await pipeline.injectPkgConfig()
  const products: string[] = []
  for (const target of cli.targets) products.push(await pipeline.pack(target))
  pipeline.printProducts(products)
}

await main()
