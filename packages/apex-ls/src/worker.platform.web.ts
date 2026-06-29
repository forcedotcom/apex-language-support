/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser worker entry point — mirror of worker.platform.ts.
 *
 * Bootstrapped via a WorkerPortsInit message on `self` (posted by the
 * coordinator before Effect starts). Two MessagePorts are received:
 *   effectPort — Effect protocol channel (BrowserWorkerRunner.layerMessagePort)
 *   assistPort — side-channel for logs and assistance RPC
 * Effect never touches `self`, so no message-collision risk.
 * Polyfills match webWorkerServer.ts (process, Buffer, global).
 *
 * Kept as a standalone file (no local imports) so each esbuild entry
 * bundles independently without cross-file resolution issues.
 */

// Polyfills — must execute before any library code
import process from 'process';
import { Buffer } from 'buffer';

(globalThis as any).process = process;
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import {
  Effect,
  Layer,
  Logger,
  LogLevel,
  Schema,
  Queue,
  Deferred,
} from 'effect';
import {
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  CompileDocument,
  WorkspaceBatchCompile,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  isAllowedTag,
  WIRE_PROTOCOL_VERSION,
  ApexCapabilitiesManager,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import {
  isAssistanceResponse,
  type WorkerRole,
  type WorkerLogMessage,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// ---------------------------------------------------------------------------

const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  CompileDocument,
  WorkspaceBatchCompile,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
);

// ---------------------------------------------------------------------------
// Minimal document interface
// ---------------------------------------------------------------------------

interface WorkerDocument {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  getText(): string;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function cloneForWire<T>(value: T): T | null {
  return value != null ? JSON.parse(JSON.stringify(value)) : null;
}

// ---------------------------------------------------------------------------
// Role state & guard
// ---------------------------------------------------------------------------

let assignedRole: WorkerRole | null = null;

const guardRole = (tag: string): Effect.Effect<void> => {
  if (assignedRole === null) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: no role assigned yet, cannot handle '${tag}'`,
      ),
    );
  }
  if (!isAllowedTag(assignedRole, tag)) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: tag '${tag}' not allowed for role '${assignedRole}'`,
      ),
    );
  }
  return Effect.void;
};

// ---------------------------------------------------------------------------
// Worker ID (no process.pid in browser)
// ---------------------------------------------------------------------------

let workerIdCounter = 0;
const workerId = `worker-web-${Date.now()}-${++workerIdCounter}`;

// ---------------------------------------------------------------------------
// Write-back metrics
// ---------------------------------------------------------------------------

interface WriteBackMetrics {
  attempted: number;
  accepted: number;
  rejectedVersionMismatch: number;
  rejectedDocumentMissing: number;
  rejectedDetailLevel: number;
  totalSymbolsMerged: number;
}

const writeBackMetrics: WriteBackMetrics = {
  attempted: 0,
  accepted: 0,
  rejectedVersionMismatch: 0,
  rejectedDocumentMissing: 0,
  rejectedDetailLevel: 0,
  totalSymbolsMerged: 0,
};

// ---------------------------------------------------------------------------
// Data-owner internal tiered queue (reads > writes)
// ---------------------------------------------------------------------------

interface DOQueueItem {
  readonly eff: Effect.Effect<unknown, unknown>;
  readonly deferred: Deferred.Deferred<unknown, unknown>;
}

interface DOQueues {
  readonly read: Queue.Queue<DOQueueItem>;
  readonly write: Queue.Queue<DOQueueItem>;
}

const processItem = (item: DOQueueItem) =>
  Effect.gen(function* () {
    const result = yield* Effect.either(item.eff);
    if (result._tag === 'Right') {
      yield* Deferred.succeed(item.deferred, result.right);
    } else {
      yield* Deferred.fail(item.deferred, result.left);
    }
  });

const initDataOwnerQueues: Effect.Effect<DOQueues> = Effect.cached(
  Effect.gen(function* () {
    const read = yield* Queue.unbounded<DOQueueItem>();
    const write = yield* Queue.unbounded<DOQueueItem>();

    const loop = Effect.forever(
      Effect.gen(function* () {
        const reads = yield* Queue.takeAll(read);
        const readItems = Array.from(reads);
        for (const item of readItems) {
          yield* processItem(item);
        }

        const writeChunk = yield* Queue.takeUpTo(write, 1);
        const writeItems = Array.from(writeChunk);
        for (const item of writeItems) {
          yield* processItem(item);
        }

        if (readItems.length === 0 && writeItems.length === 0) {
          yield* Effect.sleep('1 millis');
        }
      }),
    );

    yield* Effect.forkDaemon(loop);
    return { read, write } satisfies DOQueues;
  }),
).pipe(Effect.runSync);

const dataOwnerRead = <A, E>(eff: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    yield* Queue.offer(queues.read, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
    });
    return yield* Deferred.await(deferred);
  });

const dataOwnerWrite = <A, E>(eff: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    yield* Queue.offer(queues.write, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
    });
    return yield* Deferred.await(deferred);
  });

// ---------------------------------------------------------------------------
// Symbol-readiness latches (data-owner role) — browser counterpart of the
// Node worker's latches. See worker.platform.ts for the full rationale.
//
// A documentOpen/Change arms a per-URI latch at the incoming version (inside
// the serial WRITE handler, so it is ordered before the compile it triggers),
// and UpdateSymbolSubset resolves it the instant the write-back for that
// version merges. The AwaitSymbolReadiness handler peeks the latch through the
// serial runner (non-blocking) and awaits the Deferred on its own fiber — never
// inside the runner, which would self-deadlock against the resolving write.
// ---------------------------------------------------------------------------

interface ReadinessLatch {
  /** Editor version this latch is satisfied at. */
  version: number;
  /** Resolves (void) when a write-back for `version` merges. */
  deferred: Deferred.Deferred<void, never>;
  /** Idempotency guard so success/clear settle at most once. */
  settled: boolean;
}

const readinessLatches = new Map<string, ReadinessLatch>();

/**
 * Arm (or re-arm) the readiness latch for a URI at a given version. A newer
 * version supersedes an unsettled older latch: the old Deferred is resolved so
 * any awaiter for the stale version stops waiting and re-evaluates.
 */
function armReadiness(uri: string, version: number): void {
  const existing = readinessLatches.get(uri);
  if (existing && existing.version === version) {
    return; // already armed for this exact version
  }
  if (existing && !existing.settled) {
    existing.settled = true;
    Effect.runSync(Deferred.succeed(existing.deferred, undefined));
  }
  readinessLatches.set(uri, {
    version,
    deferred: Effect.runSync(Deferred.make<void, never>()),
    settled: false,
  });
}

/**
 * Resolve the readiness latch for a URI once a write-back for `version` merges.
 * No-op if the latch was superseded by a newer version.
 */
function resolveReadiness(uri: string, version: number): void {
  const latch = readinessLatches.get(uri);
  if (latch && latch.version === version && !latch.settled) {
    latch.settled = true;
    Effect.runSync(Deferred.succeed(latch.deferred, undefined));
  }
}

/** Drop a URI's latch on close, releasing any awaiter. */
function clearReadiness(uri: string): void {
  const latch = readinessLatches.get(uri);
  if (latch && !latch.settled) {
    latch.settled = true;
    Effect.runSync(Deferred.succeed(latch.deferred, undefined));
  }
  readinessLatches.delete(uri);
}

/**
 * Whether the symbols currently in the graph for `uri` are CURRENT for what an
 * AwaitSymbolReadiness caller is waiting on. Used by both the initial peek and
 * the post-wake re-peek so they cannot drift.
 *
 * `hasSymbols` is whether a symbol table is present at all. `reqVersion < 0`
 * means "match the LATEST armed version" (the coordinator gate, whose
 * triggering request carries no version).
 *
 * A present table is current only if the MERGED version (DocumentStateCache's
 * documentVersion, bumped solely on an accepted write-back) has reached the
 * version we require:
 *   - no latch armed ⇒ nothing is compiling, any present table is current;
 *   - latch armed ⇒ require mergedVersion ≥ latch.version (matchLatest) or
 *     ≥ max(reqVersion, latch.version) (explicit).
 * Critically this does NOT trust latch.settled: a latch also settles on a
 * REJECTED or SUPERSEDED write-back that merged nothing, leaving the prior
 * version's symbols in the graph — reporting those as ready is a stale read.
 */
function symbolsAreCurrent(
  uri: string,
  reqVersion: number,
  hasSymbols: boolean,
): boolean {
  if (!hasSymbols) return false;
  const latch = readinessLatches.get(uri);
  if (!latch) return true;
  const mergedVersion =
    getDocumentStateCache().getCurrentState(uri)?.documentVersion ?? -1;
  const requiredVersion =
    reqVersion < 0 ? latch.version : Math.max(reqVersion, latch.version);
  return mergedVersion >= requiredVersion;
}

// ---------------------------------------------------------------------------
// Lazy role-specific service containers
// ---------------------------------------------------------------------------

import type { SerializedSymbolTableData } from '@salesforce/apex-lsp-parser-ast';
import type {
  DataOwnerServices,
  RequestServices,
} from '@salesforce/apex-lsp-compliant-services';
import { getDocumentStateCache } from '@salesforce/apex-lsp-compliant-services';

