#!/usr/bin/env node
/**
 * Closed-runtime desktop bin. Bare plugins resolve from the installed runtime
 * closure while relative plugins remain configuration-relative.
 *
 * @module @deepseek-ai/dsh-desktop-runtime/packaged-bin
 */

import { runDesktopRuntime } from './runner.ts'

/* v8 ignore next -- exercised through the packaged runtime acceptance test */
await runDesktopRuntime(import.meta.url)
