# Find References — Offload to Enrichment Pool

**Status:** Implemented and verified on `feature/enrichment-offload-investigation`
**Branch:** `feature/enrichment-offload-investigation` (rename to `feature/W-XXXXXXXX` when work item assigned)
**Author:** Kyle Walker (drafted with Claude assistance)
**Date:** 2026-05-20 (last updated 2026-05-21)

## 0. Implementation status

All milestones M1–M11 in §4 are landed. The references offload **pipeline** is verified end-to-end against the `dreamhouse-lwc` workspace:

- Worker topology bootstraps on demand (`apex.experimental.workers.enabled=true`).
- Workspace ingests via `WorkspaceBatchIngest` → data-owner stores 13 files.
- Compilation worker compiles all files in ~240ms.
- `textDocument/references` requests route to the enrichment pool (`[WorkerDispatch] → enrichmentPool: references`).
- Worker handler queries the data-owner for symbol data, fetches dependents, runs `processReferences`, and returns valid LSP `Location` objects with proper integer line/character ranges.
- LSP client receives well-formed responses; the references panel populates with at least the symbol's declaration site.

### Bugs found and fixed during verification

Three pre-existing bugs were unmasked by exercising the offload pipeline; they were fixed in this branch but they were independent of the offload work:

1. **Bootstrap race (commit `fc9ef4aad`, then `2ff1a018e`).** `apex/sendWorkspaceBatch` arrives ~1s after server startup; the worker batch dispatcher is set ~2s after that. `processStoredBatches` captured the dispatcher at fork time (always null in practice) and unconditionally fell through to coordinator-local processing. The data-owner never received the workspace, so all enrichment-pool requests queried an empty symbol manager. Fix: wait briefly (5s timeout) for the dispatcher before processing.
2. **Malformed Location range (commit `d64922fb8`).** `ReferencesProcessingService.createLocationFromSymbol` and `createLocationFromReference` read `.location.startLine` / `.startColumn` directly. `SymbolLocation` is `{ symbolRange, identifierRange }`, not a flat range — the reads returned `undefined`, math produced `NaN`, JSON serialized as `null`, and the LSP client silently dropped the malformed Location. Fix: read `.location.identifierRange.{startLine,startColumn,endLine,endColumn}`.
3. **Missing `LSPQueueManager.workerDispatcher` consultation (commit `494adfd07`).** `LSPQueueManager.setWorkerDispatcher` stored a reference but `createQueuedItem` never read it; the dispatcher's `dispatch()` method was never invoked. The DISPATCH_ROUTING table was decorative until this commit. Fix: consult the dispatcher before falling through to the local handler.

### Known limitation: algorithm completeness

`processReferences` returns valid Locations through the worker pipeline, **but the result set is incomplete**: clicking Find References on a class symbol typically returns only the declaration site, not its use sites. Verified against `dreamhouse-lwc` `GeocodingService.GeocodingAddress` — which has many uses in the same file and across `GeocodingServiceTest.cls`, but only the declaration appears.

This is a pre-existing algorithm-completeness issue in `ReferencesProcessingService` independent of the offload. Likely contributors:

- The worker's local symbol manager has `public-api` detail level for the file when `findReferencesTo` runs. At that level only top-level declarations are indexed, not the body-level references to them.
- `PrerequisiteOrchestrationService.runPrerequisitesForLspRequestType('references', uri)` should enrich to `'full'` detail blockingly, but the resulting reference index does not appear to feed back into `findReferencesTo` results we observed.
- The original symbol passed into `findReferencesTo` may have a stale ID after the enriched re-parse, causing the lookup to miss the use sites that *are* in the new index.

Fixing this is a substantial sub-investigation that the offload work doesn't gate on. Recommended follow-up:

- Add observability inside `processReferences` (count of `findReferencesTo` hits, count of `findReferencesFrom` hits, count from relationship-type traversal).
- Verify whether `PrerequisiteOrchestrationService` runs enrichment to `'full'` synchronously on the worker as expected.
- If enrichment runs, confirm whether the post-enrichment `SymbolTable` retains stable IDs for the source-file declarations or if the symbol used by `findReferencesTo` is being re-issued.

### Deviations from the original plan

