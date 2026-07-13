# Apex LS Worker Topology

The multi-worker runtime behind the Apex language server. Requests are dispatched
across role-specialized workers over a message-port protocol.

## Language

**Request-pool worker**:
The stateless worker that receives a dispatched LSP request (e.g. references),
assembles a partial local symbol graph, and computes the result. Log prefix
`apex-worker-lspRequest`; dispatch target `requestPool`.
_Avoid_: enrichment worker, pool worker, lspRequest worker

**Data-owner worker**:
The single stateful worker that owns the authoritative workspace graph at
public-api detail (method bodies stripped) plus all raw file content, and never
evicts. Serves dependent-discovery (`dataOwner:ResolveDependentUris`) and
symbol-fetch requests. All its work runs on one serial fiber (reads drained,
then one write), so heavy compute must not run here. Log prefix
`apex-worker-dataOwner`; assistance namespace `dataOwner:`.
_Avoid_: graph owner, symbol store

**Serial fiber**:
The data-owner's single processing loop that handles queued read/write items one
at a time. Any operation blocking it stalls every other data-owner request.

**Coordinator**:
The extension-host-side component that owns the request queue (priority +
timeout), dispatches LSP requests to workers over the wire, and mediates
assistance calls between workers and the LSP client. Runs in the extension host
process (not a worker thread) and has disk access.
_Avoid_: host, dispatcher, mediator

**Worker boundary**:
The process/thread split between the coordinator (extension host process) and
the workers (each on its own thread), crossed by message-port wire protocol.
Requests go coordinator→worker; assistance calls go worker→coordinator.

**Log reachability (worker → output channel)**:
From a worker, only two log paths reach the coordinator output channel: (1)
Effect logs (`Effect.logInfo` etc.) run under the replaced `workerLogger`
layer, and (2) `emitWorkerLog(level, msg)`, which posts a `WorkerLogMessage`
directly over the assistance port from any context. Plain `getLogger()` calls in
an async handler, and `Effect.logInfo` run under an ad-hoc `Effect.runPromise`
(default logger), do NOT reach the channel. Use `emitWorkerLog` for diagnostics
in async handlers.

## Dependent discovery

**In-body caller**:
A file that calls the target symbol only inside a method body. Invisible in the
public-api graph (bodies stripped), so it can only be found by content-prefilter.

**Graph-walk discovery**:
Finding callers via `findReferencesTo` over the public-api reverse index. Only
surfaces edges that survive body-stripping (type/supertype/signature); misses
in-body callers. For find-references this is insufficient by design — slated for
removal in favor of workspace-wide content-prefilter.

**Content-prefilter discovery**:
Finding callers by word-boundary regex (`\bsymbolName\b`) over raw stored file
content. The only source that surfaces in-body callers.

**Full-detail recompile**:
Compiling a discovered caller at full detail and ingesting it (`addSymbolTable`)
so its in-body `METHOD_CALL` edges enter the graph and count as references. The
data-owner ships each caller's raw content so the request-pool worker can do
this. Distinct from discovery (which files call the target) — this materializes
those callers' in-body edges.

## Reference resolution

**Reference resolution**:
The final step (`ReferencesProcessingService.processReferences`): map cursor
position → target symbol, enumerate references to it from the populated reverse
index. Runs after discovery + full-detail recompile.

**Self reference**:
The declaration site of the target symbol. Included as a location when
`context.includeDeclaration` is set, so N genuine call-site references return as
N+1 locations (e.g. 3 references to `geocodeAddresses` → 4 locations).
