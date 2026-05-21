# Find References — Algorithm Completeness Investigation

**Status:** Investigation in progress; no fix yet
**Filed against:** `feature/enrichment-offload-investigation` (branch where the bug was unmasked)
**Date:** 2026-05-21

## Symptom

Triggering Find All References on a symbol that has multiple known uses returns only the symbol's declaration. Verified against `dreamhouse-lwc`:

- Cursor on `GeocodingAddress` at `GeocodingService.cls:10:27` (a use site, parameter type in a `for` loop).
- Expected: many results (multiple uses in `GeocodingService.cls`, plus uses in `GeocodingServiceTest.cls`).
- Actual: 1 result, pointing to the declaration on line 53.

## What's verified working

- The references **pipeline** is correct end-to-end (see `references-offload-to-enrichment-pool.md` §0).
- The worker handler runs, queries the data-owner, and returns valid LSP `Location` objects with proper integer ranges.
- `processReferences` returns at least 1 result, so the symbol resolution at the cursor works.

## What's not working

The reverse-reference index that `findReferencesTo` queries appears to contain only one entry per target symbol, when it should contain many.

## Code path (verified by reading the source)

When references runs on an enrichment worker:

1. **`loadSymbolDataForEnrichment(uri, content)`** queries the data-owner via `dataOwner:QuerySymbolSubset`. Data-owner has the file at `public-api` detail level — declarations only, no body references.
2. **`loadDependentsForReferences(uri)`** asks the data-owner for files that reference symbols declared in `uri`. With workspace data freshly ingested, this *should* return at least `GeocodingServiceTest.cls`, but in practice I haven't verified the dependents are being fetched (the response shape is `entries: {}` if `findReferencesTo` on the data-owner side returns 0).
3. **`processReferences(params)`** runs on the worker:
   - **`runPrerequisitesForLspRequestType('references', uri)`** with `executionMode: 'blocking'`, `requiredDetailLevel: 'full'`, `requiresCrossFileResolution: true`. This should:
     - **Enrich** the file to `'full'` via `LayerEnrichmentService.enrichFiles([uri], 'full', 'same-file')` — re-parses the file with body refs.
     - **Resolve cross-file refs** via `ApexSymbolManager.resolveCrossFileReferencesForFile(uri)` — walks the table's references and resolves cross-file targets, populating the reverseIndex with `addReference(source, target, ...)`.
   - **`findReferences(params)`** then resolves the target symbol from the cursor position and calls `getReferenceLocations(symbol)`, which calls `findReferencesTo(symbol)`.

## How `addSymbolTable` populates the reverseIndex

