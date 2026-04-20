/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Single entry point for all internal worker roles (Node.js).
 *
 * Spawned by the coordinator (WorkerCoordinator, Step 3). The first message
 * is always WorkerInit, which assigns the worker's role. Subsequent messages
 * are validated against the role's allowed-tag set — disallowed tags cause a
 * defect (defense-in-depth against coordinator misrouting).
 *
 * Handler stubs are wired to real implementations in later steps:
 *   - Step 8:  WorkspaceBatchIngest (data-owner)
 *   - Step 9:  ResourceLoaderGetSymbolTable
 *   - Step 11: Dispatch* (pool / data-owner)
 *
 * Browser variant: worker.platform.web.ts (Step 10).
 */

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as NodeWorkerRunner from '@effect/platform-node/NodeWorkerRunner';
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
  UpdateSymbolSubset,
  ResolveDepUris,
  WorkspaceBatchIngest,
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
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchGenericLspRequest,
  isAllowedTag,
  WIRE_PROTOCOL_VERSION,
  ApexCapabilitiesManager,
} from '@salesforce/apex-lsp-shared';
import {
  isAssistanceResponse,
  type WorkerRole,
  type WorkerLogMessage,
  type WorkerLogLevelChange,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// WorkerAssistanceRequest excluded: it flows worker → coordinator
// ---------------------------------------------------------------------------

const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  UpdateSymbolSubset,
  ResolveDepUris,
  WorkspaceBatchIngest,
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
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchGenericLspRequest,
);

// ---------------------------------------------------------------------------
// Minimal document interface matching the subset of TextDocument used
// by storage/processing services. Avoids importing the full
// vscode-languageserver-textdocument package in worker context.
// ---------------------------------------------------------------------------

interface WorkerDocument {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  getText(): string;
}

// ---------------------------------------------------------------------------
// Utility — deep clone for structured-clone-safe postMessage results
// ---------------------------------------------------------------------------

function cloneForWire<T>(value: T): T | null {
  return value != null ? JSON.parse(JSON.stringify(value)) : null;
}

// ---------------------------------------------------------------------------
// Role state & guard
// ---------------------------------------------------------------------------

let assignedRole: WorkerRole | null = null;

// ---------------------------------------------------------------------------
// Worker ID for write-back tracking
// ---------------------------------------------------------------------------

let workerIdCounter = 0;
const workerId = `worker-${process.pid}-${Date.now()}-${++workerIdCounter}`;

export function getWorkerId(): string {
  return workerId;
}

// ---------------------------------------------------------------------------
// Write-back metrics tracking
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

export function getWriteBackMetrics(): Readonly<WriteBackMetrics> {
  return { ...writeBackMetrics };
}

export function resetWriteBackMetrics(): void {
  writeBackMetrics.attempted = 0;
  writeBackMetrics.accepted = 0;
  writeBackMetrics.rejectedVersionMismatch = 0;
  writeBackMetrics.rejectedDocumentMissing = 0;
  writeBackMetrics.rejectedDetailLevel = 0;
  writeBackMetrics.totalSymbolsMerged = 0;
}

/**
 * Defects on role violation — these are programming errors (coordinator
 * misrouted a message) and should never happen in normal operation.
 */
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
// Data-owner internal tiered queue (Step 5)
//
// Reads (QuerySymbolSubset, etc.) get priority over writes
// (WorkspaceBatchIngest, DispatchDocument*). The processing loop
// drains all pending reads before processing one write, preventing
// bulk ingestion from starving enrichment-worker symbol queries.
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
// Lazy role-specific service containers (bootstrapped on first dispatch)
// ---------------------------------------------------------------------------

import type {
  DataOwnerServices,
  EnrichmentServices,
} from '@salesforce/apex-lsp-compliant-services';
import { getDocumentStateCache } from '@salesforce/apex-lsp-compliant-services';

/**
 * Get numeric order index for detail levels.
 * Matches LayerEnrichmentService's ordering.
 */
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