- **`RemoteWorkspaceLoadCoordinator` is inlined in `worker.platform.ts` and `worker.platform.web.ts`** (not imported as in §3.5). Both worker platforms maintain a "no local imports" invariant for esbuild bundling; tsx's strict ESM resolver also rejects extension-less relative imports. The standalone `src/RemoteWorkspaceLoadCoordinator.ts` is kept as the canonical, unit-tested definition; each worker has a private mirror that must stay in sync.
- **Constructor parameter properties replaced with explicit field declarations** in the inlined copies. tsx in strip-only mode does not support TS parameter properties at runtime.
- **Commit count grew to 14**, including the three bug fixes uncovered during verification (bootstrap race, malformed Location, missing dispatcher consultation).
- **Pre-commit hook bypassed (`--no-verify`)** on commits 2–14 by user request to keep iteration fast. The full hook (lint + typecheck + 4235-test suite) ran cleanly on commit 1; later commits were gated on per-package lint and the affected package's tests instead. Worth running the full hook once before merge.

### Test coverage in this branch

- 3 wire-schema round-trip tests
- 3 `LocalWorkspaceLoadCoordinator` tests
- 3 `RemoteWorkspaceLoadCoordinator` unit tests against the canonical class
- 2 new `ReferencesProcessingService` coordinator-injection tests
- Updated `WorkerCoordinator.canDispatch` matrix
- 2 `ResolveDependentUris` integration tests via live data-owner worker

Full cross-file find-references via the enrichment pool with workspace-wide symbol load is deferred to a future Playwright E2E test (per §5.3) and is also gated on the algorithm-completeness work above.

## 1. Background

The April 27, 2026 project status flagged Find References as the first of six remaining LSP requests required to reach Jorje parity. It has been ❌ on the LSP Request Status table since at least October 2025.

The new Apex Language Server has, as of mid-May 2026, landed a multi-worker topology — one **data-owner** worker, an **enrichment pool** of N workers, and an optional **resource-loader** worker — wired via `@effect/platform` `WorkerCoordinator`. Today, four LSP request types are routed to the enrichment pool: `hover`, `definition`, `diagnostics`, and `crossFileEnrichment`. Everything else, including `references`, runs on the coordinator thread.

PR #330 originally proposed offloading `references` along with the other enrichment-pool requests. That PR has been superseded — every behavior change in #330 was absorbed into PRs #348/#350/#351/#352/#371/#372/#373/#383/#386. PR #330's own routing table still has `references: 'coordinatorOnly'`, so the offload was never actually implemented; the PR body's claim was aspirational.

This document specifies the work to (a) make Find References functionally complete and (b) move it to the enrichment pool, in a single feature branch.

### 1.1 Why this matters

Find References on the coordinator thread has two correctness/UX problems on large workspaces:

1. **It blocks the LSP main loop.** `findReferences` does workspace-wide symbol-table traversal. The April 27 status documented that on the largest perf-test project, UI responsiveness "degrades to unusable as workspace size grows" precisely because compute-bound work runs in the main thread. The enrichment pool is the architectural answer.
2. **It needs full workspace awareness.** The current `processReferences` already coordinates a workspace-load notification, but on the coordinator thread it has direct access to the LSP `Connection`. After the routing flip, the worker has no LSP connection — the coordinator-back-call infrastructure (`requestCoordinatorAssistancePromise`) is the right channel, but no message exists for "ensure workspace is loaded."

### 1.2 What is **not** in scope for this design

- Find References for source from outside the workspace (e.g. references from stdlib stubs into user code). Existing scope.
- Persisted reference indexes across server restarts. Out of scope.
- Telemetry for find-references performance. Out of scope; can layer in later.
- Renames (W-???). Renames build on references but are listed separately on the parity table; they are a follow-up after this branch lands.

## 2. Current State

### 2.1 What already exists

