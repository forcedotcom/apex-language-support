# Find References: POC branch vs. PR #503 — Findings

**Date:** 2026-06-26
**Author:** Kyle Walker (drafted with Claude assistance)

Comparison of two efforts on `textDocument/references`:

- **POC branch** — `feature/find-references-algorithm-POC` (off an older `main`); design docs `docs/design/find-references-algorithm-completeness.md` and `docs/design/references-offload-to-enrichment-pool.md`.
- **PR #503** — `feature/W-22692429-references-verification` (@W-22692429@), title *"fix(apex-lsp-extension): cross-file find-references through the worker pool"*.

## TL;DR

| | POC branch | PR #503 |
|---|---|---|
| Goal | **Discover & prototype** both (a) the algorithm-completeness fixes and (b) the enrichment-pool offload pipeline, end-to-end | **Verify** cross-file find-references through the worker pool, fixing the remaining *dispatch-layer* defects |
| Touches `ReferencesProcessingService` | Yes — heavy rewrite (+151/−126) | **No** — unchanged from `main` |
| Core data-layer algorithm fixes | Prototyped here first | **Already landed on `main`** (refined) — PR #503 builds on them |
| Primary mechanism | `ReferencesProcessingService` chain-walk + position resolution + URI-field fixes; `drainAllDeferredReferencesSync`; `clearReferenceStateForFile` incoming-edge preservation; block-walk before deferral | 5 worker-pool dispatch fixes in `worker.platform.ts`/`.web.ts` + wire schema `content` field + canonical-URI keying |
| Status | Manually verified vs `dreamhouse-lwc`; pre-commit hook bypassed; aspirational/experimental | Full suite green (4555 passed); adds integration + recipe + Playwright tests |

The headline: **the POC's algorithm-completeness work has since been absorbed into `main`** (via the W-23133640 signature-keyed and W-23133526 eviction lines of work). PR #503 is the *offload-pipeline* capstone — it assumes the corrected data layer and fixes the five things that still broke when the request actually ran on a pool worker.

## What the POC established

The POC unmasked and fixed a *pre-existing algorithm-completeness bug*: Find All References returned only the declaration site, never the use sites. Root cause was missing cross-file edges in `ApexSymbolRefManager.reverseIndex`. POC fixes (see `find-references-algorithm-completeness.md`):

1. **Cross-file edges populated on the data-owner** — `UpdateSymbolSubset` calls `resolveCrossFileReferencesForFile`; `WorkspaceBatchCompile` drains deferred refs post-batch.
2. **Synchronous deferred drain** — `drainAllDeferredReferencesSync` bypasses the priority scheduler (the 5 tasks/sec rate limit caused 30s+ stalls).
3. **Block sources walked to non-block before deferral** — `findContainingNonBlockSymbol`; otherwise `enqueueDeferredReference` silently dropped 118/146 deferrals on dreamhouse Test files.
4. **`clearReferenceStateForFile` stops wiping incoming refs** — re-adding `Foo.cls` was deleting `Bar.cls → Foo.Member` edges on every enrichment write-back.
5. **Position-based resolution for chained TypeReferences** — chain-node walk + `getSymbolAtPosition` fallback, in `ReferencesProcessingService.findReferences`.
6. **URI field-name fix** — read `.fileUri` not `.filePath` in result extraction.

The POC also built the *offload pipeline* (`references-offload-to-enrichment-pool.md`, M1–M11): new wire schemas (`CoordinatorEnsureWorkspaceLoaded`, `DataOwnerResolveDependentUris`), `IWorkspaceLoadCoordinator` injection (Local/Remote impls), `loadDependentsForReferences`, the beefed-up `DispatchReferences` handler, and the `references: 'enrichmentPool'` routing flip.

The POC's own docs flagged it as not merge-ready: pre-commit hook bypassed (`--no-verify`) on commits 2–14, `RemoteWorkspaceLoadCoordinator` inlined into both worker platforms, and full cross-file E2E through the pool *deferred*.

## What PR #503 actually changes

PR #503 does **not** re-litigate the algorithm — `ReferencesProcessingService.ts` is byte-for-byte `main`. The corrected data layer (deferred drain, incoming-edge preservation, block-walk) is already on `main`. Instead, the PR fixes the five compounding defects that made cross-file find-references dispatched to the **stateless pool worker** return `[]`:

