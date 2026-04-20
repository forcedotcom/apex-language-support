---
name: language-server-architecture
description: Apex Language Server data architecture — type sources, worker topology, and data ownership. Use when working on type resolution, worker communication, resource loading, hover, definition, diagnostics, or any code in apex-ls/src/server/ or apex-parser-ast/src/symbols/.
---

# Language Server Architecture

## Three Sources of Apex Types

The language server works with three distinct sources of Apex type artifacts:

### 1. Workspace (customer code)
- `.cls`, `.trigger`, `.apex` files authored by the user
- Managed by the **data owner worker** via didOpen/didChange/didSave
- Compiled on-demand by the parser; symbols registered in the symbol graph

### 2. Faux SObject classes
- Files representing fields found in SObjects (Account, Contact, Property__c, etc.)
- Produced by an **external process outside this repository** at the user's request
- Placed at a well-known path in the workspace (`.sfdx/tools/`)
- Presented to the language server using the same document operations as customer code
- Their URI comes from a path the language server controls
- **NOT part of the standard Apex library** — do not confuse with stdlib

### 3. Standard Apex Library (stdlib)
- System.String, System.Assert, Database.QueryLocator, ConnectApi.*, etc.
- Owned exclusively by the **resource loader worker**
- Backed by three read-only precompiled artifacts in `apex-parser-ast/resources/`:
  - `apex-type-registry.pb.gz` — protobuf metadata about stdlib symbols (6112 types, 59 namespaces)
  - `apex-stdlib.pb.gz` — precompiled symbol data
  - `StandardApexLibrary.zip` — source `.cls` files for stdlib classes
- All access to these artifacts MUST go through the resource loader worker

## Worker Topology

```
Coordinator (main thread)
├── Data owner worker      — owns symbol tables for workspace + faux SObject files
├── Enrichment workers (2+) — handle hover, definition, diagnostics
└── Resource loader worker — owns standard Apex library (read-only)
```

### Data owner worker
- Single worker, source of truth for customer code and faux SObject class symbols
- Receives document lifecycle events (open, change, save, close)
- Serves symbol data to enrichment workers via QuerySymbolSubset
- Accepts write-backs of enriched symbols from enrichment workers

### Enrichment workers
- Pool of workers for parallel LSP request processing
- Get file symbols from data owner, process requests, write back enriched data
- Access stdlib via remote ResourceLoaderService layer (assistance channel → coordinator → resource loader worker)
- Do NOT have local copies of protobuf caches, stdlib ZIP, or GlobalTypeRegistry
- The sync namespace cache (populated during stdlib warmup) is the only local stdlib state

### Resource loader worker
- Single worker, owns all standard Apex library data
- Loads and serves stdlib symbol tables, resolves class FQNs, provides namespace index
- All stdlib access from other workers routes through this worker

## GlobalTypeRegistry

Defined in `apex-parser-ast/src/services/GlobalTypeRegistryService.ts`.

GlobalTypeRegistry is an **in-process, mutable type index** — NOT just a stdlib cache. It tracks types from ALL three sources as they are compiled and registered:

- Stdlib types registered at startup via `ResourceLoader.initializeTypeRegistry()` (`isStdlib: true`)
- User types registered via `ApexSymbolManager.addSymbolTable()` (`isStdlib: false`)
- Provides O(1) cross-file type resolution via `resolveType()`

It is a **module-level singleton** (`globalRegistryInstance`). Each Node.js process gets its own instance:
- **Coordinator process**: populated with stdlib + user types as files are compiled
- **Enrichment workers**: EMPTY — enrichment workers don't compile files or load protobuf caches

When modifying resolution code in `apex-parser-ast/src/symbols/ops/`:
- Code runs on BOTH coordinator and enrichment workers
- Do not remove GlobalTypeRegistry usage — it provides cross-file resolution on the coordinator
- Ensure enrichment worker fallback paths work correctly (they bypass the empty registry)

## LSP Request Routing (DISPATCH_ROUTING)

Defined in `apex-ls/src/server/WorkerCoordinator.ts`.

| Request | Target | Notes |
|---------|--------|-------|
| documentOpen/Change/Save/Close | dataOwner | Document lifecycle |
| hover | enrichmentPool | With write-back |
| definition | enrichmentPool | With write-back |
| diagnostics | enrichmentPool | With write-back |
| completion, references, etc. | coordinatorOnly | Not yet moved to workers |

## Worker Profiling & Debugging

Workers inherit profiling, debug, and heap-size flags from the main process via `WorkerExecArgvBuilder`. Key behaviors:

- **Profiling** (`apex.environment.profilingMode: "full"`): Workers get `--cpu-prof` / `--heap-prof` with role-specific subdirectories (e.g. `<output>/dataOwner/`)
- **Debug** (`apex.debug: "inspect"`): Workers get `--inspect=0` (auto-assigned port). The main process keeps its fixed port (default 6009).
- **Heap size**: `--max-old-space-size` passes through unchanged.
- **Thread naming**: Workers are named `apex-worker-<role>` (visible in Chrome DevTools).
- **Stderr forwarding**: Worker stderr is line-buffered and logged with role labels. Debug port assignments appear in the Output panel.

## Key Paths

- Worker entry: `packages/apex-ls/src/worker.platform.ts`
- Worker coordinator: `packages/apex-ls/src/server/WorkerCoordinator.ts`
- Worker execArgv builder: `packages/apex-ls/src/server/WorkerExecArgvBuilder.ts`
- Assistance mediator: `packages/apex-ls/src/server/CoordinatorAssistanceMediator.ts`
- Symbol resolution ops: `packages/apex-parser-ast/src/symbols/ops/`
- GlobalTypeRegistry: `packages/apex-parser-ast/src/services/GlobalTypeRegistryService.ts`
- Resource loader: `packages/apex-parser-ast/src/utils/resourceLoader.ts`
- Enrichment bootstrap: `packages/lsp-compliant-services/src/workers/WorkerBackendBootstrap.ts`
