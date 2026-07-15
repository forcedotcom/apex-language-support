# Bundle Size Investigation - Apex Language Support Extension

## Current State

### VSIX Sizes
- **Desktop VSIX**: 50 MB (`apex-language-server-extension-0.9.20.vsix`)
- **Web VSIX**: 16 MB (`apex-language-server-extension-web-0.9.20.vsix`)

### Bundled Files (in Desktop VSIX)
Total dist size: **215.5 MB** (24 files, average 9.4 MB per file)

Key bundle sizes:
- `extension.js`: 8.5 MB (desktop entry point)
- `extension.web.js`: 7.8 MB (web entry point)
- `server.node.js`: 9.5 MB (LSP server - desktop)
- `server.web.js`: 14 MB (LSP server - web)
- `worker.platform.js`: 9.2 MB (worker - desktop)
- `worker.platform.web.js`: 14 MB (worker - web)

Plus ~113 MB of source maps.

### Comparison with Services Extension

The `salesforcedx-vscode-services` extension recently implemented several bundle size optimizations:

1. **PR #7756** (July 2026): Deep-import @effect/platform to drop Swagger UI
   - Problem: Barrel import `import { FetchHttpClient } from '@effect/platform'` bundled HttpApiSwagger (Swagger UI)
   - Impact: Added ~5.5MB per bundle
   - Solution: Changed to `import * as FetchHttpClient from '@effect/platform/FetchHttpClient'`
   - Result: ~42% bundle size reduction, eliminated ClamAV false positive

2. **PR #7725** (July 2026): Resolve effect ESM to shrink bundle
   - Added `conditions: ['import', 'module', 'default']` to Node build config
   - Enabled tree-shaking of unused Effect submodules (e.g., fast-check via Schema)
   - Result: node dist/index.js: 14.4MB → 13.3MB (-1.1MB, -7.67%)

## Findings

### ✅ Already Optimized
1. **Deep imports pattern**: The project already uses deep imports for `@effect/platform`:
   ```typescript
   import * as WorkerRunner from '@effect/platform/WorkerRunner';
   import * as Worker from '@effect/platform/Worker';
   ```

2. **Browser build has ESM conditions**: Web build already configured with:
   ```typescript
   conditions: ['browser', 'import', 'module', 'default']
   ```

### ❌ Missing Optimizations

1. **Node build lacks ESM conditions**
   - Current: Node build uses default CJS resolution
   - Issue: Cannot tree-shake unused Effect submodules
   - Location: `packages/apex-lsp-vscode-extension/esbuild.config.ts` line 60-72
   
2. **OTEL packages bundled in Node build**
   - Current: OTEL packages are bundled into desktop bundles
   - Size: `@opentelemetry/semantic-conventions` (11MB), others (2-3MB each)
   - The config comment says "OTEL packages are bundled (they're Node-compatible)"
   - However, externalizing them could reduce bundle size if they're already available

3. **No bundle analysis tooling**
   - The esbuild config doesn't generate metafiles
   - Services extension writes metafiles: `dist/node-metafile.json`, `dist/browser-metafile.json`

## Recommendations

### High Impact

#### 1. Add ESM Conditions to Node Build (Expected: -7-10% per bundle)
Apply the same optimization from services extension PR #7725:

```typescript
// In packages/apex-lsp-vscode-extension/esbuild.config.ts
const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    sourcemap: true,
    external: ['vscode', 'vm', 'net', 'worker_threads'],
    // ADD THIS LINE:
    conditions: ['import', 'module', 'default'],
    define: { __APEX_LS_TARGET__: '"desktop"' },
    // ... rest of config
  },
```

**Expected impact**: ~7-10% reduction in Node bundles (extension.js, server.node.js, worker.platform.js)
- Based on services extension seeing -7.67% reduction
- Could reduce ~2.7MB across the three Node bundles

#### 2. Enable Bundle Metafile Generation
Add metafile output to identify largest dependencies:

```typescript
// In packages/apex-lsp-vscode-extension/esbuild.config.ts
const nodeBuild = await build({
  ...nodeConfig,
  metafile: true  // ADD THIS
});

const browserBuild = await build({
  ...browserConfig,
  metafile: true  // ADD THIS
});

// After builds, write metafiles
await writeFile('dist/node-metafile.json', JSON.stringify(nodeBuild.metafile, null, 2));
await writeFile('dist/browser-metafile.json', JSON.stringify(browserBuild.metafile, null, 2));
```

This enables analyzing exactly what's being bundled and how much each package contributes.

### Medium Impact

#### 3. Add ESLint Rule to Prevent Barrel Imports
Add the same guard as services extension to prevent future regressions:

