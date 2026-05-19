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
  UpdateSymbolSubset,
  ResolveDepUris,
  WorkspaceBatchIngest,
  QueryGraphData,
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
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  isAllowedTag,
  WIRE_PROTOCOL_VERSION,
  ApexCapabilitiesManager,
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
  UpdateSymbolSubset,
  ResolveDepUris,
  WorkspaceBatchIngest,
  QueryGraphData,
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
// Lazy role-specific service containers
// ---------------------------------------------------------------------------

import type {
  DataOwnerServices,
  EnrichmentServices,
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
        }
      }
    }
  } catch {
    // Subset load failed; caller may still proceed with partial graph.
  }

  return { version, detailLevel };
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
  svc: EnrichmentServices,
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

const enrichmentHandlers = {
  DispatchHover: enrichmentHandler<PositionReq>(
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
  DispatchDefinition: enrichmentHandler<PositionReq>(
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
  DispatchCrossFileEnrichment: enrichmentHandler<DocOnlyReq>(
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
              return { accepted: false, merged: 0, versionMismatch: false };
            }

            if (currentDoc.version !== req.documentVersion) {
              writeBackMetrics.rejectedVersionMismatch++;
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

            if (enrichedOrder <= currentOrder) {
              writeBackMetrics.rejectedDetailLevel++;
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

            cache.merge(req.uri, {
              documentVersion: req.documentVersion,
              detailLevel: req.enrichedDetailLevel,
              timestamp: Date.now(),
            });

            const mergedCount = enrichedSt.getAllSymbols().length;
            writeBackMetrics.accepted++;
            writeBackMetrics.totalSymbolsMerged += mergedCount;

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
            const [{ GraphDataProcessingService }, { getLogger }] =
              yield* Effect.promise(() =>
                Promise.all([
                  import('@salesforce/apex-lsp-compliant-services'),
                  import('@salesforce/apex-lsp-shared'),
                ]),
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

    const correlationId = `assist-${++assistanceIdCounter}-${Date.now()}`;

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
