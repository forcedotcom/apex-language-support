# LSP Request Preparation Quality and Performance Plan

Work item: W-23448544
Status: In progress
Last updated: 2026-07-22

## Objective

Generalize the request-preparation performance work proven with hover so that
all applicable LSP requests benefit from cached full-detail compilation,
request-scoped dependency loading, verified enrichment, and consistent
observability.

The implementation must preserve the data-owner as the authoritative symbol
state, keep cache state scoped to each request worker's `ApexSymbolManager`, and
avoid broad fallback behavior that can silently return incomplete results.

## Current State

The branch already provides a strong shared foundation:

- Persistent Effect Worker pools for compilation and LSP request processing.
- A bounded producer/consumer pipeline for workspace compilation results.
- Serialized, version-checked writes to the authoritative data owner.
- Deferred workspace cross-file resolution.
- Optimized same-file resolution, symbol indexes, FQN lookup, and graph updates.
- Per-symbol-manager full-detail cursor caching.
- Detailed hover preparation and cache instrumentation.

The parser, indexing, workspace-load, and symbol-manager improvements already
benefit all consumers. The newest request-preparation optimizations, however,
are primarily enabled by the hover handler.

## Findings to Address

### 1. Verify detail level before write-back

`writeBackEnrichedSymbols` accepts a caller-provided detail level without
verifying that the local symbol table actually reached that level. Some request
handlers ignore failed recompilation or prerequisite enrichment and can still
attempt to write the table back as `full`.

Required outcome:

- Preparation returns the actual achieved detail level.
- Write-back occurs only when the requested level was successfully achieved.
- The data owner never records a higher detail level than the serialized table
  contains.
- Failed or absent live-content recompilation cannot promote a public-API table
  to full detail.

### 2. Make full-detail reuse request-independent

The full-detail cache is correctly scoped by `ApexSymbolManager`, but only
hover currently enables unchanged-content reuse. Completion and definition can
repeat the same compilation, and other handlers use different preparation
paths.

Required outcome:

- Any eligible request can reuse an unchanged full-detail cursor table.
- Cache identity includes URI, live content, document version, and the current
  table instance.
- Cache state remains local to each request worker and symbol-manager instance.
- Cache size remains bounded.
- Accepted data-owner write-back allows another request worker to benefit from
  the enriched state without sharing mutable table instances.

### 3. Establish one source of truth for request prerequisites

Prerequisite policy currently exists in both
`LspRequestPrerequisiteMapping.ts` and individual worker handlers. The two can
disagree. For example, completion is mapped to private detail with no whole-file
cross-file resolution, while its handler currently requests full detail and
uses the loader's default cross-file materialization.

Required outcome:

- Request handlers do not independently redefine required detail level or
  dependency scope.
- One typed policy maps every routed LSP request to its preparation needs.
- Existing prerequisite orchestration consumes the same policy or is folded
  into the shared preparation path.
- Policy changes are covered by table-driven tests.

### 4. Carry live content consistently

Position- and body-sensitive requests must operate on the current editor text.
Implementation currently does not carry live content through the worker wire
protocol. Empty content is also inconsistently treated as absent.

Required outcome:

- Every request that depends on cursor position, method bodies, locals, or
  unsaved declarations carries live content when available.
- `undefined` means content is unavailable; `""` remains valid document text.
- Message schemas, coordinator builders, and worker handlers enforce the same
  contract.

### 5. Make degradation explicit per request

The shared symbol-data loader currently catches assistance failures and
continues with a partial graph for every request.

Required outcome:

- Latency-sensitive requests may explicitly select best-effort behavior.
- Correctness-sensitive requests select strict preparation and do not silently
  interpret incomplete state as a valid no-result response.
- Failures are typed and observable.
- No alternate compilation path is introduced.

### 6. Generalize instrumentation and coverage

Hover currently has the best preparation telemetry. Other request handlers do
not expose equivalent cache, compilation, dependency-load, and write-back
measurements.

Required outcome:

- Every prepared request emits a common preparation span.
- Request-specific processing spans remain separate from shared preparation.
- Cross-request cache reuse and cross-worker write-back are tested.

## Target Architecture

Introduce a shared request-preparation operation with a typed policy:

```text
live/stored content
        |
        v
load or reuse local cursor table
        |
        v
reach required detail level
        |
        v
load required dependency scope
        |
        v
execute request-specific service
        |
        v
write back verified improved state
```

