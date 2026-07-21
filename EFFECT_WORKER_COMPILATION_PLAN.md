# Effect Worker Compilation Architecture Plan

## Status

- **Purpose:** Replace the current manual `worker_threads` workspace-compilation experiment with an Effect Worker-managed design.
- **Initial runtime:** Node.js.
- **Required target runtime:** Browser/Web Worker.
- **Primary architectural constraint:** The data owner remains the sole owner of the authoritative document store and symbol graph.
- **Failure policy:** Avoid silent execution fallbacks. A configured topology either starts and operates successfully or reports an explicit failure.

### Implementation progress

- [x] Added a platform-neutral, schema-validated single-file compilation protocol.
- [x] Added a reusable compiler handler and symbol-table reconstruction.
- [x] Added a dedicated Node Effect Worker compiler entrypoint and build output.
- [x] Replaced manual per-request `worker_threads` management with a persistent data-owner-owned `SerializedWorkerPool`.
- [x] Wired existing `compilation.poolSize` to backing worker/thread count.
- [x] Wired existing `compilation.concurrency` to Effect Worker per-worker concurrency.
- [x] Moved compilation outside the data-owner write queue and kept commits serialized.
- [x] Decoupled bounded compilation producers from the serialized commit consumer with an Effect Queue.
- [x] Added queue high-water, producer backpressure, and consumer idle-wait span attributes.
- [x] Set the initial result buffer to four results per compilation worker (eight with the default two-worker pool).
- [x] Added client-generated workspace session IDs so overlapping loads with equal batch counts cannot be mixed.
- [x] Release stored compressed batches immediately after successful decode.
- [x] Enforced authoritative document-version validation before graph mutation.
- [x] Removed coordinator-local workspace compilation fallback from the worker workspace-load route.
- [x] Added Node integration coverage for configured worker count, graph commit, missing documents, and stale versions.
- [x] Require every configured compiler worker to initialize before topology readiness, with bounded startup failure and scoped-shutdown coverage.
- [x] Add runtime worker crash and in-flight request interruption assertions.
- [x] Route `didOpen`, `didChange`, and `didSave` compilation through the persistent pool with storage-before-compile ordering and local data-owner commits.
- [x] Added interruptible high/low pool admission so interactive requests receive the next released worker before queued or newly submitted workspace work.
- [x] Removed the obsolete top-level compilation worker, legacy batch protocol, and compiler-to-coordinator write-back path.
- [x] Add the browser compiler entrypoint and data-owner-owned nested Web Worker pool.
- [x] Exercise the portable protocol through a real two-worker nested pool in headless Chromium.
- [ ] Validate worker bundle URLs, Blob behavior, and CSP in the supported VS Code web-extension host.

## Goals

1. Use Effect Worker to create, manage, schedule, interrupt, and dispose compilation workers.
2. Achieve real CPU-parallel Apex parsing through multiple backing workers.
3. Eliminate the compilation-worker to coordinator to data-owner write-back path.
4. Keep compilation outside the data owner's serial write fiber.
5. Keep symbol graph mutations serialized and owned exclusively by the data owner.
6. Use the same compilation protocol and orchestration model in Node and browser runtimes.
7. Use a persistent, warm compilation pool for workspace and interactive compilation.
8. Bound memory use by committing results as compilation jobs complete.
9. Make initialization and runtime failures visible and deterministic.

## Non-goals

1. Sharing mutable `SymbolTable` instances between workers.
2. Using `SharedArrayBuffer` in the first implementation.
3. Parallel mutation of the authoritative symbol graph.
4. Preserving the current manual `worker_threads` implementation as a runtime fallback.
5. Fully optimizing serialization before the architecture is validated.
6. Supporting dynamic worker-pool resizing in the first implementation.

## Terminology

### Worker count

`compilation.poolSize` is the number of backing compilation workers:

- In Node.js, each Effect worker is backed by a Node `worker_thread`.
- In the browser, each Effect worker is backed by a Web Worker.

