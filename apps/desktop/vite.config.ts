import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const src = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url))

/**
 * Desktop frontend build: the same Vite-over-source approach as apps/web.
 * Every client plugin is statically bundled into the app (no plugin fetching);
 * the desktop boot entry registers the module table through the shell's
 * loadBundle seam.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ['../../tsconfig.base.json'] })],
  root: src('.'),
  clearScreen: false,
  build: {
    sourcemap: false,
    outDir: src('./dist'),
    emptyOutDir: true,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^react$/, replacement: src('./node_modules/react/index.js') },
      { find: /^react\/jsx-runtime$/, replacement: src('./node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: src('./node_modules/react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: src('./node_modules/react-dom/index.js') },
      { find: /^node:module$/, replacement: src('./src/node-module-stub.ts') },
      { find: /^@deepseek-ai\/dsh-client-web$/, replacement: src('../../packages/client/web/src/boot.tsx') },
      { find: /^@deepseek-ai\/dsh-client-web-react$/, replacement: src('../../packages/client/web-react/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-modules\/client$/, replacement: src('../../packages/client/modules/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-desktop-client$/, replacement: src('../../packages/desktop/desktop-client/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-slots$/, replacement: src('../../packages/client/ui-slots/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-primitives$/, replacement: src('../../packages/client/ui-primitives/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-attachment$/, replacement: src('../../packages/client/ui-attachment/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-schema-form$/, replacement: src('../../packages/client/schema-form/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-runtime\/client$/, replacement: src('../../packages/client/runtime/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-api-remotes\/client$/, replacement: src('../../packages/api/remotes/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-api-gateway\/client$/, replacement: src('../../packages/api/gateway/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-typert-registry\/client$/, replacement: src('../../packages/typert/registry/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-cordis-client-runner\/client$/, replacement: src('../../packages/extensions/cordis-client-runner/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-locale\/client$/, replacement: src('../../packages/client/locale/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-theme\/client$/, replacement: src('../../packages/client/ui-theme/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-layout\/client$/, replacement: src('../../packages/client/ui-layout/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-sidebar\/client$/, replacement: src('../../packages/client/ui-sidebar/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-settings\/client$/, replacement: src('../../packages/client/ui-settings/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-settings-general\/client$/, replacement: src('../../packages/client/ui-settings-general/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-settings-models\/client$/, replacement: src('../../packages/client/ui-settings-models/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-conversation\/client$/, replacement: src('../../packages/client/ui-conversation/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-tool\/client$/, replacement: src('../../packages/client/ui-tool/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-trajectory\/client$/, replacement: src('../../packages/client/ui-trajectory/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-workspace\/client$/, replacement: src('../../packages/client/ui-workspace/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-input-trigger\/client$/, replacement: src('../../packages/client/ui-input-trigger/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-commands\/client$/, replacement: src('../../packages/client/ui-commands/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-skill\/client$/, replacement: src('../../packages/client/ui-skill/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-subagent\/client$/, replacement: src('../../packages/client/ui-subagent/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-model-selection\/client$/, replacement: src('../../packages/client/ui-model-selection/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-permission-presets\/client$/, replacement: src('../../packages/client/ui-permission-presets/src/client/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-user-questions\/client$/, replacement: src('../../packages/client/ui-user-questions/src/client/index.ts') },
    ],
  },
  define: {
    'process.versions.node': '"0.0.0"',
    'process.execArgv': '[]',
    'process.env.CORDIS_SHARED': 'undefined',
  },
})