function getLayerOrderIndex(
  level: 'public-api' | 'protected' | 'private' | 'full',
): number {
  const order: Record<string, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };
  return order[level] || 0;
}

const ensureDataOwnerServices: Effect.Effect<DataOwnerServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { bootstrapDataOwnerServices } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const resourceLoaderLayer = yield* Effect.promise(() =>
          makeResourceLoaderRemoteLayer(),
        );
        const svc = yield* Effect.promise(() =>
          bootstrapDataOwnerServices(resourceLoaderLayer),
        );
        yield* Effect.logInfo('[DATA-OWNER] services bootstrapped');
        return svc;
      }),
    ),
  );

const ensureRequestServices: Effect.Effect<RequestServices> = Effect.runSync(
  Effect.cached(
    Effect.gen(function* () {
      const {
        bootstrapRequestServices,
        EnhancedMissingArtifactResolutionService,
      } = yield* Effect.promise(
        () => import('@salesforce/apex-lsp-compliant-services'),
      );
      const resourceLoaderLayer = yield* Effect.promise(() =>
        makeResourceLoaderRemoteLayer(),
      );
      const svc = yield* Effect.promise(() =>
        bootstrapRequestServices(resourceLoaderLayer),
      );

      EnhancedMissingArtifactResolutionService.setAssistanceProxy((params) =>
        requestCoordinatorAssistancePromise(
          'apex/findMissingArtifact',
          params,
          false,
        ),
      );

      yield* Effect.logInfo('[ENRICHMENT] services bootstrapped');
      return svc;
    }),
  ),
);

// ---------------------------------------------------------------------------
// Compilation services (lazy bootstrap)
// ---------------------------------------------------------------------------

interface CompilationServices {
  readonly compile: (
    content: string,
    uri: string,
  ) => {
    symbolTable: unknown;
    errors: unknown[];
  } | null;
}

const ensureCompilationServices: Effect.Effect<CompilationServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { CompilerService, VisibilitySymbolListener, SymbolTable } =
          yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
        const compilerService = new CompilerService();

        const compile = (content: string, uri: string) => {
          const table = new SymbolTable();
          const listener = new VisibilitySymbolListener('public-api', table);
          const result = compilerService.compile(content, uri, listener, {
            collectReferences: true,
            resolveReferences: true,
          });
          if (!result) return null;
          const symbolTable =
            result.result instanceof SymbolTable ? result.result : table;
          return { symbolTable, errors: result.errors };
        };

        yield* Effect.logInfo('[COMPILATION] services bootstrapped');
        return { compile } as CompilationServices;
      }),
    ),
  );

async function writeBackCompiledSymbols(
  symbolTable: {
    getAllSymbols(): unknown[];
    getAllReferences(): unknown[];
    getAllHierarchicalReferences?(): unknown[];
    getMetadata(): unknown;
    getFileUri(): string;
  },
  uri: string,
  documentVersion: number,
): Promise<boolean> {
  const startTime = Date.now();
  try {
    // Sanitize for the wire BEFORE posting. The assistance bus posts this
    // payload via MessagePort.postMessage, which uses the structured-clone
    // algorithm — and structured clone THROWS on function values. A compiled
    // SymbolTable's getAllSymbols() can carry function-valued properties (lazy
    // thunks) for real type-referencing Apex. Without this clone, postMessage
    // throws synchronously, the write-back never reaches the data-owner, the
    // readiness latch is never resolved, and the cold-read gate burns its full
    // budget before falling back. See worker.platform.ts for the full rationale.
    const enrichedSymbolTable = cloneForWire({
      symbols: symbolTable.getAllSymbols(),
      references: symbolTable.getAllReferences(),
      hierarchicalReferences:
        symbolTable.getAllHierarchicalReferences?.() ?? [],
      metadata: symbolTable.getMetadata(),
      fileUri: symbolTable.getFileUri(),
    });
    const symbolCount = Array.isArray(enrichedSymbolTable?.symbols)
      ? enrichedSymbolTable.symbols.length
      : 0;

    const response = (await requestCoordinatorAssistancePromise(
      'dataOwner:UpdateSymbolSubset',
      {
        uri,
        documentVersion,
        enrichedSymbolTable,
        enrichedDetailLevel: 'public-api',
        sourceWorkerId: workerId,
      },
      true,
    )) as { accepted: boolean; merged: number; versionMismatch: boolean };

    const elapsed = Date.now() - startTime;
    const accepted = response?.accepted ?? false;

    await Effect.runPromise(
      Effect.logDebug(
        `[COMPILATION] Write-back ${accepted ? 'accepted' : 'rejected'}: ` +
          `${symbolCount} symbols for ${uri} (v${documentVersion}, ${elapsed}ms)` +
          (response?.versionMismatch ? ' [version mismatch]' : ''),
      ),
    );
    return accepted;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    await Effect.runPromise(
      Effect.logWarning(
        `[COMPILATION] Write-back failed: ${uri} (${elapsed}ms) - ${err}`,
      ),
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Role-specific initialization
// ---------------------------------------------------------------------------

const handleWorkerInitRole = (
  req: Schema.Schema.Type<typeof WorkerInit>,
): Effect.Effect<{ ready: boolean }> => {
  if (req.role === 'resourceLoader') {
    return Effect.gen(function* () {
      const { ResourceLoader } = yield* Effect.promise(
        () => import('@salesforce/apex-lsp-parser-ast'),
      );
      yield* Effect.promise(() => ResourceLoader.getInstance().initialize());
      yield* Effect.logInfo('[resource-loader] stdlib loaded');
      return { ready: true };
    });
  }
  if (req.role === 'dataOwner') {
    return Effect.gen(function* () {
      yield* ensureDataOwnerServices;
      return { ready: true };
    });
  }
  if (req.role === 'lspRequest') {
    return Effect.gen(function* () {
      yield* ensureRequestServices;
      return { ready: true };
    });
  }
  if (req.role === 'compilation') {
    return Effect.gen(function* () {
      yield* ensureCompilationServices;
      return { ready: true };
    });
  }
  return Effect.succeed({ ready: true });
};

// ---------------------------------------------------------------------------
// Handler factories (identical to node version)
// ---------------------------------------------------------------------------

const dataOwnerDocHandler =
  <R, A>(
    tag: string,
    body: (svc: DataOwnerServices, req: R) => Effect.Effect<A>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            return yield* body(svc, req);
          }),
        ),
      ),
    );

const requestHandler =
  <R>(
    tag: string,
    callService: (svc: RequestServices, req: R) => Promise<unknown>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureRequestServices;
          const result = yield* Effect.promise(() => callService(svc, req));
          return { result: cloneForWire(result) };
        }),
      ),
    );

type PositionReq = {
  textDocument: { uri: string };
  position: { line: number; character: number };
  content?: string;
};
type DocOnlyReq = { textDocument: { uri: string } };
type DocWithContentReq = { textDocument: { uri: string }; content?: string };
type RefsReq = PositionReq & { context: { includeDeclaration: boolean } };
type CompletionReq = PositionReq & {
  context?: { triggerKind: number; triggerCharacter?: string };
};
type SignatureHelpReq = PositionReq & { context?: unknown };
type CodeActionReq = {
  textDocument: { uri: string };
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  content?: string;
  context?: unknown;
};

