# Find References — Algorithm Completeness Investigation

**Status:** Resolved (2026-05-21)
**Filed against:** `feature/enrichment-offload-investigation` (where the bug was unmasked)
**Resolution branch:** `feature/find-references-algorithm-completeness`

## Symptom

Triggering Find All References on a symbol with multiple known uses returned only the symbol's declaration. Verified against `dreamhouse-lwc`:

- Cursor on `GeocodingAddress` at `GeocodingService.cls:10:27` (a use site, parameter type in a `for` loop).
- Expected: many results (multiple uses in `GeocodingService.cls`, plus uses in `GeocodingServiceTest.cls`).
- Actual: 1 result (the declaration).

## Root cause

H4 was correct. The data-owner's reverse-reference index (`reverseIndex` inside `ApexSymbolRefManager`) was missing cross-file edges because:

1. `addSymbolTable` only processes **same-file** references (via `processSameFileReferencesToGraphEffect`). It does not call `processSymbolReferencesToGraph`.
2. `WorkspaceBatchCompile` was triggering `addSymbolTable` for each file but never invoking the cross-file resolution pass on the data-owner.
3. Even when cross-file references were enqueued as deferred (because their target file hadn't been ingested yet), nothing drained the deferred map after the batch finished. Files added later never got their incoming-reference edges populated.
4. Two compounding bugs made the picture worse: a clear-state path was wiping incoming refs whenever a file was re-added, and block-symbol sources were being silently dropped from the deferral queue.

## Fixes shipped

All on `feature/find-references-algorithm-completeness`:

### Cross-file edges populated on the data-owner

- `dataOwner:UpdateSymbolSubset` now calls `resolveCrossFileReferencesForFile(uri)` after `addSymbolTable` ([worker.platform.ts](../../packages/apex-ls/src/worker.platform.ts) — search for `UpdateSymbolSubset`). Without this, the per-file write-back from compilation workers populates symbols but never adds the cross-file edges those symbols need.
- `dataOwner:DrainDeferredReferences` is invoked at the end of `WorkspaceBatchCompile` (both `worker.platform.ts` and `worker.platform.web.ts`). The drain runs synchronously via `drainAllDeferredReferencesSync` — for `dreamhouse-lwc`-scale workspaces it completes in <500ms even with hundreds of queued deferrals, so it's safe inside `dataOwnerWrite`.

### Synchronous drain (no LSP timeouts)

- `ApexSymbolRefManager.drainAllDeferredReferencesSync` walks the deferred map in-place rather than going through the priority scheduler. The async `drainAllDeferredReferencesEffect` wrapper exists for callers in Effect-genned code.
- 137 cross-file refs resolved in <1s on the test workspace.

### Block sources walked to non-block before deferral

- In `processSymbolReferenceToGraphEffect`, when the source symbol is a synthetic block (`block_LL_CC` from inside a method body), we walk up via `findContainingNonBlockSymbol` before calling `enqueueDeferredReference`. Otherwise `enqueueDeferredReference` would silently drop the deferral when the block's `parentId` chain didn't reach a method/class. For dreamhouse-lwc Test files, this had been dropping 118/146 deferrals — every cross-file ref inside a test method body.

### Stop wiping incoming refs in `clearReferenceStateForFile`

- `ApexSymbolRefManager.clearReferenceStateForFile(fileUri)` was clearing **all** edges adjacent to symbols in the file. Re-adding `Foo.cls` to the graph (which happens on every enrichment write-back) deleted incoming edges from `Bar.cls` → `Foo.Member`. We now only clear outgoing edges from the file, leaving incoming intact.

### Position-based resolution for chained TypeReferences

- `findReferences` in `ReferencesProcessingService` previously passed `references[0].name` directly to `resolveSymbol`. For a chained reference like `GeocodingService.GeocodingAddress`, the `name` is the qualified string but no symbol is stored under that exact key, so `findSymbolByName` returned 0 candidates. Two fixes:
  1. Walk the reference's `chainNodes` first to find the node containing the cursor, falling back to the leaf (rightmost identifier). The simple identifier is what gets fed to resolution and traces.
  2. Use `getSymbolAtPosition` first (it understands chained refs), falling back to context-aware `resolveSymbol`. For dotted names that still fail, retry with the last segment.

### URI field name mismatch in result extraction

- `getReferenceFileUri` and `getSymbolFileUri` in `ReferencesProcessingService` were reading `.filePath`, but `ReferenceResult` and `ApexSymbol` expose `.fileUri`. Every cross-file reference was being silently dropped to a null URI. Fixed by checking `fileUri` first, with `filePath` as a defensive fallback for any wire-shape variants.

## Verification

Manual verification against `dreamhouse-lwc` after all fixes shipped:

| Test position | Result |
| --- | --- |
| `GeocodingAddress` use site (chained, in test file) | 4 locations |
| `Coordinates` (inner class, multiple uses) | 9 locations |
| Outer `GeocodingService` reference | 132 locations |
| Whitespace / column outside any identifier | EXIT-NO-TYPEREF (no spurious match) |

`findReferencesTo` on the data-owner now returns non-empty results for symbols with cross-file callers, and `ResolveDependentUris` returns the expected dependent file URIs.

## Known limitations (out of scope for this fix)

- **Cross-worker symbol queries.** When an enrichmentSearch worker resolves a qualified TypeReference in a file it has loaded, the worker's local `nameIndex` may not contain inner classes from another file. The chain-leaf walk fixes the same-file case (which is the common case); cross-worker symbol-name lookup requires a coordinator-mediated `QuerySymbolByName` request that isn't implemented today. Tracked separately.

## See also

- `docs/design/references-offload-to-enrichment-pool.md` — pipeline status and full implementation summary.
- [packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts](../../packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts) — `addSymbolTable` (same-file refs), `processSymbolReferencesToGraph` (cross-file refs), `resolveCrossFileReferencesForFile` (entry point).
- [packages/apex-parser-ast/src/symbols/ApexSymbolRefManager.ts](../../packages/apex-parser-ast/src/symbols/ApexSymbolRefManager.ts) — `findReferencesTo`, `clearReferenceStateForFile`, `drainAllDeferredReferencesSync`, `enqueueDeferredReference`.
- [packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts](../../packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts) — `findReferences` (chain-node walk + position-based resolution).
- [packages/apex-ls/src/worker.platform.ts](../../packages/apex-ls/src/worker.platform.ts) — `dataOwner:UpdateSymbolSubset` (now triggers cross-file resolution), `WorkspaceBatchCompile` (post-batch drain).
