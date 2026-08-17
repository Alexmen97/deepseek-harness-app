import { defineConfig } from 'tsdown'

/**
 * The desktop runtime ships six entries, each as a SEPARATE single-entry
 * bundle: a multi-entry build would emit a hash-named shared chunk that the
 * exact files whitelist cannot publish and pkg's asset globs would miss in
 * the single-executable snapshot.
 */
export default defineConfig([
  { entry: { index: 'lib/types/index.js' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  { entry: { invariant: 'lib/types/invariant.js' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  { entry: { info: 'lib/types/info.js' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  { entry: { bin: 'lib/types/bin.js' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  { entry: { 'packaged-bin': 'lib/types/packaged-bin.js' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
  { entry: { runner: 'lib/types/runner.js' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false },
])