async function loadSymbolDataForEnrichment(
  svc: RequestServices,
  uri: string,
  content?: string,
): Promise<{ version: number; detailLevel: string }> {
  if (content) {
    const doc: WorkerDocument = {
      uri,
      getText: () => content,
      languageId: 'apex',
      version: 0,
    };
    svc.storageManager.getStorage().setDocument(uri, doc as never);
  }

  let version = -1;
  let detailLevel = 'public-api';

  try {
    const response = (await requestCoordinatorAssistancePromise(
      'dataOwner:QuerySymbolSubset',
      { uris: [uri] },
      true,
    )) as {
      entries: Record<string, unknown>;
      versions: Record<string, number>;
      detailLevels: Record<string, string>;
    };

    if (response?.entries) {
      const { SymbolTable, ReferenceContext } =
        await import('@salesforce/apex-lsp-parser-ast');
      const ingestEntries = (entries: Record<string, unknown>) => {
        const tables: Array<{ fileUri: string; st: any }> = [];
        for (const [fileUri, stData] of Object.entries(entries)) {
          if (stData) {
            tables.push({
              fileUri,
              st: SymbolTable.fromSerializedData(
                stData as SerializedSymbolTableData,
              ),
            });
          }
        }
        return tables;
      };

      const loaded = ingestEntries(response.entries);
      for (const { fileUri, st } of loaded) {
        await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      }
      version = response.versions?.[uri] ?? -1;
      detailLevel = response.detailLevels?.[uri] ?? 'public-api';

      const currentSt = loaded.find((e) => e.fileUri === uri)?.st;
      if (currentSt) {
        const refs = currentSt.getAllReferences() as Array<{
          name: string;
          context: number;
          resolvedSymbolId?: string;
        }>;
        const classNames = new Set<string>();
        for (const ref of refs) {
          if (
            !ref.resolvedSymbolId &&
            (ref.context === ReferenceContext.CLASS_REFERENCE ||
              ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
              ref.context === ReferenceContext.TYPE_DECLARATION)
          ) {
            classNames.add(ref.name);
          }
        }
        if (classNames.size > 0) {
          try {
            const depResponse = (await requestCoordinatorAssistancePromise(
              'dataOwner:ResolveDepUris',
              { classNames: [...classNames] },
              true,
            )) as { entries: Record<string, unknown> };
            if (depResponse?.entries) {
              for (const { fileUri: depUri, st: depSt } of ingestEntries(
                depResponse.entries,
              )) {
                await Effect.runPromise(
                  svc.symbolManager.addSymbolTable(depSt, depUri),
                );
              }
            }
          } catch {
            // Dep pre-fetch is best-effort.
          }

          // Cross-worker fallback: ResolveDepUris resolves names that map to a
          // file via the data-owner's class→file index, but a qualified
          // TypeReference can still miss when the target file is not loaded in
          // this enrichment worker's LOCAL name index. Ask the data-owner
          // (which holds ALL workspace symbols) to resolve the remaining names
          // in one batched query and ingest the owning files' symbol tables.
          // The ingest count is intentionally not captured (see below).
          await resolveMissingNamesViaDataOwner(svc, [...classNames]);

          // Ingestion alone only lands the owning files' SYMBOLS in the local
          // name index (addSymbolTable processes same-file refs only and defers
          // cross-file edges). Hover/Completion/Definition resolve via an
          // on-demand name lookup, so the symbol is enough for them — but the
          // requesting file's TypeReference is still unresolved (no
          // resolvedSymbolId, no reverse-index edge). Materialize those edges
          // now so reverse-index + position-precise consumers see them too.
          //
          // NOT gated on resolveMissingNamesViaDataOwner's ingest count: the
          // earlier ResolveDepUris pass may have already loaded every dep, which
          // makes that count 0 even though the cursor file's references are
          // still unbound. find-references' 'precise' position→symbol lookup
          // needs those bindings (unlike hover/definition's on-demand by-name
          // resolution), so resolve whenever ANY class dep was requested.
          // resolveCrossFileReferencesForFile is re-entrancy-guarded and
          // addReference de-dupes, so this is near-free when nothing changed.
          await Effect.runPromise(
            svc.symbolManager.resolveCrossFileReferencesForFile(uri),
          );
        }
      }
    }
  } catch (err) {
    // Subset load failed (assistance channel down, IPC error, or the data-owner
    // doesn't have the file). The caller proceeds on a partial/empty graph, so
    // any request built on it (hover/definition/references/…) may silently
    // return nothing. Warn — not debug — so an empty result has a breadcrumb
    // distinguishing "real failure" from "genuinely nothing here".
    getLogger().warn(
      () => `[ENRICHMENT] Symbol-subset load failed for ${uri}: ${err}`,
    );
  }

  return { version, detailLevel };
}

/**
 * Cross-worker symbol resolution fallback.
 *
 * When the enrichment worker's LOCAL name index ({@link findSymbolByName})
 * misses a referenced name, route a {@link DataOwnerQuerySymbolByName} query
 * through the assistance proxy to the data-owner — which holds ALL workspace
 * symbols — and ingest the owning file's symbol table so the reference can
 * resolve locally.
 *
 * Best-effort and idempotent: names already known locally are skipped, and a
 * failed query leaves the graph partial.
 *
 * keep this helper in sync with worker.platform.ts — the two platforms
 * intentionally carry identical enrichment bodies.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param names Candidate names to resolve (e.g. unresolved class references).
 * @param queryByName Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @param namespace Optional namespace/qualifier hint (e.g. the leading
 *   qualifier of a qualified TypeReference such as `MyNs` in `MyNs.Foo`).
 *   Threaded through to the {@link DataOwnerQuerySymbolByName} query so the
 *   data-owner can disambiguate same-named matches across namespaces. Omitted
 *   from the wire payload when absent so unqualified queries are byte-identical
 *   to before.
 * @returns Count of owning files ingested (0 on failure or no matches).
 */
export async function resolveMissingNamesViaDataOwner(
  svc: RequestServices,
  names: readonly string[],
  queryByName: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromise,
  namespace?: string,
): Promise<number> {
  // Drop duplicates and names the LOCAL name index already resolves before any
  // IPC. The local-skip also dedups against ResolveDepUris: any name it already
  // resolved is now in the local index, so it falls out here and is not
  // re-queried. The residual is exactly the set ResolveDepUris could not map.
  const residual: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const local = await svc.symbolManager.findSymbolByName(name);
    if (local.length === 0) residual.push(name);
  }

  if (residual.length === 0) return 0;

  const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
  try {
    // ONE blocking round-trip for the whole residual set. A file referencing N
    // unowned/managed-package types previously fired N sequential blocking hops
    // per keystroke; batching makes it a single hop. The success `entries` map
    // is keyed by owning file URI, so it carries every matched name's table.
    //
    // Thread the optional namespace/qualifier hint through to the data-owner
    // for same-name disambiguation. Only add the key when a namespace is
    // supplied so unqualified queries keep the exact prior payload shape.
    const queryParams: { names: string[]; namespace?: string } = {
      names: residual,
    };
    if (namespace) {
      queryParams.namespace = namespace;
    }
    const response = (await queryByName(
      'dataOwner:QuerySymbolByName',
      queryParams,
      true,
    )) as {
      matches?: ReadonlyArray<{ name: string; fileUri: string }>;
      entries?: Record<string, unknown>;
    };

    if (!response?.entries) return 0;
    let ingested = 0;
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
    }
    getLogger().debug(
      () =>
        `[ENRICHMENT] Cross-worker resolved ${residual.length} name(s) via ` +
        `data-owner: ${response.matches?.length ?? 0} match(es), ` +
        `${ingested} file(s) ingested`,
    );
    return ingested;
  } catch (err) {
    getLogger().debug(
      () =>
        '[ENRICHMENT] Cross-worker resolve failed for ' +
        `${residual.length} name(s): ${err}`,
    );
    return 0;
  }
}

/**
 * Load caller-side symbol tables needed by Find References into the local
 * enrichment worker's symbol manager.
 *
 * Where {@link loadSymbolDataForEnrichment} pre-fetches *outbound* deps (the
 * files this file references), Find References needs the *inbound* direction:
 * the files whose declared symbols reference the target. Those caller tables
 * must be present locally before `processReferences` runs so the reference
 * search sees cross-file usages, not just same-file ones.
 *
 * Best-effort: a failed resolve leaves the graph partial and the caller
 * proceeds with whatever tables are already loaded.
 *
 * keep this helper in sync with worker.platform.ts —
 * the two platforms intentionally carry identical enrichment bodies.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param uri Target file URI whose dependents we want to load.
 * @param symbolName Optional narrowing to a single declared symbol's
 *   dependents; when omitted, dependents of any symbol declared in `uri`.
 * @param fetchDependents Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @returns Count of dependent files ingested (0 on failure or no dependents).
 */
export async function loadDependentsForReferences(
  svc: RequestServices,
  uri: string,
  symbolName?: string,
  fetchDependents: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromise,
): Promise<number> {
  try {
    const response = (await fetchDependents(
      'dataOwner:ResolveDependentUris',
      { uri, symbolName },
      true,
    )) as { entries: Record<string, unknown> };

    if (!response?.entries) return 0;

    const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
    let ingested = 0;
    const ingestedUris: string[] = [];
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
      ingestedUris.push(fileUri);
    }

    // Resolve each freshly-loaded dependent's own cross-file references so its
    // OUTGOING edges — crucially the implements/extends supertype edges — land
    // in this worker's reverse index. find-implementation / find-references on a
    // supertype reads the reverse index of the TARGET (interface/superclass) for
    // its INCOMING edges; that edge is authored on the DEPENDENT (implementor/
    // subclass) side, so resolving the target file alone never materializes it.
    // The dependents were just ingested above, so their resolution targets are
    // present and this is bounded; resolveCrossFileReferencesForFile is
    // re-entrancy-guarded and addReference de-dupes, keeping it near-free on
    // repeat. (Replaces the former whole-workspace superClass/interfaces[] string
    // scan in ImplementationProcessingService, which masked this gap.)
    for (const fileUri of ingestedUris) {
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(fileUri),
      );
    }

    getLogger().debug(
      () =>
        `[REFERENCES] Loaded ${ingested} dependent table(s) for ${uri}` +
        (symbolName ? ` (symbol: ${symbolName})` : ''),
    );
    return ingested;
  } catch (err) {
    // Dependent pre-fetch is best-effort; reference search can still run on
    // the tables already loaded (e.g. same-file references). But reaching this
    // catch means cross-file callers were NOT loaded, so the result is likely
    // incomplete — warn so a "cross-file references missing" report has a
    // breadcrumb to follow.
    getLogger().warn(
      () => `[REFERENCES] Dependent pre-fetch failed for ${uri}: ${err}`,
    );
    return 0;
  }
}

/**
 * Recompile the cursor file at FULL detail into the worker's local symbol
 * manager, then resolve its cross-file references. See the Node platform's
 * {@link recompileCursorFileAtFullDetail} for the full rationale: the
 * data-owner serves public-api (method bodies stripped), so a cursor on an
 * in-body usage resolves to nothing and Find References returns []. Recompiling
 * from the live document text (as documentSymbol does) restores the in-body
 * references for position→symbol resolution.
 *
 * Best-effort: a missing/uncompilable document leaves the public-api graph in
 * place and Find References proceeds with whatever it has.
 */