const ensureEnrichmentServices: Effect.Effect<EnrichmentServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const {
          bootstrapEnrichmentServices,
          EnhancedMissingArtifactResolutionService,
        } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const resourceLoaderLayer = yield* Effect.promise(() =>
          makeResourceLoaderRemoteLayer(),
        );
        const svc = yield* Effect.promise(() =>
          bootstrapEnrichmentServices(resourceLoaderLayer),
        );

        // Wire coordinator assistance so the enrichment worker can forward
        // apex/findMissingArtifact to the coordinator (which holds the LSP
        // client connection) rather than silently dropping the request.
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
    const enrichedSymbolTable = {
      symbols: symbolTable.getAllSymbols(),
      references: symbolTable.getAllReferences(),
      hierarchicalReferences:
        symbolTable.getAllHierarchicalReferences?.() ?? [],
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
  if (req.role === 'enrichmentSearch') {
    return Effect.gen(function* () {
      yield* ensureEnrichmentServices;
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
// Data-owner document handler factory
//
// The outer shell (guardRole → dataOwnerWrite → ensureDataOwnerServices)
// is identical for all document mutation handlers. The factory captures
// this; each handler only provides its unique body logic.
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

// ---------------------------------------------------------------------------
// Enrichment handler factory
//
// All enrichment dispatch handlers follow the same pattern: guard the
// role, lazily bootstrap services, call a service method, clone the
// result for structured-clone-safe postMessage. The factory captures
// this pattern; each handler is a one-liner config.
// ---------------------------------------------------------------------------

const enrichmentHandler =
  <R>(
    tag: string,
    callService: (svc: EnrichmentServices, req: R) => Promise<unknown>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
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
type RefsReq = PositionReq & { context: { includeDeclaration: boolean } };

/**
 * Load symbol data from the data-owner worker into the local enrichment
 * worker's symbol manager. Stores the document text in local storage
 * and queries the data-owner for the file's symbol table via the
 * coordinator assistance proxy.
 *
 * Returns version and detail level metadata for the loaded URI.
 */
async function loadSymbolDataForEnrichment(
  svc: EnrichmentServices,
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
            const raw = stData as {
              symbols: any[];
              references?: any[];
              hierarchicalReferences?: any[];
              metadata?: any;
              fileUri?: string;
            };
            tables.push({
              fileUri,
              st: SymbolTable.fromSerializedData(raw),
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

      // Phase 2: pre-fetch cross-file dependencies.
      // Extract unresolved CLASS_REFERENCE / CONSTRUCTOR_CALL names from the
      // loaded file and ask the data-owner to resolve them to symbol tables.
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
            // Dep pre-fetch is best-effort; resolution can still work on-demand.
          }
        }
      }
    }
  } catch {
    // Subset load failed; caller may still proceed with partial graph.
  }

  return { version, detailLevel };
}

/**
 * Determine if enrichment is needed based on current and required detail levels.
 * Uses the same ordering as LayerEnrichmentService on origin/main.
 */
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

/**
 * Write back enriched symbol data to the data-owner worker.
 * Returns true if the write-back was accepted, false otherwise.
 */
async function writeBackEnrichedSymbols(
  svc: EnrichmentServices,
  uri: string,
  documentVersion: number,
  enrichedDetailLevel: 'public-api' | 'protected' | 'private' | 'full',
): Promise<boolean> {
  const startTime = Date.now();
  try {
    const symbolTable = await svc.symbolManager.getSymbolTableForFile(uri);
    if (!symbolTable) {
      await Effect.runPromise(
        Effect.logDebug(
          `[ENRICHMENT] Write-back skipped: no symbol table for ${uri}`,
        ),
      );
      return false;
    }

    // Serialize symbol table to wire format
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

const enrichmentHandlers = {
  DispatchHover: enrichmentHandler<PositionReq>(
    'DispatchHover',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
        req.content,
      );

      // Hover requires 'full' detail level per LspRequestPrerequisiteMapping
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

      const result = await svc.hoverService.processHover({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
      });

      // Write back enriched symbols if enrichment occurred
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
  DispatchDefinition: enrichmentHandler<PositionReq>(
    'DispatchDefinition',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
      );

      // Definition requires 'full' detail level per LspRequestPrerequisiteMapping
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

      const result = await svc.definitionService.processDefinition({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
      });

      // Write back enriched symbols if enrichment occurred
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
  DispatchReferences: enrichmentHandler<RefsReq>(
    'DispatchReferences',
    (svc, req) =>
      svc.referencesService.processReferences({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
        context: { includeDeclaration: req.context.includeDeclaration },
      }),
  ),
  DispatchImplementation: enrichmentHandler<PositionReq>(
    'DispatchImplementation',
    (svc, req) =>
      svc.implementationService.processImplementation({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
      }),
  ),
  DispatchDocumentSymbol: enrichmentHandler<DocOnlyReq>(
    'DispatchDocumentSymbol',
    (svc, req) =>
      svc.documentSymbolService.processDocumentSymbol({
        textDocument: { uri: req.textDocument.uri },
      }),
  ),
  DispatchCodeLens: enrichmentHandler<DocOnlyReq>(
    'DispatchCodeLens',
    (svc, req) =>
      svc.codeLensService.processCodeLens({
        textDocument: { uri: req.textDocument.uri },
      }),
  ),
  DispatchDiagnostic: enrichmentHandler<DocOnlyReq>(
    'DispatchDiagnostic',
    async (svc, req) => {
      const { version, detailLevel } = await loadSymbolDataForEnrichment(
        svc,
        req.textDocument.uri,
      );

      // Diagnostics requires 'full' detail level per LspRequestPrerequisiteMapping
      const requiredLevel = 'full';
      const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

      const result = await svc.diagnosticService.processDiagnostic({
        textDocument: { uri: req.textDocument.uri },
      });

      // Write back enriched symbols if enrichment occurred
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
      yield* Effect.logDebug('[WorkerInit] Testing debug log after init');
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
          } else if (assignedRole === 'enrichmentSearch') {
            yield* ensureEnrichmentServices;
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

  // -- Data-owner handlers (routed through internal tiered queue) ------------

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
              // Get symbol table
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              entries[uri] = st ? serializeSt(st) : null;

              // Get document version
              const doc = yield* Effect.promise(() => storage.getDocument(uri));
              versions[uri] = doc?.version ?? -1;

              // Get detail level from cache
              const state = cache.getCurrentState(uri);
              const level = state?.detailLevel ?? 'public-api';
              // Ensure type safety
              detailLevels[uri] =
                level === 'public-api' ||
                level === 'protected' ||
                level === 'private' ||
                level === 'full'
                  ? level
                  : 'public-api';
            }

            // #region agent log
            fetch(
              'http://127.0.0.1:7441/ingest/9fe9dff8-a20a-43b0-898c-ed89ba87e085',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Debug-Session-Id': 'a509d3',
                },
                body: JSON.stringify({
                  sessionId: 'a509d3',
                  location: 'worker.platform.ts:QuerySymbolSubset',
                  message: 'result',
                  data: {
                    requestedUris: req.uris,
                    nullEntries: Object.entries(entries)
                      .filter(([, v]) => v === null)
                      .map(([k]) => k),
                    versions,
                    detailLevels,
                  },
                  hypothesisId: 'H9',
                  timestamp: Date.now(),
                }),
              },
            ).catch(() => {});
            // #endregion

            return { entries, versions, detailLevels };
          }),
        ),
      ),
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

            // Version validation
            const currentDoc = yield* Effect.promise(() =>
              storage.getDocument(req.uri),
            );

            if (!currentDoc) {
              writeBackMetrics.rejectedDocumentMissing++;
              yield* Effect.logDebug(
                `[DATA-OWNER] Write-back rejected: document not found for ${req.uri}`,
              );
              return {
                accepted: false,
                merged: 0,
                versionMismatch: false,
              };
            }

            if (currentDoc.version !== req.documentVersion) {
              writeBackMetrics.rejectedVersionMismatch++;
              yield* Effect.logDebug(
                '[DATA-OWNER] Write-back rejected: version mismatch ' +
                  `(current=${currentDoc.version}, update=${req.documentVersion}) ` +
                  `for ${req.uri} from ${req.sourceWorkerId}`,
              );
              return {
                accepted: false,
                merged: 0,
                versionMismatch: true,
              };
            }

            // Detail level validation
            // When no cache entry exists (file not yet compiled on data-owner),
            // currentOrder is 0 so any write-back level is accepted.
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

            if (enrichedOrder <= currentOrder) {
              writeBackMetrics.rejectedDetailLevel++;
              yield* Effect.logDebug(
                `[DATA-OWNER] Write-back skipped: already have ${rawLevel ?? 'none'} ` +
                  `(order=${currentOrder}) >= ${req.enrichedDetailLevel} ` +
                  `for ${req.uri}`,
              );
              return { accepted: false, merged: 0, versionMismatch: false };
            }

            // Deserialize enriched symbol table
            const { SymbolTable } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            const enrichedSt = SymbolTable.fromSerializedData(
              req.enrichedSymbolTable as never,
            );

            // Merge into symbol manager (returns Effect, so yield directly)
            yield* svc.symbolManager.addSymbolTable(
              enrichedSt,
              req.uri,
              req.documentVersion,
              false, // hasErrors
            );

            // Update cache with new detail level
            cache.merge(req.uri, {
              documentVersion: req.documentVersion,
              detailLevel: req.enrichedDetailLevel,
              timestamp: Date.now(),
            });

            const mergedCount = enrichedSt.getAllSymbols().length;
            writeBackMetrics.accepted++;
            writeBackMetrics.totalSymbolsMerged += mergedCount;

            // Log to both Effect logger and console for debugging
            const logMsg =
              `[DATA-OWNER] Write-back accepted: ${mergedCount} symbols ` +
              `merged at ${req.enrichedDetailLevel} level for ${req.uri} ` +
              `(from ${req.sourceWorkerId})`;
            console.log(logMsg);
            yield* Effect.logDebug(logMsg);

            return {
              accepted: true,
              merged: mergedCount,
              versionMismatch: false,
            };
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
                entries[uri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: st.getFileUri(),
                });
              }
            }

            return { entries };
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
            const stats = (yield* Effect.promise(
              () =>
                (svc.symbolManager as any).getStats?.() ??
                Promise.resolve(null),
            )) as {
              totalFiles: number;
              totalSymbols: number;
              totalReferences: number;
            } | null;
            const statsStr = stats
              ? ` | graph: ${stats.totalFiles} files, ${stats.totalSymbols} symbols, ${stats.totalReferences} refs`
              : '';
            yield* Effect.logDebug(
              `[DATA-OWNER] WorkspaceBatchIngest: session=${req.sessionId}, ` +
                `stored=${req.entries.length} files in ${elapsed}ms${statsStr}`,
            );
            return { processedCount: req.entries.length };
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
        void svc.storageManager.getStorage().setDocument(req.uri, doc as never);
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
        void svc.storageManager.getStorage().setDocument(req.uri, doc as never);
        return { accepted: true };
      }),
  ),

  DispatchDocumentSave: dataOwnerDocHandler(
    'DispatchDocumentSave',
    (_svc, req) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(
          `[DATA-OWNER] DispatchDocumentSave: uri=${req.uri}`,
        );
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
        return { accepted: true };
      }),
  ),

  // -- Compilation worker handlers ---------------------------------------------

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

          const elapsedMs = Date.now() - batchStartTime;
          yield* Effect.logInfo(
            `[COMPILATION] WorkspaceBatchCompile: session=${req.sessionId}, ` +
              `compiled=${compiledCount}, errors=${errorCount}, ${elapsedMs}ms`,
          );
          return { compiledCount, errorCount, elapsedMs };
        }),
      ),
    ),

  // -- Enrichment/search pool handlers (Step 11) ----------------------------
  //
  // All enrichment handlers follow the same pattern: guard role, bootstrap
  // services, call the service method, clone the result for postMessage.
  // The `enrichmentHandler` factory eliminates the repetition.

  ...enrichmentHandlers,

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

  // -- Resource-loader handlers (Step 9) -------------------------------------

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
// Worker→coordinator assistance proxy (Step 7)
//
// Workers that need client RPCs (e.g. apex/findMissingArtifact) send
// WorkerAssistanceRequest via parentPort. The coordinator's
// CoordinatorAssistanceMediator listens for these messages and
// responds with WorkerAssistanceResponse carrying the same correlationId.
// ---------------------------------------------------------------------------

