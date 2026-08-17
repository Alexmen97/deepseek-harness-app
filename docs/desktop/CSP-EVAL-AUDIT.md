# Desktop CSP eval audit

Reference for why the production WebView CSP carries script-src 'self'
'unsafe-eval', what each dynamic-evaluation site does, and what keeps them
inert in the desktop product. Classification: TEMPORARILY_REQUIRED.

## The three sites

The built desktop bundle contains exactly three dynamic-evaluation sites.
Every other script in the bundle is static code from the repository.

### 1. Vendored Cordis loader: !!js config expressions

vendor/loader/src/config/utils.ts builds the evaluator at module load:

new Function('ctx', 'expr', "with (ctx) { return eval(expr) }")

The include dialect parses YAML !!js scalars into { __jsExpr } nodes;
Entry.evaluate and interpolate run them when an entry computes its disabled
state or its config. The expression data is entry-list YAML from bundled
cordis manifests and user profile patches.

Desktop status: the static boot manifest carries no !!js values, so no
expression is ever evaluated. The factory still runs at import time, which
is what makes unsafe-eval unconditionally required while the loader is
bundled. Removing the site would fork the vendored loader; the desktop
instead asserts at boot that the manifest contains no expression node and
refuses to start if one appears (apps/desktop/src/boot-guard.ts).

### 2. Cordis client runner: dynamic package browser halves

packages/extensions/cordis-client-runner/src/client/evaluator.ts evaluates a
dynamic package's browser half with new Function when the user starts a
dynamic Cordis plugin run. The source arrives from the host process that
accepted and prechecked the definition; this path is arbitrary JavaScript
execution by design, scoped to that feature.

Desktop status: the desktop runtime composition has no cordis-host-runner
row, so remote.dynamicCordisRunner has nothing to serve and the evaluator is
unreachable. The plugin/runner management surface is not part of M2.

### 3. Schemastery callback schemas

vendor/schemastery/src/index.ts compiles callback schemas with
new Function('return ' + schema.callback) at schema construction. The
callback text is the TypeScript function source of a developer-authored
schema, never user or model content.

## What reaches the execution path

No remote content, user content, model output, or tool output reaches any
of the three sites in the desktop app. The boot manifest is bundled; dynamic
package definitions are absent by composition; schema callbacks are
compile-time source. The CSP audit therefore assumes hostile text can exist
in rendered conversation content without granting it an execution path.

## Why TEMPORARILY_REQUIRED

Removing unsafe-eval requires forking the vendored loader (its evaluator
factory runs at import time) or forking the client runner; neither is an M2
change. The isolation boundary is: self-origin scripts only, a manifest
without expression nodes enforced at boot, no dynamic-package host half in
the runtime composition, and navigation locked to the app origin. A
source-scan regression test pins the exact set of audited sites and fails
when a new one appears.

Revisit when the vendored loader moves the evaluator behind a lazy call, or
when upstream offers a precompile path for !!js expressions.