export async function recompileCursorFileAtFullDetail(
  svc: RequestServices,
  uri: string,
  content?: string,
): Promise<boolean> {
  // Only truly-absent content (undefined) skips the recompile; '' is a valid
  // zero-length file. See the Node platform for the full rationale — this
  // mirrors the upstream `typeof req.content === 'string'` gate.
  if (content === undefined) return false;
  try {
    const { CompilerService, FullSymbolCollectorListener, SymbolTable } =
      await import('@salesforce/apex-lsp-parser-ast');
    const table = new SymbolTable();
    const listener = new FullSymbolCollectorListener(table);
    const result = new CompilerService().compile(content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const st = result?.result instanceof SymbolTable ? result.result : table;
    await Effect.runPromise(svc.symbolManager.addSymbolTable(st, uri));
    await Effect.runPromise(
      svc.symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    return true;
  } catch (err) {
    // The cursor file stays at public-api detail, so an in-body cursor won't
    // resolve and Find References can return []. Warn so that empty result is
    // attributable to a recompile failure rather than a genuine no-match.
    getLogger().warn(
      () => `[REFERENCES] Full-detail recompile failed for ${uri}: ${err}`,
    );
    return false;
  }
}

/**
 * Load the symbol tables of every TYPE the cursor file references, regardless of
 * resolvedSymbolId. See the Node platform's {@link loadReferencedTypesForFile}
 * for the full rationale: Find References needs the referenced type's table
 * PRESENT to enumerate its own references, but the resolved-only prefetch skips
 * already-resolved type references.
 */
export async function loadReferencedTypesForFile(
  svc: RequestServices,
  uri: string,
): Promise<number> {
  try {
    const { ReferenceContext } =
      await import('@salesforce/apex-lsp-parser-ast');
    const st = await svc.symbolManager.getSymbolTableForFile(uri);
    if (!st) return 0;
    const refs = st.getAllReferences();
    // Group the referenced type leaf names by their qualifier so the qualifier
    // can be threaded to the data-owner as a disambiguation namespace hint. A
    // qualified `MyNs.Foo` resolves by its LEAF (`Foo`) — the data-owner's name
    // index is keyed on the simple name — while the head (`MyNs`) is the
    // namespace hint. The undefined-qualifier bucket is the unqualified hot
    // path; it stays a single batched, namespace-free query (see the Node
    // platform for the full rationale).
    const namesByQualifier = new Map<string | undefined, Set<string>>();
    for (const ref of refs) {
      if (
        ref.context === ReferenceContext.CLASS_REFERENCE ||
        ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
        ref.context === ReferenceContext.TYPE_DECLARATION
      ) {
        const dot = ref.name.lastIndexOf('.');
        const leaf = dot >= 0 ? ref.name.slice(dot + 1) : ref.name;
        const qualifier = dot >= 0 ? ref.name.slice(0, dot) : undefined;
        const bucket = namesByQualifier.get(qualifier) ?? new Set<string>();
        bucket.add(leaf);
        namesByQualifier.set(qualifier, bucket);
      }
    }
    if (namesByQualifier.size === 0) return 0;
    // One batched query per distinct qualifier (one round-trip in the common
    // single-bucket case; one hop per qualifier otherwise).
    let ingested = 0;
    for (const [qualifier, leaves] of namesByQualifier) {
      ingested += await resolveMissingNamesViaDataOwner(
        svc,
        [...leaves],
        undefined,
        qualifier,
      );
    }
    await Effect.runPromise(
      svc.symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    return ingested;
  } catch (err) {
    // Target type tables may be absent locally, so findReferencesTo(type) can
    // come back empty. Warn so the gap is attributable.
    getLogger().warn(
      () => `[REFERENCES] Referenced-type load failed for ${uri}: ${err}`,
    );
    return 0;
  }
}

/**
 * Resolve the symbol under the cursor and return the file URI it is DECLARED
 * in (or null to fall back to the cursor file). See the Node platform's
 * {@link declaringFileForCursorSymbol} for the full rationale.
 */
async function declaringFileForCursorSymbol(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<string | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };
    // Preferred: precise position→symbol resolution gives the declaring file
    // directly.
    const symbol = await svc.symbolManager.getSymbolAtPosition(
      uri,
      parserPosition,
      'precise',
    );
    const fileUri = (symbol as { fileUri?: string } | null)?.fileUri;
    if (fileUri && fileUri !== uri) return fileUri;

    // Fallback: 'precise' can return null when the cursor file's reference
    // isn't yet bound to a resolvedSymbolId (cross-file edges not fully
    // materialized in the worker's partial graph). The reference under the
    // cursor still carries the NAME, and the target symbol is loaded by name —
    // so resolve the name to its declaring file directly. This is what lets
    // find-references on a `RefUtil` usage reach RefUtil.cls's dependents.
    // (Kept in sync with the Node platform; without it the web worker loads the
    // cursor file's dependents instead of the target's and misses cross-file
    // usages.)
    const refs = await svc.symbolManager.getReferencesAtPosition(
      uri,
      parserPosition,
    );
    const name = refs?.[0]?.name;
    if (!name) return null;
    const leaf = name.includes('.') ? name.split('.').pop()! : name;
    const named = await svc.symbolManager.findSymbolByName(leaf);
    const namedUri = (named as { fileUri?: string } | null)?.fileUri;
    return namedUri && namedUri !== uri ? namedUri : null;
  } catch {
    return null;
  }
}

function shouldEnrich(
  currentLevel: string,
  requiredLevel: 'public-api' | 'protected' | 'private' | 'full',
): boolean {
  const levelOrder: Record<string, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };
  const currentOrder = levelOrder[currentLevel] || 0;
  const requiredOrder = levelOrder[requiredLevel] || 0;
  return requiredOrder > currentOrder;
}

async function writeBackEnrichedSymbols(
  svc: RequestServices,
  uri: string,
  documentVersion: number,
  enrichedDetailLevel: 'public-api' | 'protected' | 'private' | 'full',
): Promise<boolean> {
  const startTime = Date.now();
  try {
    const symbolTable = await svc.symbolManager.getSymbolTableForFile(uri);
    if (!symbolTable) return false;

    const enrichedSymbolTable = {
      symbols: symbolTable.getAllSymbols(),
      references: symbolTable.getAllReferences(),
      hierarchicalReferences: symbolTable.getAllHierarchicalReferences(),
      metadata: symbolTable.getMetadata(),
      fileUri: symbolTable.getFileUri(),
    };

    const symbolCount = enrichedSymbolTable.symbols.length;

    const response = (await requestCoordinatorAssistancePromise(
      'dataOwner:UpdateSymbolSubset',
      {
        uri,
        documentVersion,
        enrichedSymbolTable,
        enrichedDetailLevel,
        sourceWorkerId: workerId,
      },
      true,
    )) as { accepted: boolean; merged: number; versionMismatch: boolean };

    const elapsed = Date.now() - startTime;
    const accepted = response?.accepted ?? false;

    await Effect.runPromise(
      Effect.logDebug(
        `[ENRICHMENT] Write-back ${accepted ? 'accepted' : 'rejected'}: ` +
          `${symbolCount} symbols, ${enrichedDetailLevel} level, ${uri} ` +
          `(v${documentVersion}, ${elapsed}ms)` +
          (response?.versionMismatch ? ' [version mismatch]' : ''),
      ),
    );

    return accepted;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    await Effect.runPromise(
      Effect.logWarning(
        `[ENRICHMENT] Write-back failed: ${uri} (${elapsed}ms) - ${err}`,
      ),
    );
    return false;
  }
}