At the architecture and configuration level, worker count and thread count represent the same scaling control. The existing `WorkerConfig.poolSize` setting already expresses this and should be used rather than introducing a second count setting.

### Effect worker concurrency

Effect's pool `concurrency` controls how many requests may be leased concurrently to one backing worker. It does not create additional JavaScript threads. The existing `compilation.concurrency` setting maps directly to this Effect Worker pool option.

Apex parsing is synchronous CPU work. Consequently:

```text
size: N, concurrency: 1
```

provides up to `N` CPU-parallel compilations, while:

```text
size: 1, concurrency: N
```

still provides only one CPU execution thread.

The compilation pool uses:

```ts
{
  size: compilationPoolSize,
  concurrency: compilationConcurrency,
}
```

For synchronous CPU-bound parsing, `poolSize` determines CPU parallelism. Values of `concurrency` above `1` can admit and multiplex additional requests on a worker, but do not add parsing threads.

### Data-owner request concurrency

Data-owner request concurrency controls how many requests its Effect worker can admit. It is distinct from compilation worker count and from the data owner's internal serial graph-write fiber.

## Original Experiment Baseline

The current uncommitted experiment introduces `WorkspaceBatchCompileOnDataOwner`. The data-owner worker manually creates Node worker threads, sends source files to them, waits for every result, deserializes all results, merges them serially, and then terminates the threads.

This validates the broad idea of moving compilation orchestration closer to the data owner, but it has several structural issues:

1. Worker threads are created and destroyed for each request.
2. The threads are managed manually rather than through Effect Worker.
3. Compilation and thread startup occur inside `dataOwnerWrite`, monopolizing the serial write fiber.
4. All compilation results are retained before any merge occurs.
5. Compile requests are started with unbounded concurrency.
6. Manual round-robin assignment does not represent worker availability.
7. Worker failure can leave pending promises unresolved.
8. Interruption and failure do not guarantee worker cleanup.
9. The implementation is embedded in the general LSP worker entry point and exits that path using a thrown string.
10. The implementation depends directly on Node APIs.
11. `threadCount`, `concurrency`, and the existing compilation-pool settings describe overlapping or misleading concepts.
12. The direct path must explicitly preserve raw-document ingestion and version validation.

## Target Architecture

```text
LSP client
    |
    v
Coordinator / LCSAdapter
    |
    v
Data-owner worker
    |
    |-- authoritative document storage
    |-- authoritative public-API symbol graph
    |-- serial graph commit queue
    |
    `-- Effect SerializedWorkerPool
          |-- compiler worker 1
          |-- compiler worker 2
          |-- compiler worker 3
          `-- compiler worker N
```

The data owner owns the compilation pool's scope and orchestration. Effect owns the backing worker lifecycle and scheduling. Compilation workers parse source and return serialized results; they never mutate or directly access the authoritative graph.

## Core Invariant

Compilation must not execute while holding the data-owner write fiber.

The required flow is:

```text
receive compile request
    |
    |-- validate source/session/version
    |-- compile through Effect worker pool       outside write fiber
    |
    `-- dataOwnerWrite(commit result)             short critical section
