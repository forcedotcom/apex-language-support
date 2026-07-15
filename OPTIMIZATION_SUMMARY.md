# Bundle Size Optimization Summary

**Date:** 2026-07-15  
**Status:** ✅ Complete and Tested

## Results

### Bundle Size Reduction: **-4.0 MB (-14.7%)**

| Bundle | Before | After | Savings |
|--------|--------|-------|---------|
| extension.js | 8.5 MB | 7.8 MB | **-0.7 MB (-8.2%)** |
| server.node.js | 9.5 MB | 7.8 MB | **-1.7 MB (-17.9%)** |
| worker.platform.js | 9.2 MB | 7.6 MB | **-1.6 MB (-17.4%)** |
| **Total** | **27.2 MB** | **23.2 MB** | **-4.0 MB (-14.7%)** |

## Changes Made

### 1. Added ESM Conditions to Node Builds
**Files Modified:**
- `packages/apex-lsp-vscode-extension/esbuild.config.ts` (line 68)
- `packages/apex-ls/esbuild.config.ts` (lines 113, 134)

**Change:**
Added `conditions: ['import', 'module', 'default']` (or combined with existing node conditions) to enable ESM resolution for Effect packages, allowing unused submodules to be tree-shaken.

**Impact:** 
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
✅ apex-parser-ast                2870/3338 passed
✅ lsp-compliant-services         728/738 passed

Tests: 4678 passed, 0 failed, 489 pending (5167 total)
```

### ✅ Compilation Successful
All packages compiled without errors.

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