const requestHandlers = {
  DispatchHover: requestHandler<PositionReq>(
    'DispatchHover',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
        req.content,
      );
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
      const result = await svc.hoverService.processHover({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
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
  DispatchCompletion: requestHandler<CompletionReq>(
    'DispatchCompletion',
    async (svc, req) => {
      // Completion runs on the in-flight (possibly unsaved) document text, so
      // load the local subset from that content rather than the data-owner's
      // last-stored version.
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
        req.content,
      );
      // Completion needs full member visibility for member-access suggestions.
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
      // triggerKind crosses the wire as a plain number but IS a
      // CompletionTriggerKind value (1/2/3); the worker avoids importing LSP
      // types, so build the params untyped and let the service narrow.
      const completionParams = {
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
        ...(req.context ? { context: req.context } : {}),
      };
      const result = await svc.completionService.processCompletion(
        completionParams as Parameters<
          typeof svc.completionService.processCompletion
        >[0],
      );
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
  DispatchSignatureHelp: requestHandler<SignatureHelpReq>(
    'DispatchSignatureHelp',
    async (svc, req) => {
      // Signature help runs on the in-flight document text while typing args.
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
        req.content,
      );
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
      const params = {
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
        ...(req.context !== undefined ? { context: req.context } : {}),
      };
      const result = await svc.signatureHelpService.processSignatureHelp(
        params as Parameters<
          typeof svc.signatureHelpService.processSignatureHelp
        >[0],
      );
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
  DispatchCodeAction: requestHandler<CodeActionReq>(
    'DispatchCodeAction',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
        req.content,
      );
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
      const params = {
        textDocument: { uri: req.textDocument.uri },
        range: req.range,
        ...(req.context !== undefined ? { context: req.context } : {}),
      };
      const result = await svc.codeActionService.processCodeAction(
        params as Parameters<typeof svc.codeActionService.processCodeAction>[0],
      );
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
  DispatchDefinition: requestHandler<PositionReq>(
    'DispatchDefinition',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
      );
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
      const result = await svc.definitionService.processDefinition({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
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
  DispatchReferences: requestHandler<RefsReq>(
    'DispatchReferences',
    async (svc, req) => {
      // Mirror the hover/definition enrichment shape:
      //   load symbol data → load caller-side dependents → process → write back.
      // Thread req.content so the pool worker's storage holds the document:
      // ReferencesProcessingService maps the cursor position to a symbol via
      // storage.getDocument(), and returns [] when it's absent. The stateless
      // pool worker has no document otherwise (same as documentSymbol).
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
        req.content,
      );

      // The full-detail recompile (and therefore in-body position resolution)
      // is gated on having the document text. The coordinator omits `content`
      // when it isn't tracking the file as open.
      const cursorTextAvailable = typeof req.content === 'string';

      // Recompile the cursor file at FULL detail so its in-body references
      // exist for position→symbol resolution. The data-owner serves public-api
      // (bodies stripped), so without this a cursor on an in-body usage
      // resolves to nothing and Find References returns [].
      const cursorRecompiled = await recompileCursorFileAtFullDetail(
        svc,
        req.textDocument.uri,
        req.content,
      );

      // Abort when content was absent rather than warn-then-continue: with no
      // document text the recompile is skipped AND loadSymbolDataForEnrichment
      // never stored a document, so position resolution returns [] regardless.
      // See the Node platform for the full rationale (gated on
      // !cursorTextAvailable so a content-present recompile failure still falls
      // through to a declaration-cursor lookup).
      if (!cursorRecompiled && !cursorTextAvailable) {
        getLogger().warn(
          () =>
            `[REFERENCES] No document text for ${req.textDocument.uri}; ` +
            'cursor file cannot be recompiled at full detail and the pool ' +
            'worker has no stored document, so position resolution cannot ' +
            'succeed. Aborting with an empty result (degraded, not a genuine ' +
            'no-match).',
        );
        return [];
      }

      // Load the tables of every TYPE the cursor file references — even ones the
      // data-owner already resolved. Find References needs the target type's
      // table present to enumerate its references (see the Node platform).
      await loadReferencedTypesForFile(svc, req.textDocument.uri);

      // Load the caller-side tables (files that reference the TARGET symbol).
      // The target may be declared in a DIFFERENT file than the cursor; resolve
      // the cursor to its symbol, then load dependents of that symbol's
      // DECLARING file (see the Node platform for the full rationale). Falls
      // back to the cursor file when the symbol can't be determined.
      const targetUri = await declaringFileForCursorSymbol(
        svc,
        req.textDocument.uri,
        req.position,
      );
      await loadDependentsForReferences(svc, targetUri ?? req.textDocument.uri);

      // Re-assert the cursor file at full detail in case loadDependents
      // re-ingested it at public-api. Idempotent + bounded.
      await recompileCursorFileAtFullDetail(
        svc,
        req.textDocument.uri,
        req.content,
      );

      // References resolve against protected members of dependent files, so a
      // 'protected' detail level matches the existing service behavior (see
      // LayerEnrichmentService enrichment of references in
      // ReferencesProcessingService).
      const requiredLevel = 'protected';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

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
  DispatchImplementation: requestHandler<PositionReq>(
    'DispatchImplementation',
    async (svc, req) => {
      // Mirror the references enrichment shape, but for the inbound IMPLEMENTS /
      // EXTENDS direction:
      //   load symbol data → load inbound implementor/subtype tables →
      //   resolve cross-file edges → process → write back.
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
      );

      // Go-to-implementation must see every implementor/subtype of the target
      // type, which live in *other* files. loadDependentsForReferences pulls the
      // inbound tables (files whose declared symbols reference symbols in this
      // file) from the data-owner AND resolves each one's cross-file references,
      // so the implements/extends edges authored on those implementor/subclass
      // files land in this worker's reverse index — which is what
      // ImplementationProcessingService.findSubtypes reads.
      await loadDependentsForReferences(svc, req.textDocument.uri);

      // Also resolve the target file's own cross-file refs (e.g. an interface
      // that extends another interface) so the full supertype graph is present.
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(
          req.textDocument.uri,
        ),
      );

      // Implementor discovery reads interfaces/superClass + method declarations,
      // which are present at 'full' detail (per LspRequestPrerequisiteMapping).
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

      const result = await svc.implementationService.processImplementation({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
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
  DispatchDocumentSymbol: requestHandler<DocWithContentReq>(
    'DispatchDocumentSymbol',
    async (svc, req) => {
      // documentSymbol re-compiles the file from its TEXT (the provider parses
      // with FullSymbolCollectorListener for a complete hierarchy) rather than
      // reading the dataOwner symbol graph, so the pool worker must hold the
      // document text. Thread req.content into loadSymbolDataForEnrichment,
      // which stores it before the provider runs — otherwise the provider's
      // storage.getDocument() returns null and the outline is empty.
      await loadSymbolDataForEnrichment(svc, req.textDocument.uri, req.content);
      return svc.documentSymbolService.processDocumentSymbol({
        textDocument: { uri: req.textDocument.uri },
      });
    },
  ),
  DispatchCodeLens: requestHandler<DocOnlyReq>(
    'DispatchCodeLens',
    async (svc, req) => {
      await loadSymbolDataForEnrichment(svc, req.textDocument.uri);
      return svc.codeLensService.processCodeLens({
        textDocument: { uri: req.textDocument.uri },
      });
    },
  ),
  DispatchDiagnostic: requestHandler<DocOnlyReq>(
    'DispatchDiagnostic',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
      );
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
      const result = await svc.diagnosticService.processDiagnostic({
        textDocument: { uri: req.textDocument.uri },
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
  DispatchCrossFileEnrichment: requestHandler<DocOnlyReq>(
    'DispatchCrossFileEnrichment',
    async (svc, req) => {
      const { version } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
      );
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(
          req.textDocument.uri,
        ),
      );
      await writeBackEnrichedSymbols(
        svc,
        req.textDocument.uri,
        version,
        'public-api',
      );
      return { resolved: true };
    },
  ),
};

// ---------------------------------------------------------------------------
// Handlers — one per _tag in AllWorkerRequests
// ---------------------------------------------------------------------------

const handlers: WorkerRunner.SerializedRunner.Handlers<
  Schema.Schema.Type<typeof AllWorkerRequests>
> = {
  WorkerInit: (req) => {
    if (assignedRole !== null) {
      return Effect.die(
        new Error('WorkerInit received but role already assigned'),
      );
    }
    assignedRole = req.role;
    if (req.logLevel) {
      setWorkerLogLevel(req.logLevel);
    }
    const resolvedServerMode = req.serverMode ?? 'production';
    ApexCapabilitiesManager.getInstance().setMode(resolvedServerMode);
    (globalThis as Record<string, unknown>).__apexWorkerInitServerMode =
      resolvedServerMode;
    return Effect.gen(function* () {
      yield* Effect.logInfo(
        `[worker] role=${req.role} protocol=v${req.protocolVersion}/${WIRE_PROTOCOL_VERSION}` +
          ` logLevel=${currentWorkerLogLevel}`,
      );
    }).pipe(Effect.flatMap(() => handleWorkerInitRole(req)));
  },

  PingWorker: (req) =>
    guardRole('PingWorker').pipe(Effect.map(() => ({ echo: req.echo }))),

  WorkerRemoteStdlibWarmup: (_req) =>
    guardRole('WorkerRemoteStdlibWarmup').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          if (assignedRole === 'dataOwner') {
            yield* ensureDataOwnerServices;
          } else if (assignedRole === 'lspRequest') {
            yield* ensureRequestServices;
          } else if (assignedRole === 'compilation') {
            yield* ensureCompilationServices;
          }
          yield* Effect.tryPromise({
            try: () => warmRemoteStdlibNamespaceCache(),
            catch: (e) => ({
              _tag: 'WorkerRemoteStdlibWarmupError' as const,
              message: e instanceof Error ? e.message : String(e),
            }),
          });
          return { ok: true as const };
        }),
      ),
    ),

  QuerySymbolSubset: (req) =>
    guardRole('QuerySymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;
            const storage = svc.storageManager.getStorage();
            const cache = getDocumentStateCache();

            const entries: Record<string, unknown> = {};
            const versions: Record<string, number> = {};
            const detailLevels: Record<
              string,
              'public-api' | 'protected' | 'private' | 'full'
            > = {};

            const serializeSt = (
              st: Awaited<ReturnType<typeof sm.getSymbolTableForFile>> & object,
            ) =>
              cloneForWire({
                symbols: st.getAllSymbols(),
                references: st.getAllReferences(),
                hierarchicalReferences: st.getAllHierarchicalReferences(),
                metadata: st.getMetadata(),
                fileUri: st.getFileUri(),
              });

            for (const uri of req.uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              entries[uri] = st ? serializeSt(st) : null;

              const doc = yield* Effect.promise(() => storage.getDocument(uri));
              versions[uri] = doc?.version ?? -1;

              const state = cache.getCurrentState(uri);
              const level = state?.detailLevel ?? 'public-api';
              detailLevels[uri] =
                level === 'public-api' ||
                level === 'protected' ||
                level === 'private' ||
                level === 'full'
                  ? level
                  : 'public-api';
            }

            return { entries, versions, detailLevels };
          }),
        ),
      ),
    ),

  // Deterministic readiness wait — browser counterpart of the Node handler.
  // "Snapshot in runner, await outside": peek the latch through the serial
  // runner (non-blocking), then await its Deferred on this handler's own fiber
  // so the resolving write (UpdateSymbolSubset) is never blocked behind us.
  AwaitSymbolReadiness: (req) =>
    guardRole('AwaitSymbolReadiness').pipe(
      Effect.flatMap(() => {
        const matchLatest = req.version < 0;
        const peekReadiness = dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const st = yield* Effect.promise(() =>
              svc.symbolManager.getSymbolTableForFile(req.uri),
            );
            const latch = readinessLatches.get(req.uri);
            if (symbolsAreCurrent(req.uri, req.version, st != null)) {
              return { kind: 'ready' as const };
            }
            if (!latch) {
              return { kind: 'no-latch' as const };
            }
            if (!matchLatest && latch.version > req.version) {
              return { kind: 'stale-version' as const };
            }
            return { kind: 'await' as const, deferred: latch.deferred };
          }),
        );

        return Effect.gen(function* () {
          const snapshot = yield* peekReadiness;
          if (snapshot.kind === 'ready') {
            return { ready: true };
          }
          if (snapshot.kind === 'no-latch') {
            return { ready: false, reason: 'no-compile-pending' as const };
          }
          if (snapshot.kind === 'stale-version') {
            return { ready: false, reason: 'stale-version' as const };
          }

          const fired = yield* Deferred.await(snapshot.deferred).pipe(
            Effect.as(true),
            Effect.timeoutTo({
              duration: `${req.timeoutMs} millis`,
              onTimeout: () => false,
              onSuccess: () => true,
            }),
          );
          if (!fired) {
            return { ready: false, reason: 'timeout' as const };
          }

          // The latch resolves on a successful merge, on supersession by a newer
          // version, AND on a rejected write-back. Re-peek with the SAME currency
          // check as the initial peek (symbolsAreCurrent) to tell a real merge
          // from a stale wake-up: a supersession or rejected-write-back wake-up
          // leaves the prior version's table present while the merged version has
          // NOT advanced — reporting ready off that stale table is the bug. When
          // not current, return stale-version so the coordinator re-issues the
          // gate against the newer version.
          const after = yield* dataOwnerRead(
            Effect.gen(function* () {
              const svc = yield* ensureDataOwnerServices;
              const st = yield* Effect.promise(() =>
                svc.symbolManager.getSymbolTableForFile(req.uri),
              );
              return symbolsAreCurrent(req.uri, req.version, st != null);
            }),
          );
          return after
            ? { ready: true }
            : { ready: false, reason: 'stale-version' as const };
        });
      }),
    ),

  UpdateSymbolSubset: (req) =>
    guardRole('UpdateSymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            writeBackMetrics.attempted++;

            const svc = yield* ensureDataOwnerServices;
            const storage = svc.storageManager.getStorage();
            const cache = getDocumentStateCache();

            const currentDoc = yield* Effect.promise(() =>
              storage.getDocument(req.uri),
            );

            if (!currentDoc) {
              writeBackMetrics.rejectedDocumentMissing++;
              // Terminal for this version — release any awaiter so the
              // coordinator falls back instead of blocking the gate budget.
              resolveReadiness(req.uri, req.documentVersion);
              return { accepted: false, merged: 0, versionMismatch: false };
            }

            if (currentDoc.version !== req.documentVersion) {
              writeBackMetrics.rejectedVersionMismatch++;
              resolveReadiness(req.uri, req.documentVersion);
              return { accepted: false, merged: 0, versionMismatch: true };
            }

            const currentState = cache.getCurrentState(req.uri);
            const rawLevel = currentState?.detailLevel;
            const currentOrder =
              rawLevel === 'public-api' ||
              rawLevel === 'protected' ||
              rawLevel === 'private' ||
              rawLevel === 'full'
                ? getLayerOrderIndex(rawLevel)
                : 0;
            const enrichedOrder = getLayerOrderIndex(req.enrichedDetailLevel);

            // The detail-level downgrade guard prevents a poorer enrichment from
            // overwriting a richer one — but ONLY for the SAME document version.
            // A write-back for a NEWER version carries fresh content and MUST
            // merge even at an equal/lower detail level: the cached level
            // describes the OLD version's symbols, which are now stale. Only skip
            // when the cache is at the same-or-newer version AND same-or-richer
            // level.
            const cachedVersion = currentState?.documentVersion ?? -1;
            const sameOrOlderVersion = req.documentVersion <= cachedVersion;
            if (sameOrOlderVersion && enrichedOrder <= currentOrder) {
              writeBackMetrics.rejectedDetailLevel++;
              // Symbols at this (or richer) level already present for this (or a
              // newer) version — ready.
              resolveReadiness(req.uri, req.documentVersion);
              return { accepted: false, merged: 0, versionMismatch: false };
            }

            const { SymbolTable } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            const enrichedSt = SymbolTable.fromSerializedData(
              req.enrichedSymbolTable as never,
            );

            yield* svc.symbolManager.addSymbolTable(
              enrichedSt,
              req.uri,
              req.documentVersion,
              false,
            );

            // Populate cross-file incoming edges for this file now that its
            // symbols are merged. Resolves references from this file into the
            // workspace graph (and defers any whose targets aren't ingested yet,
            // to be drained post-batch via DrainDeferredReferences).
            yield* svc.symbolManager.resolveCrossFileReferencesForFile(req.uri);

            cache.merge(req.uri, {
              documentVersion: req.documentVersion,
              detailLevel: req.enrichedDetailLevel,
              timestamp: Date.now(),
            });

            const mergedCount = enrichedSt.getAllSymbols().length;
            writeBackMetrics.accepted++;
            writeBackMetrics.totalSymbolsMerged += mergedCount;

            // Symbols for this version are now in the graph — release any
            // coordinator request awaiting readiness for this URI/version.
            resolveReadiness(req.uri, req.documentVersion);

            yield* Effect.logDebug(
              `[DATA-OWNER] Write-back accepted: ${mergedCount} symbols ` +
                `merged at ${req.enrichedDetailLevel} level for ${req.uri} ` +
                `(from ${req.sourceWorkerId})`,
            );

            return {
              accepted: true,
              merged: mergedCount,
              versionMismatch: false,
            };
          }),
        ),
      ),
    ),

  DrainDeferredReferences: () =>
    guardRole('DrainDeferredReferences').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const resolved =
              yield* svc.symbolManager.drainAllDeferredReferences();
            yield* Effect.logDebug(
              `[DATA-OWNER] DrainDeferredReferences resolved ${resolved} edge(s)`,
            );
            return { resolved };
          }),
        ),
      ),
    ),

  ResolveDepUris: (req) =>
    guardRole('ResolveDepUris').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;

            const uris = new Set<string>();
            for (const name of req.classNames) {
              const files = yield* Effect.promise(() =>
                sm.findFilesForSymbol(name),
              );
              for (const f of files) uris.add(f);
            }

            const entries: Record<string, unknown> = {};
            for (const uri of uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              if (st) {
                // Key by the table's CANONICAL fileUri, not the schemeless
                // lookup `uri` (findFilesForSymbol strips `file://`). Keying by
                // `uri` makes the requesting worker ingest under a URI that
                // never matches its references' targets, so cross-file edges
                // fail to bind and find-references returns []. See the Node
                // platform handler for the full rationale.
                const canonicalUri = st.getFileUri();
                entries[canonicalUri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: canonicalUri,
                });
              }
            }

            return { entries };
          }),
        ),
      ),
    ),

  // NOTE: keep this handler in sync with worker.platform.ts —
  // the two platforms intentionally carry identical data-owner bodies.
  DataOwnerQuerySymbolByName: (req) =>
    guardRole('DataOwnerQuerySymbolByName').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;

            // Resolve a batch (`names`) or a single name. Batching lets an
            // enrichment worker collapse N per-keystroke blocking round-trips
            // into one. De-dupe so a name repeated across callers is queried
            // once.
            const queryNames = [
              ...new Set(
                (req.names && req.names.length > 0
                  ? req.names
                  : req.name
                    ? [req.name]
                    : []
                ).filter((n): n is string => !!n),
              ),
            ];

            // Optional namespace hint: a qualified reference (`MyNs.Foo`)
            // carries its leading qualifier so the data-owner can disambiguate
            // same-named matches across namespaces. Applied as a SOFT
            // preference, not a hard filter — if no symbol's namespace matches
            // the hint, fall back to all matches (see the Node platform for the
            // full rationale, including the inner-class qualifier case).
            const nsHint = req.namespace?.toLowerCase();
            const symbolNamespace = (s: {
              namespace?: unknown;
            }): string | undefined => {
              const ns = s.namespace;
              if (!ns) return undefined;
              return (typeof ns === 'string' ? ns : String(ns)).toLowerCase();
            };

            const matches: Array<{
              name: string;
              fileUri: string;
              kind?: string;
            }> = [];
            const uris = new Set<string>();
            for (const queryName of queryNames) {
              // The data-owner holds ALL workspace symbols, so its name index
              // resolves names an enrichment worker's local subset may miss.
              const symbols = yield* Effect.promise(() =>
                sm.findSymbolByName(queryName),
              );
              const withFile = symbols.filter((s) => !!s?.fileUri);
              const nsMatched = nsHint
                ? withFile.filter((s) => symbolNamespace(s) === nsHint)
                : [];
              const selected = nsMatched.length > 0 ? nsMatched : withFile;
              for (const symbol of selected) {
                matches.push({
                  name: symbol.name,
                  fileUri: symbol.fileUri!,
                  kind:
                    typeof symbol.kind === 'string' ? symbol.kind : undefined,
                });
                uris.add(symbol.fileUri!);
              }
            }

            // Return the owning files' symbol tables so the worker can ingest
            // them and finish resolving the reference (mirrors ResolveDepUris).
            const entries: Record<string, unknown> = {};
            for (const uri of uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              if (st) {
                entries[uri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: st.getFileUri(),
                });
              }
            }

            return { matches, entries };
          }),
        ),
      ),
    ),

  ResolveDependentUris: (req) =>
    guardRole('ResolveDependentUris').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { resolveDependentUris } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            const result = yield* Effect.promise(() =>
              resolveDependentUris(svc.symbolManager, req.uri, req.symbolName),
            );
            const wire: Record<string, unknown> = {};
            for (const [uri, entry] of Object.entries(result.entries)) {
              // cloneForWire (JSON round-trip) drops the class identity and
              // any non-enumerable/getter props on the symbol-table objects
              // so the result is a plain tree that survives structured-clone
              // across the worker postMessage boundary.
              wire[uri] = cloneForWire(entry);
            }
            return { entries: wire };
          }),
        ),
      ),
    ),

  WorkspaceBatchIngest: (req) =>
    guardRole('WorkspaceBatchIngest').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const startTime = Date.now();
            const svc = yield* ensureDataOwnerServices;
            const storage = svc.storageManager.getStorage();
            for (const entry of req.entries) {
              const doc: WorkerDocument = {
                uri: entry.uri,
                getText: () => entry.content,
                languageId: entry.languageId,
                version: entry.version,
              };
              void storage.setDocument(entry.uri, doc as never);
            }
            const elapsed = Date.now() - startTime;
            yield* Effect.logDebug(
              `[DATA-OWNER] WorkspaceBatchIngest: session=${req.sessionId}, ` +
                `stored=${req.entries.length} files in ${elapsed}ms`,
            );
            return { processedCount: req.entries.length };
          }),
        ),
      ),
    ),

  QueryGraphData: (req) =>
    guardRole('QueryGraphData').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { GraphDataProcessingService } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-compliant-services'),
            );
            const service = new GraphDataProcessingService(
              getLogger(),
              svc.symbolManager,
            );
            const result = yield* Effect.promise(() =>
              service.processGraphData({
                type: req.type,
                fileUri: req.fileUri,
                symbolType: req.symbolType,
                includeMetadata: req.includeMetadata ?? false,
                includeDiagnostics: req.includeDiagnostics ?? false,
              }),
            );
            return cloneForWire(result);
          }),
        ),
      ),
    ),

  DispatchDocumentOpen: dataOwnerDocHandler(
    'DispatchDocumentOpen',
    (svc, req) =>
      Effect.gen(function* () {
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => req.content,
          languageId: req.languageId,
          version: req.version,
        };
        // Await the store before arming: the write-back's version check and the
        // readiness latch both require the document present at this version
        // before the compile this open triggers can write back.
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentChange: dataOwnerDocHandler(
    'DispatchDocumentChange',
    (svc, req) =>
      Effect.gen(function* () {
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => '',
          languageId: 'apex',
          version: req.version,
        };
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentSave: dataOwnerDocHandler(
    'DispatchDocumentSave',
    (svc, req) =>
      Effect.gen(function* () {
        // Mirror DispatchDocumentChange: store a version placeholder and arm the
        // readiness latch so the CompileDocument this save triggers can write
        // its symbols back and a racing request re-evaluates against the saved
        // version. The compile message carries the real saved content.
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => '',
          languageId: 'apex',
          version: req.version,
        };
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentClose: dataOwnerDocHandler(
    'DispatchDocumentClose',
    (svc, req) =>
      Effect.sync(() => {
        const closeDoc: WorkerDocument = {
          uri: req.uri,
          getText: () => '',
          languageId: 'apex',
          version: 0,
        };
        svc.documentCloseProcessingService.processDocumentClose({
          document: closeDoc as never,
        });
        // Release any awaiter and drop the latch.
        clearReadiness(req.uri);
        return { accepted: true };
      }),
  ),

  CompileDocument: (req) =>
    guardRole('CompileDocument').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const startTime = Date.now();
          const svc = yield* ensureCompilationServices;

          const result = svc.compile(req.content, req.uri);
          let compiledCount = 0;
          if (result && result.symbolTable) {
            compiledCount = 1;
            yield* Effect.promise(() =>
              writeBackCompiledSymbols(
                result.symbolTable as any,
                req.uri,
                req.version,
              ),
            );
          }

          const elapsedMs = Date.now() - startTime;
          yield* Effect.logDebug(
            `[COMPILATION] CompileDocument: ${req.uri} (v${req.version}, ` +
              `priority=${req.priority}, ${elapsedMs}ms)`,
          );
          return { compiledCount, elapsedMs };
        }),
      ),
    ),

  WorkspaceBatchCompile: (req) =>
    guardRole('WorkspaceBatchCompile').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const batchStartTime = Date.now();
          const svc = yield* ensureCompilationServices;

          let compiledCount = 0;
          let errorCount = 0;
          const YIELD_INTERVAL = 10;

          for (let i = 0; i < req.entries.length; i++) {
            const entry = req.entries[i];
            try {
              const result = svc.compile(entry.content, entry.uri);
              if (result && result.symbolTable) {
                compiledCount++;
                yield* Effect.promise(() =>
                  writeBackCompiledSymbols(
                    result.symbolTable as any,
                    entry.uri,
                    entry.version,
                  ),
                );
              } else {
                errorCount++;
              }
            } catch {
              errorCount++;
            }

            if ((i + 1) % YIELD_INTERVAL === 0 && i + 1 < req.entries.length) {
              yield* Effect.yieldNow();
            }
          }

          // Post-batch: ask the data-owner to drain deferred cross-file
          // references into graph edges now that every file in the batch has
          // been written back and had its references resolved. Best-effort:
          // a drain failure must not fail the batch compile.
          yield* Effect.tryPromise({
            try: () =>
              requestCoordinatorAssistancePromise(
                'dataOwner:DrainDeferredReferences',
                {},
                true,
              ),
            catch: (e) => e,
          }).pipe(
            Effect.catchAll((e) =>
              Effect.logWarning(
                `[COMPILATION] DrainDeferredReferences failed: ${e}`,
              ),
            ),
          );

          const elapsedMs = Date.now() - batchStartTime;
          yield* Effect.logInfo(
            `[COMPILATION] WorkspaceBatchCompile: session=${req.sessionId}, ` +
              `compiled=${compiledCount}, errors=${errorCount}, ${elapsedMs}ms`,
          );
          return { compiledCount, errorCount, elapsedMs };
        }),
      ),
    ),

  ...requestHandlers,

  DispatchGenericLspRequest: (req) =>
    guardRole('DispatchGenericLspRequest').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          yield* Effect.logWarning(
            `[ENRICHMENT] GenericLspRequest: unhandled type=${req.requestType}`,
          );
          return { result: null };
        }),
      ),
    ),

  ResourceLoaderGetSymbolTable: (req) =>
    guardRole('ResourceLoaderGetSymbolTable').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const st = yield* Effect.promise(() =>
            ResourceLoader.getInstance().getSymbolTable(req.classPath),
          );
          if (!st) return { found: false };
          return { found: true, symbolTable: cloneForWire(st) };
        }),
      ),
    ),

  ResourceLoaderGetFile: (req) =>
    guardRole('ResourceLoaderGetFile').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const content = yield* Effect.promise(() =>
            ResourceLoader.getInstance().getFile(req.path),
          );
          return content !== undefined
            ? { found: true, content }
            : { found: false };
        }),
      ),
    ),

  ResourceLoaderResolveClass: (req) =>
    guardRole('ResourceLoaderResolveClass').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const fqn = ResourceLoader.getInstance().resolveStandardClassFqn(
            req.className,
          );
          return fqn !== null ? { found: true, fqn } : { found: false };
        }),
      ),
    ),

  ResourceLoaderGetStandardNamespaces: () =>
    guardRole('ResourceLoaderGetStandardNamespaces').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const raw = ResourceLoader.getInstance().getStandardNamespaces();
          const namespaces: Record<string, string[]> = {};
          for (const [k, v] of raw) {
            namespaces[k] = v.map((cis) =>
              typeof cis === 'string' ? cis : (cis as { value: string }).value,
            );
          }
          return { namespaces };
        }),
      ),
    ),
};