```

The serial commit section should do only the following:

1. Revalidate the document version and workspace-load generation.
2. Deserialize or reconstitute the returned symbol table.
3. Call `ApexSymbolManager.addSymbolTable`.
4. Resolve the document's symbol-readiness latch.
5. Record the compilation outcome and metrics.

## Compilation Worker Protocol

### Request

Define a platform-neutral tagged request for one Apex file. Workspace batching belongs to the orchestration layer, not to the compiler worker.

```ts
class CompileApexFile extends Schema.TaggedRequest<CompileApexFile>()(
  'CompileApexFile',
  {
    payload: {
      uri: Schema.String,
      content: Schema.String,
      version: Schema.Number,
      detailLevel: DetailLevelSchema,
      collectReferences: Schema.Boolean,
      traceContext: Schema.optional(Schema.String),
    },
    success: SerializedCompilationResultSchema,
    failure: CompileApexFileErrorSchema,
  },
) {}
```

The exact Effect Schema syntax should follow the repository's installed Effect version and existing wire-schema conventions.

### Result

Return a deliberately defined wire DTO rather than a `SymbolTable` class instance:

```ts
interface SerializedCompilationResult {
  uri: string;
  version: number;
  symbols: SerializedSymbol[];
  references: SerializedReference[];
  hierarchicalReferences: SerializedHierarchicalReference[];
  metadata: SerializedSymbolTableMetadata;
  parserDiagnostics: SerializedParserDiagnostic[];
  metrics: {
    compileMs: number;
    serializeMs: number;
    symbolCount: number;
    referenceCount: number;
    payloadSizeBytes: number;
  };
}
```

The first implementation may use structured cloning. Transferable buffers can be evaluated later if profiling shows serialization or copying to be material.

### Failure model

Distinguish source diagnostics from infrastructure failures:

- Syntax and semantic parser errors are successful compilation results containing diagnostics.
- Worker startup failure, worker termination, schema failure, missing bundles, and unexpected compiler exceptions are typed infrastructure failures.
- A stale document version is a typed rejected-commit outcome, not a compilation failure.

## Compilation Worker Entrypoints

Extract the compilation logic into a shared handler with platform-specific runners:

```text
compiler.worker.shared.ts
    |-- request schema
    |-- compilation handler
    `-- result serialization

compiler.worker.node.ts
    `-- NodeWorkerRunner + shared handler

compiler.worker.web.ts
    `-- BrowserWorkerRunner + shared handler
```

The shared handler must not import `node:worker_threads`, use `workerData`, inspect `__dirname`, or contain platform-specific startup behavior.

The dedicated entrypoints replace the current `compileThreadMode` branch and its thrown-string early exit.

## Effect Worker Pool Ownership

The data-owner service bootstrap should allocate one scoped, persistent serialized worker pool:

```ts
Worker.makePoolSerialized<CompilationWorkerRequest>({
  size: compilationPoolSize,
  concurrency: compilationConcurrency,
  initialMessage: () =>
    new InitializeCompilationWorker({
      serverMode,
      logLevel,
      projectNamespace,
    }),
  onCreate: warmAndVerifyCompilationWorker,
});
```

The pool's scope must match the data-owner worker's lifetime. Effect is responsible for worker leasing, request scheduling, interruption propagation, and disposal.

`onCreate` should verify initialization and perform any required warmup before the language server reports the topology as ready.

## Platform Layers

Keep pool orchestration platform-neutral and provide only the spawner layer differently:

```text
CompilationPool service
    |
    |-- NodeCompilationWorkerLayer
    |     `-- Node worker_threads-backed Effect Worker
    |
    `-- BrowserCompilationWorkerLayer
          `-- Web Worker/MessagePort-backed Effect Worker
```

### Node implementation

The first implementation may resolve the dedicated compiler-worker bundle using Node path facilities inside the Node platform layer. No Node import should escape that layer.

### Browser implementation

The browser data-owner worker needs a resolvable compiler-worker URL. Extend worker initialization with an optional platform configuration value such as:

```ts
compilationWorkerUrl?: string;
```

The existing browser worker URL and Blob handling should be factored into a reusable spawner rather than reimplemented in compilation orchestration.

If nested Web Workers cannot be created in a supported browser host, initialization of the selected topology must fail explicitly. It must not silently switch to coordinator-local compilation.

## Workspace-Load Orchestration

Workspace load should be modeled as an explicit session state machine:

```text
Receiving
    -> Ingesting
    -> Compiling
    -> Committing
    -> Draining
    -> Complete

Any state
    -> Failed