Suggested concepts:

```ts
type DependencyScope =
  | 'none'
  | 'cursor-target'
  | 'outbound-file'
  | 'inbound-dependents'
  | 'workspace';

type PreparationFailureMode = 'best-effort' | 'strict';

interface RequestPreparationPolicy {
  requiredDetailLevel: DetailLevel | null;
  content: 'none' | 'stored' | 'live-if-available' | 'live-required';
  dependencyScope: DependencyScope;
  reuseUnchangedCursor: boolean;
  failureMode: PreparationFailureMode;
  writeBack: boolean;
}

interface PreparedRequestContext {
  uri: string;
  documentVersion: number;
  initialDetailLevel: DetailLevel | null;
  achievedDetailLevel: DetailLevel | null;
  cacheHit: boolean;
  localTableChanged: boolean;
  dependencyScopeCompleted: DependencyScope;
  writeBackRequired: boolean;
}
```

The names are provisional. The important constraint is that handlers consume a
verified result rather than inferring successful enrichment from the requested
target level.

## Initial Request Policy Matrix

This matrix must be validated against language semantics and existing service
requirements before implementation.

| Request          | Detail                          | Content                    | Dependency scope           | Failure mode | Reuse                        |
| ---------------- | ------------------------------- | -------------------------- | -------------------------- | ------------ | ---------------------------- |
| Hover            | Full                            | Live if available          | Cursor target              | Best effort  | Yes                          |
| Completion       | Private or Full, to be resolved | Live required              | Cursor target              | Best effort  | Yes                          |
| Definition       | Full                            | Live required              | Cursor target              | Strict       | Yes                          |
| Signature Help   | Full                            | Live required              | Cursor target              | Strict       | Yes                          |
| Code Action      | Full                            | Live required              | None by default            | Strict       | Yes                          |
| Implementation   | Full                            | Live required              | Inbound dependents         | Strict       | Yes                          |
| References       | Full cursor                     | Live required              | Specialized workspace scan | Strict       | Yes for cursor               |
| Document Symbol  | Private or Full, to be resolved | Live required              | None                       | Best effort  | Yes if compilation is shared |
| Code Lens        | Request-specific                | Stored or live if required | Request-specific           | Best effort  | When applicable              |
| Diagnostics      | Full                            | Live if available          | Outbound file              | Strict       | Yes                          |
| Rename           | Full                            | Live required              | Workspace                  | Strict       | Yes for cursor               |
| Workspace Symbol | Public API                      | None                       | Workspace index            | Strict       | Not applicable               |

References retains its specialized lexical-prefilter and standalone-candidate
scan. Generalization should reuse cursor preparation without forcing references
through a hover-shaped dependency strategy.

## Implementation Plan

### Phase 1: Define and test request policies

- [x] Introduce typed content, dependency-scope, failure-mode, and write-back
      policy definitions.
- [x] Make the policy table the authoritative mapping for worker-routed LSP
      requests.
- [x] Reconcile completion detail level with the canonical prerequisite
      mapping. Document-symbol compilation remains to be reconciled.
- [x] Add table-driven tests for the initial request policies.

### Phase 2: Build shared cursor preparation

- [x] Extract symbol-subset loading, live-document storage, full-detail
      compilation, and cache reuse from the hover handler.
- [x] Return initial and achieved detail levels explicitly.
- [x] Treat empty content as valid.
- [x] Preserve per-symbol-manager cache ownership and the existing bounded
      eviction behavior.
- [x] Query only owner version/detail metadata for cold live cursor requests;
      avoid transferring and installing a cursor table that the local
      full-detail compile immediately replaces.
- [ ] Remove hover terminology from shared cache and helper documentation.

### Phase 3: Separate dependency strategies

- [x] Implement `none` without cross-file materialization.
- [x] Implement cursor-target loading for hover, definition, and completion
      without resolving every unresolved symbol in the file.
- [ ] Apply cursor-target loading to signature help once preparation can derive
      the enclosing invocation target from a cursor inside its argument list.
- [x] Preserve inbound-dependent loading for implementation.
- [ ] Preserve the specialized workspace scan for references.
- [x] Avoid requesting dependencies already present in the local worker.

### Phase 4: Make write-back state-safe

