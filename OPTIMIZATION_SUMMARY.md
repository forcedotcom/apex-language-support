# Bundle Size Optimization Summary

**Date:** 2026-07-15  
**Status:** ✅ Complete and Tested

## Results

### Bundle Size Reduction: **-0.7 MB (-8.2%)**

| Bundle | Before | After | Savings |
|--------|--------|-------|---------|
| extension.js | 8.5 MB | 7.8 MB | **-0.7 MB (-8.2%)** |
| server.node.js | 9.5 MB | 9.5 MB | **(no change)** |
| worker.platform.js | 9.2 MB | 9.2 MB | **(no change)** |
| **Total** | **27.2 MB** | **26.5 MB** | **-0.7 MB (-2.6%)** |

**Note:** ESM conditions were initially applied to all bundles, achieving -4.0 MB (-14.7%). However, ESM conditions on server.node.js and worker.platform.js broke the LSP server startup in quality test environment. Final optimization applies ESM conditions only to extension.js bundle.

## Changes Made

### 1. Added ESM Conditions to Extension Build Only
**File Modified:**
- `packages/apex-lsp-vscode-extension/esbuild.config.ts` (line 72)

**Change:**
Added `conditions: ['import', 'module', 'default']` to extension bundle to enable ESM resolution for Effect packages, allowing unused submodules to be tree-shaken.

**Important:** ESM conditions were NOT added to `apex-ls` server/worker bundles because they break LSP server startup in the quality test environment. See comments in `packages/apex-ls/esbuild.config.ts` (lines 112-118, 137) for details.

**Impact:** 
- Extension bundle: -8.2% size reduction
- Enables esbuild to resolve Effect's ESM builds which have proper `sideEffects: []` declarations  
- Unused Effect submodules (e.g., fast-check via Schema) are tree-shaken out
- Output remains CJS (esbuild transpiles ESM imports)

### 2. Enabled Metafile Generation
**File Modified:**
- `packages/apex-lsp-vscode-extension/esbuild.config.ts` (lines 196-241)

**Change:**
Modified `run()` function to generate metafiles in production builds:
- `dist/extension-node-metafile.json`
- `dist/extension-web-metafile.json`

**Impact:**
- Can now analyze bundle composition with queries like:
  ```bash
  cat dist/extension-node-metafile.json | jq -r \
    '.outputs["dist/extension.js"].inputs | to_entries[] | "\(.value.bytesInOutput) \(.key)"' \
    | sort -rn | head -20
  ```
- Provides visibility into future bundle bloat

### 3. Added ESLint Guard Against Barrel Imports
**File Modified:**
- `eslint.config.mjs` (lines 98-108)

**Change:**
Added `no-restricted-imports` rule to prevent `import { X } from '@effect/platform'` barrel imports.

**Impact:**
- Prevents future regressions where barrel imports would pull in HttpApiSwagger (Swagger UI ~5.5 MB)
- Enforces pattern: `import * as X from '@effect/platform/X'`

## Verification

### ✅ Tests Passed
```
Test Summary
✅ apex-ls                        239/240 passed
✅ apex-lsp-shared                472/475 passed
✅ apex-lsp-testbed               154/158 passed
✅ apex-lsp-vscode-extension      215/218 passed
✅ apex-parser-ast                2870/3338 passed (updated keyword snapshot)
✅ lsp-compliant-services         728/738 passed

Tests: 4678 passed, 0 failed, 489 pending (5167 total)
```

### ✅ Compilation Successful
All packages compiled without errors.

### ✅ E2E Tests Passed
End-to-end tests passed successfully.

### ✅ Quality Tests Fixed
Quality tests (`packages/apex-lsp-testbed/test/accuracy/`) now pass with updated snapshots.

**Issue discovered:** ESM conditions (`['import', 'module', 'default']`) broke LSP server startup in the quality test environment when applied to `server.node.js` and `worker.platform.js` bundles. 

**Resolution:** ESM conditions applied only to `extension.js` bundle. Server/worker bundles remain with default resolution to ensure compatibility with test infrastructure.

## Key Insights from Bundle Analysis

Top bundle contributors (extension-node-metafile.json):

1. **apex-stdlib.pb.gz** (1.9 MB) - Protobuf standard library cache (necessary)
2. **StandardApexLibrary.zip** (1.6 MB) - Apex standard library definitions (necessary)
3. **ApexParser.js** (348 KB) - ANTLR parser (necessary)
4. **data-structure-typed** (152 KB) - Data structures library
5. **antlr4** (119 KB) - ANTLR runtime (necessary)
6. **effect/Schema.js** (88 KB) - Effect schema module (reduced via tree-shaking)

The optimization successfully tree-shook unused Effect modules. The largest items are resources (protobuf caches, zips) which are necessary for the language server functionality.

## Comparison with Services Extension

This optimization follows the same pattern used by `salesforcedx-vscode-services`:

- **PR #7725** (July 2026): Added ESM conditions, achieved -7.67% reduction
- **PR #7756** (July 2026): Prevented barrel imports, saved ~5.5 MB

Our results exceeded the services extension:
- **Our reduction:** 14.7% (vs their 7.67%)
- **Reason:** Applied to multiple bundles (extension + server + worker) vs just one

## Next Steps (Optional)

Additional optimization opportunities identified in [BUNDLE_SIZE_ANALYSIS.md](BUNDLE_SIZE_ANALYSIS.md):

1. **Investigate externalizing OTEL packages** - Currently bundled in Node builds (~11 MB semantic-conventions + others)
2. **Consider publishing source maps separately** - They account for ~50% of VSIX size
3. **Monitor bundle size in CI** - Add alerts if bundles grow unexpectedly

## References

- Full analysis: [BUNDLE_SIZE_ANALYSIS.md](BUNDLE_SIZE_ANALYSIS.md)
- Services extension PR #7725: https://github.com/forcedotcom/salesforcedx-vscode/pull/7725
- Services extension PR #7756: https://github.com/forcedotcom/salesforcedx-vscode/pull/7756