// ---------------------------------------------------------------------------
// Worker→coordinator assistance proxy (browser variant)
//
// Uses a dedicated MessagePort (port2Assist) received via WorkerPortsInit.
// All assistance requests and responses travel on this side-channel port,
// keeping the Effect protocol channel (port2Effect) clean.
// ---------------------------------------------------------------------------

let assistPort: MessagePort | null = null;

const pendingAssistanceCallbacks = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();
let assistanceListenerAttached = false;
let assistanceIdCounter = 0;

function ensureAssistanceListener(): void {
  if (assistanceListenerAttached || !assistPort) return;
  assistanceListenerAttached = true;

  assistPort.addEventListener('message', (event: MessageEvent) => {
    const data = event.data;
    if (!isAssistanceResponse(data)) return;

    const pending = pendingAssistanceCallbacks.get(data.correlationId);
    if (!pending) return;
    pendingAssistanceCallbacks.delete(data.correlationId);

    if (data.error) {
      pending.reject(new Error(data.error));
    } else {
      pending.resolve(data.result);
    }
  });
  // assistPort.start() already called in the WorkerPortsInit bootstrap below
}

class AssistanceError {
  readonly _tag = 'AssistanceError' as const;
  readonly message: string;
  constructor(message: string) {
    this.message = message;
  }
}