```

### Required sequence

1. Receive and validate all client batches.
2. Begin the data-owner workspace-load session.
3. Store raw documents in authoritative data-owner storage.
4. Submit individual public-API compilation requests with bounded concurrency.
5. Commit each result through `dataOwnerWrite` as soon as it completes.
6. Wait until every requested file has reached a terminal compile-and-commit outcome.
7. Drain deferred supertype resolution.
8. Mark the workspace loaded and publish completion.

The session must not report completion until both compilation and graph commit are complete for every accepted file.

### Bounded result processing

Do not collect the whole workspace's serialized results before merging. A suitable initial shape is:

```ts
Effect.forEach(
  entries,
  (entry) =>
    Effect.gen(function* () {
      const result = yield* compilationPool.executeEffect(
        new CompileApexFile(toCompileRequest(entry)),
      );

      yield* dataOwnerWrite(commitCompilationResult(result));
    }),
  { concurrency: compilationPoolSize },
);
```

The implementation uses a bounded Effect Queue between compilation and commit. Its initial capacity is four completed results per compilation worker (eight with the default two-worker pool), which lets fast files enter the commit queue without retaining the whole workspace. Queue spans record high-water mark, full-buffer offer count and wait time, and empty-buffer take count and wait time so later tuning is driven by observed backpressure.

Completion-order commits are acceptable during workspace load because ordinary cross-file resolution is deferred. If tests expose an ordering dependency, add a small ordered-result buffer rather than retaining the entire workspace.

## Interactive Compilation

After workspace-load parity is established, route interactive compilation through the same persistent pool:

- `didOpen` and `didChange` compilation.
- Request prerequisite compilation.
- Public, protected, private, or full-detail enrichment as required.

The pool should accept individual file jobs with scheduling priority applied before submission:

```text
Immediate: active editor compilation
High:      LSP request prerequisite
Low:       workspace preload
```

Workspace loading must not make every compilation worker unavailable to an active editor indefinitely. The first implementation may use the existing priority scheduler to control submission. A separate reserved interactive worker should be considered only if priority scheduling is insufficient.

## Explicit Topology Selection

Replace runtime fallback chains with an explicit configuration mode:

```ts
type CompilationTopology =
  'disabled' | 'legacy-coordinator-pool' | 'data-owner-managed-pool';