- **Wire schema** for `DispatchReferences` in `packages/apex-lsp-shared/src/workerWireSchemas.ts:537` — already sent across the worker boundary.
- **Coordinator dispatch builder** at [WorkerCoordinator.ts:995-1004](../../packages/apex-ls/src/server/WorkerCoordinator.ts#L995-L1004) — already constructs `DispatchReferences` messages.
- **Worker-side handler** at [worker.platform.ts:829-837](../../packages/apex-ls/src/worker.platform.ts#L829-L837) — bare passthrough to `referencesService.processReferences`. **No** `loadSymbolDataForEnrichment` or `writeBackEnrichedSymbols` scaffolding (cf. hover at [:768-798](../../packages/apex-ls/src/worker.platform.ts#L768-L798) and definition at [:799-828](../../packages/apex-ls/src/worker.platform.ts#L799-L828)).
- **`ReferencesProcessingService`** at [packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts](../../packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts) — substantial implementation: prerequisite orchestration, workspace-load coordination, dependency-graph file enrichment, `findReferences` algorithm.
- **`ApexSymbolManager.findReferencesTo(symbol)`** at [ApexSymbolManager.ts:745-755](../../packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts#L745-L755) — backed by `symbolRefManager.findReferencesTo`, cached in `unifiedCache`. This is the data-owner-side capability we need for the dependents pre-fetch.
- **Coordinator assistance proxy.** `requestCoordinatorAssistancePromise(method, params, blocking)` ([worker.platform.ts:1574](../../packages/apex-ls/src/worker.platform.ts#L1574)) sends a side-channel message from the worker to the coordinator over a dedicated `MessagePort`, deduplicated by correlation ID, with two pre-existing methods: `dataOwner:QuerySymbolSubset` and `dataOwner:ResolveDepUris`. Mediator handler dispatch lives at [LCSAdapter.ts:2208-2238](../../packages/apex-ls/src/server/LCSAdapter.ts#L2208-L2238).
- **`ensureWorkspaceLoaded(connection, logger, workDoneToken?)`** at [WorkspaceLoadCoordinator.ts:143-175](../../packages/lsp-compliant-services/src/services/WorkspaceLoadCoordinator.ts#L143-L175) — fire-and-forget notification that asks the LSP client to load the workspace. Reads/writes per-thread `Ref` state (`isLoadedRef`, `isLoadingRef`, `hasFailedRef`).
- **Routing table** at [WorkerCoordinator.ts:553-579](../../packages/apex-ls/src/server/WorkerCoordinator.ts#L553-L579), with the gating TODO at [:548](../../packages/apex-ls/src/server/WorkerCoordinator.ts#L548).

### 2.2 What is missing or wrong

| # | Gap | Where | Why it matters |
|---|-----|-------|---------------|
| 1 | `references: 'coordinatorOnly'` | [WorkerCoordinator.ts:573](../../packages/apex-ls/src/server/WorkerCoordinator.ts#L573) | Find References blocks the LSP main loop. |
| 2 | `DispatchReferences` worker handler is a bare passthrough | [worker.platform.ts:829-837](../../packages/apex-ls/src/worker.platform.ts#L829-L837) and [worker.platform.web.ts:746-754](../../packages/apex-ls/src/worker.platform.web.ts#L746-L754) | Worker has no symbol data for the target file unless it loads it via `loadSymbolDataForEnrichment`. |
| 3 | `ReferencesProcessingService.processReferences` calls `LSPConfigurationManager.getInstance().getConnection()` | [ReferencesProcessingService.ts:94-113](../../packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts#L94-L113) | On an enrichment worker the singleton has no LSP connection. The `connection` returned will be `undefined` and the workspace-load coordination silently no-ops. |
| 4 | No "find files that reference this URI" message | wire schemas, mediator, data-owner | Without it, the worker only has the source file's symbol table and its dependencies. Find-references from *callers* needs the inverse. |
| 5 | Workspace-load `Ref` state is per-thread | [WorkspaceLoadCoordinator.ts](../../packages/lsp-compliant-services/src/services/WorkspaceLoadCoordinator.ts) | `isWorkspaceLoaded()` on the worker reflects only that worker's view. Either we sync the state across workers, or every worker that needs to know must ask the coordinator. |

## 3. Proposed Design

### 3.1 High-level flow

```
LSP client: textDocument/references
  └─> Coordinator:  WorkerDispatchStrategy
        └─> [routes references → enrichment pool]
              └─> Worker: DispatchReferences handler
                    1. loadSymbolDataForEnrichment(uri)            ← existing helper
                    2. NEW: loadDependentsForReferences(uri)       ← new helper
                    3. NEW: ensureWorkspaceLoadedViaCoordinator()  ← new assistance call
                    4. processReferences(...)                      ← existing service
                    5. writeBackEnrichedSymbols(uri, ...)          ← existing helper
                    6. return Location[]
```

The four numbered steps mirror the hover/definition pattern, with two new steps (2 and 3) added between symbol load and the actual algorithm.

### 3.2 New wire messages

Add three tagged requests to `packages/apex-lsp-shared/src/workerWireSchemas.ts`:

```ts
// Worker → coordinator: ask the coordinator to send a workspace-load
// notification to the LSP client. Fire-and-forget at the LSP layer
// (the notification doesn't carry a result), but blocking at the
// assistance layer so the worker can await the notification *send*.
export class CoordinatorEnsureWorkspaceLoaded extends Schema.TaggedRequest<
  CoordinatorEnsureWorkspaceLoaded
>()(
  'CoordinatorEnsureWorkspaceLoaded',
  Schema.Void,         // success
  Schema.Void,         // failure (best-effort)
  { workDoneToken: Schema.optional(Schema.Union(Schema.String, Schema.Number)) },
) {}

// Worker → data-owner (via assistance proxy): given a target URI,
// return symbol tables for all files whose declared symbols reference
// any symbol declared in `uri`. Mirrors ResolveDepUris in shape.
export class DataOwnerResolveDependentUris extends Schema.TaggedRequest<
  DataOwnerResolveDependentUris
>()(
  'DataOwnerResolveDependentUris',
  Schema.Struct({                          // success
    entries: Schema.Record(Schema.String, Schema.Unknown),
  }),
  Schema.String,                           // failure
  { uri: Schema.String, symbolName: Schema.optional(Schema.String) },
) {}
```

Method strings on the assistance bus:
- `coordinator:EnsureWorkspaceLoaded` — handled by the coordinator's primary `AssistanceHandler`.
- `dataOwner:ResolveDependentUris` — handled by the `dataOwnerHandler` (second arg to `CoordinatorAssistanceMediator`), which routes through `dispatcher.queryDataOwner`.

The `dataOwner:` prefix already triggers the secondary handler path at [CoordinatorAssistanceMediator.ts:171-178](../../packages/apex-ls/src/server/CoordinatorAssistanceMediator.ts#L171-L178); no plumbing change is needed there.

### 3.3 Coordinator-side handlers

In [LCSAdapter.ts](../../packages/apex-ls/src/server/LCSAdapter.ts), add a branch in the primary mediator handler (before the catch-all `connection.sendRequest`):

```ts
if (method === 'coordinator:EnsureWorkspaceLoaded') {
  const p = params as { workDoneToken?: ProgressToken };
  await Effect.runPromise(
    ensureWorkspaceLoaded(this.connection, this.logger, p.workDoneToken),
  );
  return undefined;
}
```

This reuses the existing `ensureWorkspaceLoaded` Effect verbatim. The coordinator owns the LSP connection; it sends the notification; per-thread `Ref` state on the coordinator is updated. (The worker's local `Ref` state is unchanged — see §3.7 for the rationale.)

In the data-owner worker bootstrap (the same file that handles `dataOwner:QuerySymbolSubset` and `dataOwner:ResolveDepUris`), add a handler for the new method. The handler:

1. Look up the file's symbol table via `symbolManager.getSymbolTableForFile(uri)`.
2. For each declared symbol in that table, call `symbolManager.findReferencesTo(symbol)` to get `ReferenceResult[]`.
3. Collect the set of distinct `fileUri`s from those references, minus `uri` itself.
4. For each distinct file URI, fetch its symbol table (same path as `QuerySymbolSubset`) and serialize.
5. Return `{ entries: Record<fileUri, serializedSymbolTable> }`.

If `symbolName` is provided in the params, narrow step 2 to just that symbol — a future optimization for "find references to *this* symbol only", which is what the user actually asks for. We accept the param now to avoid a wire-schema break later.

### 3.4 Worker-side `loadDependentsForReferences`

New helper in `worker.platform.ts` (and mirror in `worker.platform.web.ts`), modeled on the existing `loadSymbolDataForEnrichment`'s Phase-2 block at [:627-668](../../packages/apex-ls/src/worker.platform.ts#L627-L668):

```ts
async function loadDependentsForReferences(
  svc: EnrichmentServices,
  uri: string,
  symbolName?: string,
): Promise<void> {
  try {
    const response = (await requestCoordinatorAssistancePromise(
      'dataOwner:ResolveDependentUris',
      { uri, symbolName },
      true,   // blocking — we need this before findReferences runs
    )) as { entries: Record<string, unknown> };
    if (response?.entries) {
      const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
      for (const [depUri, stData] of Object.entries(response.entries)) {
        if (!stData) continue;
        const st = SymbolTable.fromSerializedData(
          stData as Parameters<typeof SymbolTable.fromSerializedData>[0],
        );
        await Effect.runPromise(svc.symbolManager.addSymbolTable(st, depUri));
      }
    }
  } catch {
    // Best-effort: if dependents fetch fails, we still return references
    // we can find from the loaded subset.
  }
}
```

### 3.5 Worker-side workspace-load coordinator-call

`ReferencesProcessingService.processReferences` currently calls `this.getConnection()` then `this.queueWorkspaceLoadIfNeeded(connection, …)`. To make the service work in both contexts:

**Option A (chosen): inject a `WorkspaceLoadCoordinator` interface.** The service depends on an abstraction with one method:

```ts
export interface IWorkspaceLoadCoordinator {
  ensureLoaded(workDoneToken?: ProgressToken): Promise<void>;
}
```

Two implementations:

1. `LocalWorkspaceLoadCoordinator` — wraps `ensureWorkspaceLoaded(connection, logger, token)` for direct LSP-connection use. Used by the coordinator thread.
2. `RemoteWorkspaceLoadCoordinator` — calls `requestCoordinatorAssistancePromise('coordinator:EnsureWorkspaceLoaded', { workDoneToken }, true)`. Used by enrichment workers.

`ServiceFactory.createReferencesService` accepts the coordinator (defaulting to a no-op if not provided so existing tests keep working). The worker bootstrap at [WorkerBackendBootstrap.ts:156](../../packages/lsp-compliant-services/src/workers/WorkerBackendBootstrap.ts#L156) wires the remote variant; the coordinator-side LCS adapter wires the local variant.

This change is contained to:
- New file: `packages/lsp-compliant-services/src/services/IWorkspaceLoadCoordinator.ts`
- New file: `packages/lsp-compliant-services/src/services/LocalWorkspaceLoadCoordinator.ts`
- New file: `packages/apex-ls/src/workers/RemoteWorkspaceLoadCoordinator.ts` (lives in apex-ls because it depends on the worker.platform assistance proxy)
- Modified: `ReferencesProcessingService` (replace `this.getConnection()` + `this.queueWorkspaceLoadIfNeeded` with `this.workspaceLoadCoordinator.ensureLoaded(token)`)
- Modified: `ServiceFactory`, `WorkerBackendBootstrap`, LCSAdapter wiring

**Why not** keep the connection-based path as a fallback? Because the worker's `LSPConfigurationManager.getInstance().getConnection()` returns `undefined` silently — the user gets partial results with no diagnostic signal that workspace load was skipped. Better to fail loudly via the injected coordinator, or succeed correctly via the assistance call.

### 3.6 Beefed-up `DispatchReferences` worker handler

Replace the bare passthrough at [worker.platform.ts:829-837](../../packages/apex-ls/src/worker.platform.ts#L829-L837) with:

```ts
DispatchReferences: enrichmentHandler<RefsReq>(
  'DispatchReferences',
  async (svc, req) => {
    const { version, detailLevel } = await loadSymbolDataForEnrichment(
      svc,
      req.textDocument.uri,
      req.content,
    );

    // References needs 'protected' detail level — same as the existing
    // behaviour in ReferencesProcessingService.processReferences for
    // dependency-graph enrichment.
    const requiredLevel = 'protected';
    const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

    // NEW: load symbol tables of files that reference symbols declared in
    // this file. Without this, findReferences sees only same-file refs.
    await loadDependentsForReferences(svc, req.textDocument.uri);

    const result = await svc.referencesService.processReferences({
      textDocument: { uri: req.textDocument.uri },
      position: req.position,
      context: { includeDeclaration: req.context.includeDeclaration },
    });

    if (needsEnrichment) {
      await writeBackEnrichedSymbols(
        svc,
        req.textDocument.uri,
        version,
        requiredLevel,
      );
    }

    return result;
  },
),
```

Mirror the change in `worker.platform.web.ts`. Detail level set to `'protected'` matches what `ReferencesProcessingService.processReferences` already requests for dependency-graph enrichment ([ReferencesProcessingService.ts:228](../../packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts#L228)).

### 3.7 Routing flip and the gating TODO

Two changes in `WorkerCoordinator.ts`:

```diff
   completion: 'coordinatorOnly',
-  references: 'coordinatorOnly',
+  references: 'enrichmentPool',
   rename: 'coordinatorOnly',
```

And remove `'coordinatorOnly'` from the routing-table comment at [:548](../../packages/apex-ls/src/server/WorkerCoordinator.ts#L548) only after the change lands. The TODO ("enable when data sharing is ready") stays in spirit until *all* gated requests are migrated; we update it to reflect the new state, e.g.:

```
- enrichmentPool:  routed to an enrichment pool worker. Hover/definition/
  diagnostics/references/crossFileEnrichment use this path. Other heavy
  requests (rename, completion, implementation) remain on coordinatorOnly
  pending design.
```

The dispatch-builder switch arm at [WorkerCoordinator.ts:995-1004](../../packages/apex-ls/src/server/WorkerCoordinator.ts#L995-L1004) is already correct for `references`; no change needed there.

### 3.8 Workspace-load state coherence

The workspace-load `Ref` state (`isLoadedRef`, `isLoadingRef`, `hasFailedRef`) lives in module scope inside [WorkspaceLoadCoordinator.ts](../../packages/lsp-compliant-services/src/services/WorkspaceLoadCoordinator.ts), so each worker has its own copy. We deliberately do *not* try to sync this state across workers in this branch:

- Worker calls `RemoteWorkspaceLoadCoordinator.ensureLoaded(token)`.
- Coordinator's mediator branch invokes `ensureWorkspaceLoaded(connection, …)`.
- Coordinator's `Ref` state flips to `loading=true`, notification is sent.
- Subsequent worker calls re-cross the wire and idempotency is enforced on the *coordinator's* `Ref` state, not the worker's.
- Worker `Ref` state remains `loading=false`, `loaded=false` forever — but the worker never reads it. Only `processReferences` reads it (via the now-removed `queueWorkspaceLoadIfNeeded` path), which we delete.

This sidesteps a cache-coherence design and matches the existing pattern: coordinator is the source of truth for workspace state; workers are stateless w.r.t. workspace lifecycle. If a future request type needs a worker to *block* on workspace readiness, we can extend the wire response to include a "loaded yet?" boolean, but `references`'s current behavior is "kick off load in background, return partial results immediately," so blocking is not required.

## 4. Implementation Plan

Commits in dependency order. Each commit should be independently buildable and testable.

| # | Commit | Description | Est. LOC |
|---|--------|-------------|----------|
| 1 | `feat(apex-lsp-shared): add wire schemas for workspace-load and dependents resolution` | Add `CoordinatorEnsureWorkspaceLoaded` and `DataOwnerResolveDependentUris` to `workerWireSchemas.ts`. Update the `EnrichmentSearchRequest` union if needed. | ~50 |
| 2 | `feat(apex-ls): coordinator handler for EnsureWorkspaceLoaded` | Add the branch to `LCSAdapter.ts` mediator handler. Unit test: assert the mediator routes `coordinator:EnsureWorkspaceLoaded` through `ensureWorkspaceLoaded`. | ~30 src + ~80 test |
| 3 | `feat(apex-ls): data-owner handler for ResolveDependentUris` | New handler in the data-owner bootstrap that calls `findReferencesTo` and returns serialized symbol tables. Unit test against an in-memory symbol manager fixture. | ~80 src + ~120 test |
| 4 | `refactor(lsp-compliant-services): inject IWorkspaceLoadCoordinator into ReferencesProcessingService` | Define interface, default no-op impl, refactor `processReferences` to use it. Update existing tests (mock the new dep). | ~100 src + ~50 test deltas |
| 5 | `feat(lsp-compliant-services): LocalWorkspaceLoadCoordinator` | Wraps `ensureWorkspaceLoaded`; wire into `ServiceFactory.createReferencesService` for the coordinator path. | ~40 src + ~40 test |
| 6 | `feat(apex-ls): RemoteWorkspaceLoadCoordinator` | Calls `requestCoordinatorAssistancePromise`; wire into worker bootstrap. | ~40 src + ~40 test |
| 7 | `feat(apex-ls): loadDependentsForReferences helper` | New worker-side helper in `worker.platform.ts` and `worker.platform.web.ts`. | ~80 src |
| 8 | `feat(apex-ls): beef up DispatchReferences worker handler` | Replace passthrough with full enrichment scaffolding. Mirror in web platform. | ~60 src |
| 9 | `feat(apex-ls): route references to enrichmentPool` | One-line routing change + comment update. | ~5 src |
| 10 | `test(apex-ls): integration test for references through worker topology` | End-to-end: spawn workers, load a fixture project, request references on a method, assert location count and partial-result behavior. Mirrors `WorkerCoordinator.node.test.ts` patterns. | ~250 test |
| 11 | `docs: update LSP request status table for references` | Move `textDocument/references` from ❌ to ✅ in the documentation tables that mirror the parity matrix. | ~20 doc |

**Total estimate:** ~485 LOC source + ~700 LOC test + 20 LOC doc.

### 4.1 Branch hygiene

- Rebase against `main` after each ~3 commits. Multi-worker code on main is an active churn area; a stale branch is a high-cost rebase.
- Every commit must pass `npm run typecheck`, `npm run lint`, and the affected package's test suite. Use the `verification` skill before pushing.
- PR title format: `feat(apex-ls): offload Find References to enrichment pool - W-XXXXXXXX` (per `pr-draft` skill).
- PR body references this design doc and `@W-XXXXXXXX@`.

## 5. Test Strategy

### 5.1 Unit tests

- **`CoordinatorAssistanceMediator`** — assert `coordinator:EnsureWorkspaceLoaded` invokes the primary handler with `(method, params)`. Already covered by existing dispatch tests; add one `it()` block for the new method.
- **Coordinator handler** — pass a stub `Connection` and a stub logger, assert `sendNotification` is called with the workspace-load notification when `Ref` state is `loaded=false, loading=false`.
- **Data-owner handler** — fixture symbol manager with file A declaring `Foo`, files B and C referencing `Foo.bar`, file D unrelated. Call handler with `{ uri: A }`. Assert response contains entries for B and C only.
- **`LocalWorkspaceLoadCoordinator`** — assert it threads `connection` and `workDoneToken` through to `ensureWorkspaceLoaded`.
- **`RemoteWorkspaceLoadCoordinator`** — mock `requestCoordinatorAssistancePromise`; assert the method name and params shape.
- **`ReferencesProcessingService`** — existing tests should pass after the refactor; add a test that injects a recording `IWorkspaceLoadCoordinator` and asserts `ensureLoaded` is called once per `processReferences`.
- **`loadDependentsForReferences`** — mock the assistance proxy; assert it parses the response, deserializes via `SymbolTable.fromSerializedData`, and calls `symbolManager.addSymbolTable` for each entry.

### 5.2 Integration tests

- **`ReferencesThroughWorkerTopology.node.test.ts`** — spawn the topology, ingest a 5-file fixture, send `textDocument/references` for a symbol with known cross-file usages, assert location count matches expected. Use `WorkerCoordinator.node.test.ts` as a template.
- **Web-platform mirror** — same test under the browser worker layer if the existing integration suite covers other enrichment requests in browser mode (check current coverage; not strictly required if web E2E coverage is via Playwright).

### 5.3 E2E tests

- Add a Playwright test under `e2e-tests/` that opens a fixture workspace, places the cursor on a method declaration, triggers Find All References, and asserts the references panel populates within a reasonable bound. Mirror existing hover/definition E2E patterns.

### 5.4 Performance validation

Run `npm run test:perf` against the largest project in the perf corpus before and after:

- **UI responsiveness during `findReferences`** — measure delay between a `textDocument/references` request and the next `textDocument/didChange` being processed. Must not regress vs. coordinator-thread baseline; should improve.
- **References result completeness** — for a known symbol with N references, assert |returned| ≥ |returned by coordinator-thread baseline|. Acceptable to return *more* (worker has dependents pre-fetched); not acceptable to return fewer.
- **Cold-start latency** — first references request after server start. Watch for regression caused by the dependents pre-fetch round trip.

## 6. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Dependents pre-fetch round trip dominates request latency for symbols with many referrers | Medium | UI feels sluggish on Find References for popular symbols | Make dependents pre-fetch best-effort and return partial results immediately; add a configurable cap on number of dependents loaded |
| `ensureWorkspaceLoaded` notification race — worker fires the call, then immediately reads workspace symbols that aren't loaded yet | High | Partial results | This is the *existing* behavior on the coordinator path. We preserve it intentionally — find-references is "background load + immediate partial" by design ([ReferencesProcessingService.ts:198](../../packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts#L198)). |
| `findReferencesTo` cache on data-owner becomes stale when files change | Low | Returns references to symbols that no longer exist | Existing concern, not introduced by this change; cache invalidation lives in `ApexSymbolRefManager` and is exercised by document-change tests |
| `IWorkspaceLoadCoordinator` refactor breaks code paths in other services that read `LSPConfigurationManager.getInstance().getConnection()` | Medium | Compile failure or regression | Limit the refactor to `ReferencesProcessingService` for now; other services (hover, definition, completion) stay on direct connection access until they are also offloaded |
| Per-thread `Ref` state in worker leaks confusing logs ("workspace not loaded" forever) | Low | Noisy debug output | Remove the worker's read of `isWorkspaceLoaded`/`isWorkspaceLoading` from `processReferences`; the injected coordinator is the source of truth |
| Wire-schema change forces coordinated upgrade between coordinator and worker | High | Mismatched schemas crash workers on next start | Schema change lands in commit 1 with no consumers; consumers added in later commits in the same branch. No partial deploys possible since both ship in the same extension build. |
| Browser worker dependents pre-fetch is slow due to MessageChannel marshalling of large symbol tables | Medium | Find References slow in web console | Measure during M5 of the release plan; if regression is real, batch the entries in chunks or compress the wire format |
| `findReferencesTo(symbol)` is called per-symbol in the data-owner handler — for a file with many declarations this is N round-trips through the cache | Medium | Slow data-owner-side response on large files | Add an `ApexSymbolManager.findReferencesToFile(uri)` bulk method as a follow-up; for now the cache hit rate in `unifiedCache` should make the per-symbol calls cheap |

## 7. Resolved Decisions

1. **Partial-results behavior preserved.** `references` does not block on workspace load. The worker fires `coordinator:EnsureWorkspaceLoaded` (best-effort), continues immediately with whatever symbols are loaded, and returns a (possibly partial) `Location[]`. This matches the existing coordinator-thread behavior at [ReferencesProcessingService.ts:198](../../packages/lsp-compliant-services/src/services/ReferencesProcessingService.ts#L198) — under offload, only the threading model changes, not the result-completeness contract.
2. **Single PR for all 11 commits.** Treated as one experiment to land the offload end-to-end. Commits stay logically separable so reviewers can read them in order; the PR doesn't get split.

## 8. Open Questions

1. **What detail level is correct for references?** `processReferences` enriches dependents to `'protected'`. Hover and definition use `'full'`. References needs at minimum the visibility tier where a reference might exist; protected is correct unless we want to find references from `private` members in *other* files (which is impossible per Apex visibility rules), so `'protected'` is the upper bound. Sanity-check this with the parser-ast team.
2. **Should we add `findReferencesToFile(uri)` bulk method to `ApexSymbolManager` now or as a follow-up?** Affects the data-owner handler's complexity. Follow-up is fine if the per-symbol path is fast enough on the perf corpus.

## 9. Out-of-scope / Follow-ups

- `rename` offload (W-???). Builds on references.
- `implementation` offload — currently `coordinatorOnly`, has a `DispatchImplementation` worker handler that's also a bare passthrough. Same pattern as references but lower-priority per parity table.
- Persisted reference index across restarts.
- Telemetry for references performance.
- Stdlib-to-user-code references (e.g. "find places that override `String.equals`"). Existing scope; unaffected by this change.
- Bulk `findReferencesToFile` on `ApexSymbolManager` for data-owner handler optimization.

## 10. References

- Project status PDF, April 27 2026 entry, "Tasks to complete for Jorje parity" §3a (Find References as first priority).
- Project status PDF, October 21 2025 entry, "Technical Challenges Remaining," lists Find References as workspace-awareness-blocked.
- PR #330 (W-22007395), Effect Platform multi-worker topology with enrichment offload — superseded; design noted as aspirational for `references`.
- PR #373 (W-22201108), Node/browser worker platform — landed the assistance-proxy pattern this design extends.
- PR #383 (W-22201110), server-side worker integration (feature-gated) — landed the routing infrastructure.
- PR #386 (W-22201120), worker topology UI — provides the user-visible signals (status bar, topology view) we'll piggyback for reference-load progress.
- LSP spec: [textDocument/references](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_references).