export function requestCoordinatorAssistance(
  method: string,
  params: unknown,
  blocking: boolean,
): Effect.Effect<unknown, AssistanceError> {
  return Effect.gen(function* () {
    ensureAssistanceListener();

    // Include workerId: the counter + Date.now() are per-worker, so two
    // different workers issuing their Nth assist in the same millisecond would
    // otherwise collide on the same correlationId and the coordinator mediator
    // would dedup them as one call (dropping one worker's request). workerId is
    // globally unique, so this makes correlationIds unique across all workers.
    const correlationId = `assist-${workerId}-${++assistanceIdCounter}-${Date.now()}`;

    return yield* Effect.async<unknown, AssistanceError>((resume) => {
      pendingAssistanceCallbacks.set(correlationId, {
        resolve: (value) => resume(Effect.succeed(value)),
        reject: (error) =>
          resume(Effect.fail(new AssistanceError(error.message))),
      });

      assistPort!.postMessage({
        _tag: 'WorkerAssistanceRequest',
        correlationId,
        method,
        params,
        blocking,
      });
    });
  });
}

export function requestCoordinatorAssistancePromise(
  method: string,
  params: unknown,
  blocking: boolean,
): Promise<unknown> {
  return Effect.runPromise(
    requestCoordinatorAssistance(method, params, blocking),
  );
}