`ApexSymbolManager.addSymbolTable(table, fileUri)` ([ApexSymbolManager.ts:1855](../../packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts#L1855)):

1. Registers the table in `fileToSymbolTable` (`registerSymbolTableForFile`).
2. Clears existing reference state for the file: `symbolRefManager.clearReferenceStateForFile(uri)`.
3. Adds each symbol in the table to the graph (`addSymbol`).
4. **Calls `processSameFileReferencesToGraphEffect`** ([line 1990](../../packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts#L1990)) — walks the table's references and adds same-file edges to `reverseIndex`.
5. Cross-file references are NOT processed here. They require a separate `processSymbolReferencesToGraph` pass triggered by `resolveCrossFileReferencesForFile`.

## Hypotheses (not yet verified)

The trace `[REF-DEBUG] processReferences returned: array length=1` was captured **before** the bootstrap-race fix (`fc9ef4aad`) and the location-format fix (`d64922fb8`) both landed. Re-running the same scenario with both fixes in place may produce different counts. Worth re-testing before deeper investigation.

If counts are still low after re-testing:

### H1: Enrichment doesn't actually run on the worker

The `prerequisiteOrchestrationService` is wired up via `setLayerEnrichmentService`, which auto-creates the orchestrator. But maybe one of:

- **`InFlightRegistry` short-circuits.** A prior request (hover, definition) at the same `documentVersion` may have marked the prereq as "satisfied at full" — `runPrerequisitesForLspRequestType` returns immediately without re-enriching. But then *something* is at full detail and references should still work; this doesn't fully explain the symptom.
- **`isWorkspaceLoaded()` returns false.** When `requirements.requiresWorkspaceLoad && !isWorkspaceLoaded()`, the code logs but doesn't return — so this shouldn't block enrichment.
- **The enrichment throws silently.** `compileLayered` could fail if `apex-stdlib` isn't loaded on the worker, etc. The orchestrator catches and logs but doesn't surface.

### H2: Enrichment runs but on a stale view

The `loadSymbolDataForEnrichment` helper stores the document in worker storage with `version: 0`. The data-owner's actual version is 1. If `LayerEnrichmentService.enrichFiles` reads `document.version` from storage and the cache key uses that version, there might be a version mismatch that causes the enrichment to write to a different cache entry than `findReferences` later reads.

### H3: Cross-file resolution doesn't happen on the worker

`resolveCrossFileReferencesForFile` may need other files' symbol tables to resolve cross-file targets. The worker's symbol manager has only:

- The source file (loaded by `loadSymbolDataForEnrichment`).
- Its dependencies (loaded by the existing Phase-2 code in `loadSymbolDataForEnrichment`).
- Its dependents (loaded by `loadDependentsForReferences`, **if** the data-owner returns non-empty).

If dependents aren't returned (e.g., because the data-owner's `findReferencesTo` returns nothing because *its own* reverseIndex isn't populated for the just-ingested file — circular dependency), the worker can't resolve the dependent files' refs.

### H4: The data-owner's reverseIndex isn't populated either

When the workspace ingests via `WorkspaceBatchIngest` and `WorkspaceBatchCompile`, does the compilation worker's output get processed for cross-file refs? Specifically: does `processSymbolReferencesToGraph` run on the data-owner for each file? If only same-file refs get added on ingest, the data-owner's `findReferencesTo` would return 0 too — and `loadDependentsForReferences` would return empty — and the worker would be stuck with just the source file.

**This is the most likely root cause.** The data-owner stores symbol tables but may not have a path to populate cross-file reverse-edges from the bulk ingest.

## Recommended investigation order

1. **Re-test with current `feature/enrichment-offload-investigation` HEAD.** Both bug fixes (`fc9ef4aad` bootstrap race, `d64922fb8` location format) are in place. Capture a fresh trace.
2. **Add instrumentation to the data-owner.** Log: `findReferencesTo` invocation counts and result counts during `dataOwner:ResolveDependentUris` handling.
3. **Add instrumentation to `ReferencesProcessingService.findReferences`** on the worker. Log: detail level of the target file just before `findReferencesTo` is called; result counts from `findReferencesTo`, `findReferencesFrom`, and `getRelationshipTypeReferences` separately.
4. If H4 is confirmed (data-owner has empty reverseIndex), investigate whether `WorkspaceBatchCompile` should trigger `processSymbolReferencesToGraph` for each compiled file, or whether a separate cross-file-resolution pass should run after batch compilation completes.

## Pre-existing nature

This bug is independent of the worker offload. The same algorithmic gap would manifest if references ran on the coordinator thread, because the `findReferencesTo` algorithm depends on the same reverse-index population logic. The offload work merely made the gap visible by exercising the references path end-to-end with an instrumented pipeline.

## See also

- `docs/design/references-offload-to-enrichment-pool.md` §0 — pipeline status and full implementation summary.
- `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts:1855` — `addSymbolTable` (same-file refs only).
- `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts:2934` — `processSymbolReferencesToGraph` (cross-file refs).
- `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts:2951` — `resolveCrossFileReferencesForFile` (entry point).
- `packages/apex-parser-ast/src/symbols/ApexSymbolRefManager.ts:1839` — `findReferencesTo` (the consumer).
- `packages/lsp-compliant-services/src/services/PrerequisiteOrchestrationService.ts:340-385` — blocking-mode enrichment + cross-file resolution path.
