# ADR: Effect Worker Topology for Apex Language Server

**Status:** Accepted  
**Date:** 2026-04-13

## Context

The Apex language server runs as a single-threaded Node.js process (or web worker in browser environments). As workspace sizes grow, CPU-bound operations—parsing, symbol resolution, hover/definition lookups—block the coordinator thread and degrade responsiveness. The server already has a priority queue (`LSPQueueManager`) that serializes logical concurrency, but all processing occurs on one thread.

## Decision

Introduce an internal worker topology using `@effect/platform` Worker primitives, hidden behind the existing LSP transport. The language client sees no change; workers are internal to the LS process.

### Topology

| Role | Count | Responsibility |
|------|-------|----------------|
| **Data-owner** | 1 | Owns `ApexStorageManager`, processes document lifecycle (open/change/save/close), workspace batch ingestion, `QuerySymbolSubset` |
| **Enrichment pool** | M (configurable, default 2) | Stateless query handlers: hover, definition, references, implementation, documentSymbol, codeLens, diagnostics |
| **Resource-loader** | 0–1 (configurable) | Stdlib/library loading via `ResourceLoaderService` proxy |

### Wire contract: Option B (Schema-tagged requests)

Requests between coordinator and workers use `@effect/schema` tagged request/response classes (`DispatchHover`, `DispatchDocumentOpen`, `WorkspaceBatchIngest`, etc.) defined in `apex-lsp-shared/workerWireSchemas.ts`. This gives:

- Type-safe serialization with automatic codec generation
- Versioned protocol (`WIRE_PROTOCOL_VERSION`) for forward compatibility
- JSON round-trip safety (no structured-clone hazards)

### Sole-entry invariant

All LSP requests enter through `LSPQueueManager` → priority scheduling → dispatch. There is no bypass path. The `WorkerTopologyDispatcher` (or `TransportTopologyDispatcher`) is invoked by the queue manager after priority scheduling, never directly by connection handlers.

Queue bypass paths identified in Step 4.5 were eliminated. Every request flows:

```
Connection handler → LSPQueueManager.enqueue() → priority dequeue → dispatch
```

### Coordinator-only exceptions

Three request types remain on the coordinator thread and are **not** dispatched to workers:

- `completion` — requires stateful session context
- `signatureHelp` — coupled to completion session
- `rename` — requires cross-file coordination

All other request types are dispatchable. The `canDispatch()` gate enforces this.

### Prerequisite atomicity

Document lifecycle mutations (open/change/save/close) route to the single data-owner worker, ensuring serial mutation order. Enrichment queries are stateless reads dispatched to the pool, allowing parallel execution.

### Transport isolation (Step 12)

The `WorkerTopologyTransport` interface abstracts spawn/send/dispatch/shutdown behind opaque `WorkerHandle`/`PoolHandle` types. The only concrete implementation is `EffectPlatformWorkerTransport` (wraps `@effect/platform`). A `MockWorkerTransport` exists for unit testing without real threads.

Domain logic depends on the interface; only the adapter imports `@effect/platform` Worker APIs.

### Priority-vs-dispatch composition

Priority scheduling and worker dispatch are orthogonal:

- **Priority queue** controls *when* a request runs (starvation relief, concurrency limits)
- **Worker dispatch** controls *where* it runs (coordinator vs. worker thread)

The dispatcher is a strategy injected into the queue manager. When workers are disabled, the queue manager falls back to in-process execution.

## Settings

```
apex.experimental.workers.enabled: boolean    (default: false)
apex.experimental.workers.poolSize: number    (default: 2, min: 1, max: cpus-2)
apex.experimental.workers.resourceLoader: boolean (default: true)
```

These are distinct from:
- `apex.queueProcessing.maxConcurrency` — logical concurrency per priority level
- `apex.loadWorkspace.*` — workspace file batch loading tuning
- `apex.resources.loadMode` — stdlib lazy/full loading mode

## Consequences

**Positive:**
- CPU-bound enrichment queries no longer block document lifecycle processing
- Workspace batch ingestion runs on the data-owner worker, freeing the coordinator
- Transport interface allows future migration away from `@effect/platform` if needed
- Settings are experimental and off by default — no risk to existing users

**Negative:**
- Memory overhead: each worker loads its own service instances
- Complexity: worker bootstrap, wire protocol, and transport abstraction layers
- Enrichment workers need symbol data via `QuerySymbolSubset` from data-owner (extra IPC hop)

## References

- Plan: `.cursor/plans/effect_workers_in_apex_af5a4415.plan.md`
- Wire schemas: `packages/apex-lsp-shared/src/workerWireSchemas.ts`
- Transport interface: `packages/lsp-compliant-services/src/workers/WorkerTransport.ts`
- Coordinator: `packages/apex-ls/src/server/WorkerCoordinator.ts`
- Worker entry: `packages/apex-ls/src/worker.platform.ts`