// ---------------------------------------------------------------------------
// Remote stdlib provider (browser variant — same as node, uses IPC)
// ---------------------------------------------------------------------------

let remoteStdlibNamespaceMap: Map<string, Set<string>> | null = null;

async function warmRemoteStdlibNamespaceCache(): Promise<void> {
  try {
    const raw = (await requestCoordinatorAssistancePromise(
      'resourceLoader:getStandardNamespaces',
      {},
      true,
    )) as { namespaces: Record<string, string[]> } | null;
    if (!raw?.namespaces) return;
    remoteStdlibNamespaceMap = new Map();
    for (const [ns, classes] of Object.entries(raw.namespaces)) {
      remoteStdlibNamespaceMap.set(
        ns.toLowerCase(),
        new Set(classes.map((c) => c.toLowerCase())),
      );
    }
  } catch {
    // Best-effort; stdlib warmup failures are non-fatal.
  }
}

async function makeResourceLoaderRemoteLayer() {
  const { ResourceLoaderService } =
    await import('@salesforce/apex-lsp-parser-ast');
  const L = await import('effect/Layer');
  const impl = {
    isStdApexNamespace(ns: string): boolean {
      if (!remoteStdlibNamespaceMap) return false;
      return remoteStdlibNamespaceMap.has(ns.toLowerCase());
    },
    hasClass(className: string): boolean {
      if (!remoteStdlibNamespaceMap) return false;
      for (const classes of remoteStdlibNamespaceMap.values()) {
        if (classes.has(className.toLowerCase())) return true;
      }
      return false;
    },
    findNamespaceForClass(className: string): Set<string> {
      const result = new Set<string>();
      if (!remoteStdlibNamespaceMap) return result;
      const lower = className.toLowerCase();
      for (const [ns, classes] of remoteStdlibNamespaceMap) {
        if (classes.has(lower)) result.add(ns);
      }
      return result;
    },
    getStandardNamespaces(): Map<string, string[]> {
      if (!remoteStdlibNamespaceMap) return new Map();
      const result = new Map<string, string[]>();
      for (const [ns, classes] of remoteStdlibNamespaceMap) {
        result.set(ns, [...classes]);
      }
      return result;
    },
    async resolveClassFqn(className: string): Promise<string | null> {
      try {
        return (await requestCoordinatorAssistancePromise(
          'resourceLoader:resolveClass',
          { name: className },
          true,
        )) as string | null;
      } catch {
        return null;
      }
    },
    async getSymbolTable(
      classPath: string,
    ): Promise<import('@salesforce/apex-lsp-parser-ast').SymbolTable | null> {
      try {
        const raw = await requestCoordinatorAssistancePromise(
          'resourceLoader:getSymbolTable',
          { classPath },
          true,
        );
        if (!raw || typeof raw !== 'object') return null;
        const { SymbolTable: ST } =
          await import('@salesforce/apex-lsp-parser-ast');
        return ST.fromJSON(raw);
      } catch {
        return null;
      }
    },
    async getFile(path: string): Promise<string | undefined> {
      try {
        return (await requestCoordinatorAssistancePromise(
          'resourceLoader:getFile',
          { path },
          true,
        )) as string | undefined;
      } catch {
        return undefined;
      }
    },
  };

  return L.succeed(ResourceLoaderService, impl);
}

// ---------------------------------------------------------------------------
// Worker→coordinator log transport (browser variant)
//
// Posts WorkerLogMessage to the dedicated assistPort side-channel.
// Logs emitted before WorkerPortsInit arrives are buffered and flushed
// once the port is set in the bootstrap listener below.
// ---------------------------------------------------------------------------

const LOG_LEVEL_PRIORITY: Record<WorkerLogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

let currentWorkerLogLevel: WorkerLogLevel = 'error';

function setWorkerLogLevel(level: string): void {
  if (level in LOG_LEVEL_PRIORITY) {
    currentWorkerLogLevel = level as WorkerLogLevel;
  }
}

function effectLogLevelToWire(level: LogLevel.LogLevel): WorkerLogLevel | null {
  if (LogLevel.greaterThanEqual(level, LogLevel.Error)) return 'error';
  if (LogLevel.greaterThanEqual(level, LogLevel.Warning)) return 'warning';
  if (LogLevel.greaterThanEqual(level, LogLevel.Info)) return 'info';
  if (LogLevel.greaterThanEqual(level, LogLevel.Debug)) return 'debug';
  return null;
}

// Buffer for log messages emitted before assistPort is set.
const preAssistBuffer: WorkerLogMessage[] = [];

const workerLogger = Logger.make(({ logLevel, message }) => {
  const wireLevel = effectLogLevelToWire(logLevel);
  if (!wireLevel) return;
  if (LOG_LEVEL_PRIORITY[wireLevel] < LOG_LEVEL_PRIORITY[currentWorkerLogLevel])
    return;

  const msg: WorkerLogMessage = {
    _tag: 'WorkerLogMessage',
    level: wireLevel,
    message: typeof message === 'string' ? message : String(message),
  };
  if (assistPort) {
    assistPort.postMessage(msg);
  } else {
    preAssistBuffer.push(msg);
  }
});

const WorkerLoggerLayer = Layer.merge(
  Logger.replace(Logger.defaultLogger, workerLogger),
  Logger.minimumLogLevel(LogLevel.Debug),
);

// ---------------------------------------------------------------------------
// Bootstrap — Browser worker runner (deferred until WorkerPortsInit)
//
// The coordinator sends WorkerPortsInit on rawWorker.postMessage (i.e. self)
// with two transferred MessagePorts:
//   effectPort — Effect protocol channel (replaces self for BrowserWorkerRunner)
//   assistPort — side-channel for logs and assistance RPC
//
// Effect is launched with BrowserWorkerRunner.layerMessagePort(effectPort) so
// it never registers listeners on self, avoiding any message collision.
// ---------------------------------------------------------------------------

const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);

self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as Record<string, unknown> | null;
  if (!data || data._tag !== 'WorkerPortsInit') return;

  const effectPort = data.effectPort as MessagePort;
  assistPort = data.assistPort as MessagePort;
  assistPort.start();

  // Flush any logs buffered before the port arrived
  for (const msg of preAssistBuffer) assistPort.postMessage(msg);
  preAssistBuffer.length = 0;

  WorkerRunner.launch(
    Layer.provide(
      runnerLayer,
      BrowserWorkerRunner.layerMessagePort(effectPort),
    ),
  ).pipe(Effect.provide(WorkerLoggerLayer), Effect.runFork);
});