import { parentPort, workerData } from 'node:worker_threads';

// Dedicated port for assistance requests — avoids polluting the main
// Worker channel that @effect/platform uses for its wire protocol.
const assistPort: import('node:worker_threads').MessagePort | null =
  ((workerData as Record<string, unknown> | undefined)?.assistPort as
    | import('node:worker_threads').MessagePort
    | null) ?? null;

const pendingAssistanceCallbacks = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();
let assistanceListenerAttached = false;
let assistanceIdCounter = 0;

function ensureAssistanceListener(): void {
  if (assistanceListenerAttached) return;
  const port = assistPort ?? parentPort;
  if (!port) return;
  assistanceListenerAttached = true;

  port.on('message', (data: unknown) => {
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
}

class AssistanceError {
  readonly _tag = 'AssistanceError' as const;
  readonly message: string;
  constructor(message: string) {
    this.message = message;
  }
}

/**
 * Request coordinator assistance for a client RPC.
 * Returns an Effect that resolves when the coordinator responds.
 */
export function requestCoordinatorAssistance(
  method: string,
  params: unknown,
  blocking: boolean,
): Effect.Effect<unknown, AssistanceError> {
  return Effect.gen(function* () {
    ensureAssistanceListener();

    const port = assistPort ?? parentPort;
    if (!port) {
      return yield* Effect.fail(
        new AssistanceError('no assistPort or parentPort (not a worker)'),
      );
    }

    const correlationId = `assist-${++assistanceIdCounter}-${Date.now()}`;

    const result = yield* Effect.async<unknown, AssistanceError>((resume) => {
      pendingAssistanceCallbacks.set(correlationId, {
        resolve: (value) => resume(Effect.succeed(value)),
        reject: (error) =>
          resume(Effect.fail(new AssistanceError(error.message))),
      });

      port.postMessage({
        _tag: 'WorkerAssistanceRequest',
        correlationId,
        method,
        params,
        blocking,
      });
    });

    return result;
  });
}

/**
 * Promise-based wrapper for backward compatibility.
 * Callers that haven't migrated to Effect can use this.
 */
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
// Remote stdlib provider — ResourceLoaderRemoteLive
//
// Enrichment and data-owner workers don't load the stdlib archive locally.
// This Layer forwards stdlib queries to the coordinator via the assistance
// channel; the coordinator proxies to the resourceLoader worker.
//
// Sync methods (isStdApexNamespace, hasClass, findNamespaceForClass,
// getStandardNamespaces) are served from a cached namespace map filled in
// phase B (`WorkerRemoteStdlibWarmup`) after assistance mediation is live.
// Async methods forward via IPC on each call regardless.
// ---------------------------------------------------------------------------

let remoteStdlibNamespaceMap: Map<string, Set<string>> | null = null;

async function warmRemoteStdlibNamespaceCache(): Promise<void> {
  if (!remoteStdlibNamespaceMap) {
    throw new Error(
      'Remote stdlib namespace map not initialized (ResourceLoader layer missing)',
    );
  }
  const raw = (await requestCoordinatorAssistancePromise(
    'resourceLoader:getStandardNamespaces',
    {},
    true,
  )) as Record<string, string[]> | null;
  if (!raw || typeof raw !== 'object') {
    return;
  }
  for (const [ns, classes] of Object.entries(raw)) {
    remoteStdlibNamespaceMap.set(
      ns.toLowerCase(),
      new Set(classes.map((c) => c.toLowerCase())),
    );
  }
}

async function makeResourceLoaderRemoteLayer(): Promise<
  import('effect').Layer.Layer<
    import('@salesforce/apex-lsp-parser-ast').ResourceLoaderService
  >
> {
  const { ResourceLoaderService } =
    await import('@salesforce/apex-lsp-parser-ast');
  const { Layer: L } = await import('effect');

  remoteStdlibNamespaceMap = new Map<string, Set<string>>();
  const namespaceMap = remoteStdlibNamespaceMap;

  const impl: import('@salesforce/apex-lsp-parser-ast').ResourceLoaderServiceShape =
    {
      isStdApexNamespace(namespace: string): boolean {
        return namespaceMap.has(namespace.toLowerCase());
      },

      hasClass(classPath: string): boolean {
        const parts = classPath.split('/');
        if (parts.length < 2) return false;
        const ns = parts[0].toLowerCase();
        const classFile = parts.slice(1).join('/').toLowerCase();
        return namespaceMap.get(ns)?.has(classFile) ?? false;
      },

      findNamespaceForClass(className: string): Set<string> {
        const lower = className.toLowerCase();
        const result = new Set<string>();
        for (const [ns, classes] of namespaceMap) {
          for (const cls of classes) {
            const base = cls.replace(/\.cls$/i, '').toLowerCase();
            if (base === lower) {
              result.add(ns);
              break;
            }
          }
        }
        return result;
      },

      getStandardNamespaces(): Map<string, string[]> {
        const result = new Map<string, string[]>();
        for (const [ns, classes] of namespaceMap) {
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
// Worker→coordinator log transport
//
// Custom Effect logger that posts WorkerLogMessage to parentPort.
// The coordinator's mediator listens for these and forwards them to the
// LSP logger (window/logMessage).
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

const workerLogger = Logger.make(({ logLevel, message }) => {
  // Use assistance port to avoid colliding with @effect/platform protocol
  const port = assistPort ?? parentPort;
  if (!port) return;
  const wireLevel = effectLogLevelToWire(logLevel);
  if (!wireLevel) return;
  if (LOG_LEVEL_PRIORITY[wireLevel] < LOG_LEVEL_PRIORITY[currentWorkerLogLevel])
    return;

  const msg: WorkerLogMessage = {
    _tag: 'WorkerLogMessage',
    level: wireLevel,
    message: typeof message === 'string' ? message : String(message),
  };
  port.postMessage(msg);
});

// Re-enabled: We now use the dedicated assistance port for logging
// to avoid collisions with the @effect/platform worker protocol.
// Set minimum log level to Debug so all messages reach our custom logger,
// which does its own filtering based on currentWorkerLogLevel.
const WorkerLoggerLayer = Layer.merge(
  Logger.replace(Logger.defaultLogger, workerLogger),
  Logger.minimumLogLevel(LogLevel.Debug),
);

// Disabled: coordinator-side WorkerLogLevelChange posting is disabled
// (same parentPort protocol collision as WorkerLogMessage). The listener
// is kept but not called until a dedicated MessageChannel is used.
function _listenForLogLevelChanges(): void {
  if (!parentPort) return;
  parentPort.on('message', (data: unknown) => {
    if (
      typeof data === 'object' &&
      data !== null &&
      (data as Record<string, unknown>)._tag === 'WorkerLogLevelChange'
    ) {
      const { logLevel } = data as WorkerLogLevelChange;
      setWorkerLogLevel(logLevel);
    }
  });
}
// listenForLogLevelChanges(); // disabled — see comment above

// ---------------------------------------------------------------------------
// Bootstrap — Node worker runner
// ---------------------------------------------------------------------------

const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);

WorkerRunner.launch(Layer.provide(runnerLayer, NodeWorkerRunner.layer)).pipe(
  Effect.provide(WorkerLoggerLayer),
  Effect.runFork,
);