```

During development, both implementations may coexist behind explicit selection. They must not automatically substitute for one another after initialization begins.

When `data-owner-managed-pool` is selected:

1. Pool creation failure fails worker-topology initialization.
2. Compiler-worker initialization failure fails worker-topology initialization.
3. Workspace compilation infrastructure failure fails the workspace-load session.
4. Failure is reported through the existing workspace-load failure channel.
5. The server does not silently compile on the coordinator or data-owner main thread.

A bounded retry of a pure compilation request after an actual worker termination may be added as an explicit retry policy. It is not a change of topology and must be observable through metrics. Start with no retry until failure behavior is tested.

## Configuration

Use names that distinguish parallel workers from request concurrency:

```json
{
  "workers": {
    "compilation": {
      "topology": "data-owner-managed-pool",
      "poolSize": 4,
      "concurrency": 1
    },
    "dataOwner": {
      "requestConcurrency": 10
    }
  }
}
```

`compilation.poolSize` and `compilation.concurrency` already exist in shared settings and the VS Code configuration. The data-owner-managed pool must consume both directly; documentation must make clear that only `poolSize` adds parsing threads.

Use `1` as the default concurrency because Apex compilation is synchronous CPU work. Keep the setting available as an Effect Worker admission/multiplexing control, and validate values above `1` with measurements rather than treating them as additional CPU parallelism.

Use `2` as the default compilation pool size to provide CPU-parallel parsing without making the initial per-workspace memory cost overly aggressive.

A reasonable initial automatic worker count is:

```text
max(1, min(4, availableParallelism - 1))
```

The exact default should be validated against memory consumption because each worker loads the parser, compiler code, and supporting indexes. Browser defaults may need to be lower than Node defaults.

## Versioning and Correctness

Every compilation request and result must carry:

- URI.
- Document version.
- Workspace-load session or generation identifier where applicable.
- Requested detail level.

The data owner must revalidate these values inside the serial commit section. A result must be rejected when:

- A newer document version is authoritative.
- The workspace-load session has been replaced or failed.
- The requested detail level would regress an already committed table for the same version.

Interactive compilation should continue using symbol-readiness latches. A latch is armed when compilation is scheduled and resolved only after the corresponding graph commit succeeds or reaches a terminal rejected state.

## Backpressure and Cancellation

1. Pool submission must be bounded by `compilation.poolSize` or another small multiple of it.
2. A cancelled or failed workspace-load session should interrupt outstanding compilation effects.
3. Results arriving after cancellation must fail generation validation and must not mutate the graph.
4. Data-owner shutdown must close the pool scope and terminate all backing workers.
5. Large source and result payloads must not accumulate in an unbounded queue.

## Observability

Add spans or metrics for:

- Pool creation and warmup.
- Worker count and per-worker concurrency.
- Queue wait time before worker acquisition.
- Compile time.
- Serialization time.
- Result payload size.
- Commit queue wait time.
- Deserialization/reconstitution time.
- Symbol graph merge time.
- Version/session rejection count.
- Worker crash and interruption count.
- Workspace session totals and critical-path duration.

Avoid labeling the full `UpdateSymbolSubset` duration as transport overhead. It currently includes queue wait and data-owner processing. Measure transport, queue wait, and commit work separately before comparing architectures.

## Implementation Phases

### Phase 1: Protocol and shared compiler handler

1. Define `CompileApexFile`, initialization, success, and failure schemas.
2. Define the serialized symbol-table DTO explicitly.
3. Extract public-API compilation from `worker.platform.shared.ts` into a reusable handler.
4. Add unit tests for schema round trips and result reconstruction.

**Exit criteria:** A compilation request can be executed in-process against the shared handler and reconstructed into an equivalent `SymbolTable`.

### Phase 2: Dedicated Node Effect Worker

1. Add a dedicated Node compiler-worker entrypoint.
2. Launch it with `NodeWorkerRunner` and the shared handler.
3. Add the compiler-worker bundle to the Apex LS build.
4. Add a Node integration test that starts one Effect worker and compiles a file.
5. Remove the `compileThreadMode` startup branch from the general worker entrypoint.

**Exit criteria:** One dedicated Node Effect worker compiles Apex and exits cleanly under scope finalization.

### Phase 3: Persistent data-owner-managed pool

1. Add a compilation-pool service to data-owner bootstrap.
2. Create a fixed Effect serialized pool with `size: compilation.poolSize` and `concurrency: compilation.concurrency`.
3. Warm and verify all workers during topology initialization.
4. Ensure pool scope is tied to data-owner lifetime.
5. Add worker creation, interruption, crash, and shutdown tests.

**Exit criteria:** The data owner owns a persistent pool of `N` Effect workers, and profiling demonstrates up to `N` CPU-parallel compilations.

### Phase 4: Workspace-load integration

1. Preserve raw-document ingestion as a required step.
2. Move compilation outside `dataOwnerWrite`.
3. Commit each completed result through a short `dataOwnerWrite` operation.
4. Add session and version validation at commit time.
5. Drain deferred supertype resolution only after all commits finish.
6. Report infrastructure failures without runtime topology fallback.
7. Remove `WorkspaceBatchCompileOnDataOwner` manual thread management.

**Exit criteria:** Workspace load completes through the Effect-managed pool with correct graph contents, bounded memory, and no manual worker-thread lifecycle code.

### Phase 5: Browser implementation

1. Add the dedicated browser compiler-worker entrypoint.
2. Supply the browser Effect Worker spawner layer to the data owner.
3. Pass or derive a valid compiler-worker URL during worker initialization.
4. Validate Blob URL, CSP, nested-worker, and MessagePort behavior in the supported VS Code web host.
5. Run the same protocol and correctness suite in browser tests.

**Exit criteria:** The browser uses the same compilation protocol and data-owner orchestration without Node-specific imports or coordinator-local fallback.

### Phase 6: Interactive compilation

1. Route `didOpen`, `didChange`, and `didSave` compilation through the same pool.
2. Preserve storage-before-compilation ordering.
3. Preserve readiness-latch behavior.
4. Prioritize active-editor work over background workspace work.
5. Remove the old top-level compilation worker after parity is demonstrated. **Complete.**

**Exit criteria:** Workspace and interactive compilation use one pool without regressing cold-open correctness or editor responsiveness.

### Phase 7: Performance tuning

1. Compare worker counts against elapsed time and peak memory.
2. Measure compile, serialization, transfer, commit queue, and merge costs independently.
3. Evaluate transferable buffers only if result transport is material.
4. Tune worker-count defaults separately for Node and browser if necessary.
5. Consider retry policy only after worker-failure behavior is characterized.

**Exit criteria:** Defaults are supported by repeatable profiling rather than estimates.

## Test Plan

### Protocol tests

- Request and result schema round trips.
- Parser diagnostics survive serialization.
- References, hierarchical references, metadata, and detail levels reconstruct correctly.
- Typed infrastructure failures decode correctly.

### Pool tests

- Configured worker count is created.
- `concurrency: 1` prevents overlapping jobs within a single worker.
- Multiple workers execute CPU work in parallel.
- Scope closure terminates every worker.
- Worker startup failure fails pool initialization.
- Worker termination fails or interrupts the owning request without hanging.

### Workspace-load correctness tests

- Every ingested file reaches a terminal compile-and-commit outcome.
- Public-API symbols are queryable after completion.
- Same-file reference edges are present.
- Deferred supertype edges are drained before completion.
- Ordinary cross-file references remain available through on-demand resolution.
- Stale and wrong-session results cannot mutate the graph.
- Workspace failure cannot leave the data owner in an active load session.

### Responsiveness tests

- Data-owner reads proceed while background compilation is running.
- An interactive compile can overtake queued workspace work.
- Graph writes remain serialized.
- One slow compile does not retain all other completed results in memory.

### Cross-platform tests

- Shared handler suite runs in Node and browser.
- Node runner has no browser dependencies.
- Browser runner has no Node dependencies.
- Browser worker URL initialization succeeds in the supported VS Code web environment.

## Performance Acceptance Criteria

Compare against the same workspace, machine, extension configuration, cache state, and open-editor state.

At minimum, capture:

1. Total workspace-load critical-path duration.
2. Files compiled per second.
3. Peak heap for the data owner and each compiler worker.
4. Compilation pool queue wait.
5. Mean and p95 compile time.
6. Mean and p95 commit queue wait.
7. Mean and p95 graph merge time.
8. Interactive compile latency during workspace load.
9. Worker initialization and warmup duration.
10. Failure and stale-result counts.

The experiment is successful when it demonstrates real multi-worker parsing, improves the workspace-load critical path, keeps interactive latency acceptable, and does not shift the dominant cost into serialization, memory pressure, or the serial graph commit queue.

## Removal Checklist

After the new topology reaches parity:

- Remove `WorkspaceBatchCompileOnDataOwner`.
- Remove manual `worker_threads` creation and pending-promise bookkeeping.
- Remove `compileThreadMode` and its thrown-string exit.
- Remove `threadCount` terminology.
- Remove silent workspace compilation fallback branches.
- [x] Remove the old top-level compilation worker topology after interactive compilation migrates.
- Remove obsolete settings and compatibility aliases after the planned deprecation period.
- Update topology documentation and diagrams.

## Key Decision

The data owner owns compilation orchestration, Effect owns the compilation workers, and only graph commits—not compilation or worker waits—enter the data owner's serial write fiber.
