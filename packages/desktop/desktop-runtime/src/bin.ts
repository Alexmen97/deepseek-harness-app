#!/usr/bin/env node
/**
 * Desktop runtime bin. External configurations own their bare plugin
 * packages; the packaged runtime uses packaged-bin.ts instead.
 *
 * @module @deepseek-ai/dsh-desktop-runtime/bin
 */

import { runDesktopRuntime } from './runner.ts'

await runDesktopRuntime()