1. **Content not threaded** — added `content: Schema.optional(Schema.String)` to the `DispatchReferences` wire schema (`workerWireSchemas.ts`), populated it in `WorkerCoordinator.buildLspRequestMessage` via `getDocumentContent?.(uri)`, and consumed it in the handler. Without it the pool worker's storage missed and the service hard-returned `[]`. (Same pattern documentSymbol/hover/completion already used.)
2. **Cursor file at public-api** — `recompileCursorFileAtFullDetail` recompiles the open file from its text with `FullSymbolCollectorListener` (bodies present), so a cursor on an in-body usage resolves. The data-owner serves files at `public-api` (bodies stripped).
3. **Wrong dependents loaded** — `declaringFileForCursorSymbol` resolves the cursor symbol's *declaring* file and loads *its* dependents. The old code loaded dependents of the cursor file, but find-references needs callers of the target symbol's declaring file.
4. **URI-scheme mismatch** — the `ResolveDepUris` data-owner handler now keys wire entries by the table's canonical `getFileUri()` (`file:///test/X.cls`) instead of the schemeless lookup URI (`/test/X.cls`), so ingestion matches the references' targets and cross-file edges bind.
5. **Resolved types skipped** — `loadReferencedTypesForFile` loads referenced *type tables* regardless of resolution state. The Phase-2 prefetch in `loadSymbolDataForEnrichment` only fetched *unresolved* types (fine for hover/definition's on-demand resolution, fatal for find-references which needs the target type's table present to enumerate its references). Also un-gated the post-prefetch `resolveCrossFileReferencesForFile` from the ingest count.

Both worker platforms (`worker.platform.ts` and `worker.platform.web.ts`) get the new helpers and the rebuilt handler sequence:

```
loadSymbolDataForEnrichment(uri, content)
recompileCursorFileAtFullDetail(uri, content)
loadReferencedTypesForFile(uri)
declaringFileForCursorSymbol(uri, position) → targetUri
loadDependentsForReferences(targetUri ?? uri)
recompileCursorFileAtFullDetail(uri, content)   // re-assert: deps load may have re-ingested cursor at public-api
processReferences(...)
writeBackEnrichedSymbols(...)
```

## Where the two diverge on shared files

The POC and PR #503 both edited `ApexSymbolManager.ts` and `ApexSymbolRefManager.ts`, but on **different axes** (and PR #503's edits sit on top of the already-merged POC work):

- **POC's `ApexSymbolManager`/`RefManager` edits** — deferred-drain machinery and block-walk. These (refined) are on `main` now: `drainAllDeferredReferencesSync` returns a count, `clearReferenceStateForFile` preserves incoming edges, and `removeIncomingReferencesToSymbols` is reserved for true deletion / stale-ID eviction (W-23133526).
- **PR #503's `ApexSymbolManager`/`RefManager` edits** — *overload/arity separation* (F11-2, W-23133640): `argumentCount` added to `ReferenceEdge`/`ReferenceResult`/`RefStoreEntry`, `separateOverloadReferences` filters a method's results by call-site arity, and `buildReferencesToCacheKey` keys the `findReferencesTo` cache by `name@file:arity` instead of bare `name` (which collapsed overloads and same-named members across files).

These are orthogonal: the POC fixed *whether cross-file edges exist at all*; PR #503 (continuing W-23133640) fixes *precision of which references a given overload returns*.

## Tests

- **POC:** wire round-trip, `LocalWorkspaceLoadCoordinator`, `RemoteWorkspaceLoadCoordinator`, 2 service coordinator-injection tests, `ResolveDependentUris` integration. Full cross-file E2E deferred.
- **PR #503:**
  - `ReferencesThroughWorkerTopology.node.test.ts` — cross-file location counts through the live worker topology (the named 6.13 deliverable).
  - `referenceEnrichmentRecipe.node.test.ts` — handler recipe end-to-end at service level; proves the declaring-file step is load-bearing.
  - `apex-find-references.spec.ts` — Playwright E2E (intra-file, cross-file, no-results, responsiveness) + `findReferences()`/`closePeek()` on `ApexEditorPage`.
  - `overloadSeparation.test.ts`, `signatureKeying.test.ts`, qualifier-scoped resolution, `ReferencesProcessingService.test.ts` locals-only regression.

## Deferred in PR #503

- **Telemetry** on the references path — blocked on Jorje-parity #04 (W-22629622); tracked in W-22692429.
- **Parity-table doc flip** — external Quip/GUS artifact, handled there.

## Bottom line

The POC was the *investigation + prototype*: it proved out both the algorithm-completeness fixes and the offload pipeline against `dreamhouse-lwc`, but as one large experimental branch with the hook bypassed. The work then split into mergeable lines that landed on `main` (signature-keying W-23133640, eviction W-23133526, deferred-drain/edge-preservation). **PR #503 is the disciplined capstone**: it leaves the now-correct data layer and `ReferencesProcessingService` alone, fixes only the five worker-pool dispatch defects that the POC's offload pipeline had papered over, and lands the verification tests (including the live-topology and Playwright coverage the POC explicitly deferred).