```typescript
// In eslint.config.mjs or equivalent
'no-restricted-imports': [
  'error',
  {
    paths: [
      {
        name: '@effect/platform',
        message:
          'Import from a submodule (e.g. @effect/platform/FetchHttpClient) instead of the barrel. The barrel pulls in HttpApiSwagger (Swagger UI), which esbuild cannot tree-shake — it bloats bundles ~5.5MB. See services extension PR #7756.'
      }
    ]
  }
]
```

#### 4. Consider Externalizing OTEL Packages (Investigate first)
The current config externalizes OTEL for web but bundles for Node. Investigate whether:
- OTEL packages are large enough to warrant externalizing
- They're stable enough across versions
- Desktop can resolve them from node_modules at runtime

If yes, add to Node build external list:
```typescript
external: [
  'vscode', 
  'vm', 
  'net', 
  'worker_threads',
  '@opentelemetry/api',
  '@opentelemetry/core',
  '@opentelemetry/sdk-trace-base',
  // ... other OTEL packages if beneficial
],
```

### Low Impact (Documentation)

#### 5. Document Bundle Size Best Practices
Create or update documentation with:
- How to analyze bundle size using metafiles
- Effect import patterns (deep imports vs barrel)
- ESM conditions and tree-shaking
- Regular bundle size monitoring in CI

## Action Plan

1. ✅ **Immediate** (Low risk, high impact):
   - Add `conditions: ['import', 'module', 'default']` to Node build
   - Add metafile generation
   - Rebuild and measure impact

2. **Short-term** (Low risk, prevents regressions):
   - Add ESLint rule for @effect/platform barrel imports
   - Document bundle size best practices

3. **Investigate** (Medium effort):
   - Analyze metafiles to identify other large dependencies
   - Evaluate externalizing OTEL packages
   - Check if source maps can be published separately (they're 50% of VSIX size)

## Results (Implemented 2026-07-15)

### Bundle Size Reduction

After implementing ESM conditions on Node builds:

| Bundle | Before | After | Savings |
|--------|--------|-------|---------|
| extension.js | 8.5 MB | 7.8 MB | **-0.7 MB (-8.2%)** |
| server.node.js | 9.5 MB | 7.8 MB | **-1.7 MB (-17.9%)** |
| worker.platform.js | 9.2 MB | 7.6 MB | **-1.6 MB (-17.4%)** |
| **Total** | **27.2 MB** | **23.2 MB** | **-4.0 MB (-14.7%)** |

### What Was Changed

1. ✅ **Added ESM conditions to Node builds**
   - `apex-lsp-vscode-extension/esbuild.config.ts`: Added `conditions: ['import', 'module', 'default']` to Node build
   - `apex-ls/esbuild.config.ts`: Added `['import', 'module']` to both server.node and worker.platform builds

2. ✅ **Enabled metafile generation**
   - Modified extension's build script to write `dist/extension-node-metafile.json` and `dist/extension-web-metafile.json`
   - Can now analyze bundle composition with `jq` queries

3. ✅ **Added ESLint guard against barrel imports**
   - Added `no-restricted-imports` rule for `@effect/platform` in `eslint.config.mjs`

### Bundle Composition Analysis (Top Dependencies)

From `extension-node-metafile.json`, largest contributors:

1. `apex-stdlib.pb.gz` (1.9 MB) - Protobuf standard library cache
2. `StandardApexLibrary.zip` (1.6 MB) - Apex standard library definitions
3. `ApexParser.js` (348 KB) - ANTLR parser
4. `data-structure-typed` (152 KB) - Data structures library
5. `antlr4` (119 KB) - ANTLR runtime
6. `effect/Schema.js` (88 KB) - Effect schema module

The largest items are resources (protobuf caches and zips), which are necessary. The optimization successfully tree-shook unused Effect modules.

### Impact on VSIX Size

Desktop VSIX should reduce by ~4 MB (excluding source maps which weren't rebuilt).

## Expected Results

~~Conservative estimate after implementing recommendations #1 and #2:~~
~~- Desktop bundles: 2-3 MB reduction (7-10% of 27.6 MB total JS)~~
~~- Better visibility into future bundle bloat via metafiles~~
~~- Prevention of Swagger UI regression via ESLint~~

**Actual results exceeded estimates:**
- Achieved **4.0 MB reduction (14.7%)** vs estimated 2-3 MB (7-10%)
- server.node and worker.platform saw **17-18% reduction** (better than extension.js's 8%)
- Metafiles now provide bundle composition visibility
- ESLint rule prevents future regressions

## References

- Services extension PR #7756: https://github.com/forcedotcom/salesforcedx-vscode/pull/7756
- Services extension PR #7725: https://github.com/forcedotcom/salesforcedx-vscode/pull/7725
- Services extension bundling configs: `~/git/vse/scripts/bundling/{node,web}.mjs`
- Services extension esbuild config: `~/git/vse/packages/salesforcedx-vscode-services/esbuild.config.mjs`
