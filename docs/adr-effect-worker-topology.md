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

## Profiling, Debugging, and Heap Size

The following settings apply to the main language server process. Workers automatically inherit these via `WorkerExecArgvBuilder`, which reads `process.execArgv` at spawn time and derives per-role flags.

### Profiling (`apex.environment.profilingMode`)

| Value | Behavior |
|-------|----------|
| `none` | Disabled (default) |
| `full` | Continuous profiling from startup via Node.js `--cpu-prof` / `--heap-prof` flags. Both the main process and all workers are profiled. |
| `interactive` | Manual start/stop via inspector API (desktop only). Currently coordinator-only. |

When `full` mode is active:
- `apex.environment.profilingType` selects `cpu`, `heap`, or `both`
- Profile output is written to the workspace root (or system temp)
- Worker profiles go into per-role subdirectories:

```
<output-dir>/
  CPU.<PID>.<TIMESTAMP>.cpuprofile          ← main process
  dataOwner/
    CPU.<PID>.<TIMESTAMP>.cpuprofile
  compilation/
    CPU.<PID>.<TIMESTAMP>.cpuprofile
  enrichmentSearch/
    CPU.<PID>.<TIMESTAMP>.cpuprofile        ← one per pool member
  resourceLoader/
    CPU.<PID>.<TIMESTAMP>.cpuprofile
```

Subdirectories are created automatically by `WorkerExecArgvBuilder`.

### Debugging (`apex.debug`, `apex.debugPort`)

| Setting | Effect |
|---------|--------|
| `apex.debug: "off"` | No debug flags (default) |
| `apex.debug: "inspect"` | Main process: `--inspect=<port>` (default 6009). Workers: `--inspect=0` (auto-assigned port). |
| `apex.debug: "inspect-brk"` | Main process: `--inspect-brk=<port>`. Workers: `--inspect=0` (no brk — workers should not pause on start). |
| `apex.debugPort` | Port for the main process only (default: 6009). Workers always use port 0. |

Auto-assigned worker debug ports are logged to the Output panel with role labels (e.g. `[apex-worker-dataOwner] Debugger listening on ws://127.0.0.1:9230/...`). Workers are named `apex-worker-<role>` and appear with that name in Chrome DevTools and VS Code debugger.

### Heap size (`apex.environment.jsHeapSizeGB`)

The `--max-old-space-size` flag is passed through to workers unchanged. All workers get the same heap limit as the main process.

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