- [x] Gate write-back on verified achieved detail level.
- [x] Derive or validate serialized table detail instead of trusting a caller
      label.
- [x] Retain document-version and detail-downgrade rejection on the data owner.
- [ ] Record accepted, rejected, skipped, and failed write-back outcomes.
- [x] Test failed/insufficient detail and absent or empty content. Stale-version
      and worker-race coverage remains in the existing integration suites.

### Phase 5: Migrate request handlers

- [x] Suppress service-owned prerequisite orchestration when a worker handler
      has already completed shared preparation.
- [x] Hover.
- [x] Completion.
- [x] Definition.
- [x] Signature help.
- [x] Code action.
- [x] Implementation.
- [ ] Diagnostics. Live content and verified write-back are complete, but the
      diagnostic-owned compilation path intentionally remains specialized.
- [ ] Document symbol and code lens where preparation is applicable.
- [ ] References cursor preparation without changing its candidate scan.
- [ ] Rename if and when it moves to the request-worker topology.

Each migrated handler should contain only request-specific processing after the
shared preparation call.

### Phase 6: Tighten failure semantics

- [ ] Replace the loader-wide catch-and-continue behavior with policy-driven
      strict or best-effort handling.
- [ ] Ensure strict requests distinguish preparation failure from a legitimate
      empty result.
- [ ] Keep fallback paths explicit, observable, and minimal.
- [ ] Confirm no coordinator-local compilation fallback is reintroduced.

### Phase 7: Add shared observability

- [x] Add a common `worker.lspRequest.prepare` span with `request.type`.
- [x] Record cache hit, initial/achieved detail, content availability, dependency
      scope, tables loaded, compile time, add-table time, and write-back result.
- [x] Distinguish full owner queries, metadata-only owner queries, and skipped
      owner queries in preparation spans.
- [x] Retain request-specific processing spans for hover, completion,
      definition, and signature help.
- [ ] Remove hover-only preparation attributes after equivalent generic
      attributes are proven.

### Phase 8: Validate behavior and performance

- [x] Test repeated identical requests on one worker, including a guarded
      owner-query fast path for matching live content and document version.
- [x] Test cache reuse across different request types on the same worker.
- [ ] Test the inverse request order.
- [ ] Test dispatch across both request workers and verify safe data-owner
      write-back reuse.
- [ ] Test changed content and document versions invalidate reuse.
- [x] Test empty documents.
- [ ] Test same-file locals, optional `this.`, dotted expressions, namespaces,
      case-insensitive identifiers, and generic collection types.
- [ ] Test strict requests under assistance failure.
- [ ] Compare cold and warm spans for every migrated request.

## Acceptance Criteria

- Repeated eligible requests do not recompile unchanged cursor content on the
  same request worker.
- A different request type can reuse preparation performed by an earlier
  request when its policy requirements are already satisfied.
- No request writes back a detail level it did not achieve.
- Completion and code action do not materialize whole-file cross-file edges
  unless their final policy explicitly requires them.
- Definition, implementation, references, diagnostics, and rename do not return
  an ordinary empty result when strict preparation failed.
- Position-sensitive requests operate on unsaved editor content.
- Empty document content is preserved across the worker boundary.
- Request-worker caches remain bounded and isolated per symbol-manager instance.
- Generic preparation spans make cold, warm, cache-hit, dependency-load, and
  write-back costs comparable across request types.
- Desktop and browser worker implementations use the same preparation logic.
- Existing workspace-load performance and correctness remain within the
  established pool-size-2 baseline variance.

## Decisions Already Established

- Compilation worker pool size defaults to 2.
- Compilation concurrency per worker defaults to 1.
- Effect Worker remains the worker lifecycle and dispatch mechanism.
- The data owner remains authoritative and mutation is serialized.
- Workspace compilation has no coordinator-local fallback.
- Request-worker symbol tables and caches are worker-local; mutable symbol
  tables are not shared between workers.
- Apex lookup remains case-insensitive and namespace-aware.
- Dotted expressions cannot be treated as imports or assumed to be fully
  qualified names.

## Out of Scope

- Replacing the specialized find-references candidate scan without separate
  evidence.
- Parallel mutation of the authoritative symbol manager.
- Increasing Effect Worker concurrency for compute-bound compilation.
- Sharing mutable `SymbolTable` instances between workers.
- Introducing a broad fallback compilation path.
