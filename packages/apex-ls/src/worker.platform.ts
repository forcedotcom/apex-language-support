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
import { Effect, Layer, Schema, Queue, Deferred, Fiber } from 'effect';
import {
  WorkerInit,
  PingWorker,
  QuerySymbolSubset,
  WorkspaceBatchIngest,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
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
} from '@salesforce/apex-lsp-shared';
import type { WorkerRole } from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// WorkerAssistanceRequest excluded: it flows worker → coordinator
// ---------------------------------------------------------------------------

const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  QuerySymbolSubset,
  WorkspaceBatchIngest,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
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
// Role state & guard
// ---------------------------------------------------------------------------

let assignedRole: WorkerRole | null = null;

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

type DOQueueItem = {
  eff: Effect.Effect<any, any>;
  deferred: Deferred.Deferred<any, any>;
};

let readQueue: Queue.Queue<DOQueueItem> | null = null;
let writeQueue: Queue.Queue<DOQueueItem> | null = null;
let _processingFiber: Fiber.RuntimeFiber<never> | null = null;

function ensureDataOwnerQueue(): void {
  if (readQueue !== null) return;

  readQueue = Effect.runSync(Queue.unbounded<DOQueueItem>());
  writeQueue = Effect.runSync(Queue.unbounded<DOQueueItem>());

  const processItem = (item: DOQueueItem) =>
    Effect.gen(function* () {
      const result = yield* Effect.either(item.eff);
      if (result._tag === 'Right') {
        yield* Deferred.succeed(item.deferred, result.right);
      } else {
        yield* Deferred.fail(item.deferred, result.left);
      }
    });

  const loop = Effect.forever(
    Effect.gen(function* () {
      const reads = yield* Queue.takeAll(readQueue!);
      const readItems = Array.from(reads);
      for (const item of readItems) {
        yield* processItem(item);
      }

      const writeChunk = yield* Queue.takeUpTo(writeQueue!, 1);
      const writeItems = Array.from(writeChunk);
      for (const item of writeItems) {
        yield* processItem(item);
      }

      if (readItems.length === 0 && writeItems.length === 0) {
        yield* Effect.sleep('1 millis');
      }
    }),
  );

  _processingFiber = Effect.runFork(loop);
}

const dataOwnerRead = <A>(eff: Effect.Effect<A, any>): Effect.Effect<A, any> =>
  Effect.gen(function* () {
    ensureDataOwnerQueue();
    const deferred = yield* Deferred.make<A, any>();
    yield* Queue.offer(readQueue!, { eff, deferred });
    return yield* Deferred.await(deferred);
  });

const dataOwnerWrite = <A>(eff: Effect.Effect<A, any>): Effect.Effect<A, any> =>
  Effect.gen(function* () {
    ensureDataOwnerQueue();
    const deferred = yield* Deferred.make<A, any>();
    yield* Queue.offer(writeQueue!, { eff, deferred });
    return yield* Deferred.await(deferred);
  });

// ---------------------------------------------------------------------------
// Lazy role-specific service containers (bootstrapped on first dispatch)
// ---------------------------------------------------------------------------

import type {
  DataOwnerServices,
  EnrichmentServices,
} from '@salesforce/apex-lsp-compliant-services';

let dataOwnerServices: DataOwnerServices | null = null;
let enrichmentServices: EnrichmentServices | null = null;

const ensureDataOwnerServices = Effect.gen(function* () {
  if (dataOwnerServices) return dataOwnerServices;
  const { bootstrapDataOwnerServices } = yield* Effect.promise(
    () => import('@salesforce/apex-lsp-compliant-services'),
  );
  dataOwnerServices = yield* Effect.promise(() => bootstrapDataOwnerServices());
  yield* Effect.logInfo('[DATA-OWNER] services bootstrapped');
  return dataOwnerServices;
});

const ensureEnrichmentServices = Effect.gen(function* () {
  if (enrichmentServices) return enrichmentServices;
  const { bootstrapEnrichmentServices } = yield* Effect.promise(
    () => import('@salesforce/apex-lsp-compliant-services'),
  );
  enrichmentServices = yield* Effect.promise(() =>
    bootstrapEnrichmentServices(),
  );
  yield* Effect.logInfo('[ENRICHMENT] services bootstrapped');
  return enrichmentServices;
});

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
    console.log(
      `[worker] role=${req.role} protocol=v${req.protocolVersion}/${WIRE_PROTOCOL_VERSION}`,
    );
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
    return Effect.succeed({ ready: true });
  },

  PingWorker: (req) =>
    guardRole('PingWorker').pipe(Effect.map(() => ({ echo: req.echo }))),

  // -- Data-owner handlers (routed through internal tiered queue) ------------

  QuerySymbolSubset: (req) =>
    guardRole('QuerySymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const entries: Record<string, unknown> = {};
            for (const uri of req.uris) {
              const st = svc.symbolManager.getSymbolTableForFile(uri);
              entries[uri] = st ? JSON.parse(JSON.stringify(st)) : null;
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
            const svc = yield* ensureDataOwnerServices;
            for (const entry of req.entries) {
              const storage = svc.storageManager.getStorage();
              void storage.setDocument(entry.uri, {
                uri: entry.uri,
                getText: () => entry.content,
                languageId: entry.languageId,
                version: entry.version,
              } as any);
            }
            yield* Effect.logDebug(
              `[DATA-OWNER] WorkspaceBatchIngest: session=${req.sessionId}, ` +
                `entries=${req.entries.length}`,
            );
            return { processedCount: req.entries.length };
          }),
        ),
      ),
    ),

  DispatchDocumentOpen: (req) =>
    guardRole('DispatchDocumentOpen').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const storage = svc.storageManager.getStorage();
            const doc = {
              uri: req.uri,
              getText: () => req.content,
              languageId: req.languageId,
              version: req.version,
            } as any;
            void storage.setDocument(req.uri, doc);
            const diagnostics = yield* Effect.promise(() =>
              svc.documentProcessingService.processDocumentOpenInternal({
                document: doc,
              }),
            );
            return {
              accepted: true,
              diagnostics: diagnostics
                ? JSON.parse(JSON.stringify(diagnostics))
                : undefined,
            };
          }),
        ),
      ),
    ),

  DispatchDocumentChange: (req) =>
    guardRole('DispatchDocumentChange').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const storage = svc.storageManager.getStorage();
            const doc = {
              uri: req.uri,
              getText: () => '',
              languageId: 'apex',
              version: req.version,
            } as any;
            void storage.setDocument(req.uri, doc);
            const diagnostics = yield* Effect.promise(() =>
              svc.documentProcessingService.processDocumentOpenInternal({
                document: doc,
              }),
            );
            return {
              accepted: true,
              diagnostics: diagnostics
                ? JSON.parse(JSON.stringify(diagnostics))
                : undefined,
            };
          }),
        ),
      ),
    ),

  DispatchDocumentSave: (req) =>
    guardRole('DispatchDocumentSave').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            yield* ensureDataOwnerServices;
            yield* Effect.logDebug(
              `[DATA-OWNER] DispatchDocumentSave: uri=${req.uri}`,
            );
            return { accepted: true };
          }),
        ),
      ),
    ),

  DispatchDocumentClose: (req) =>
    guardRole('DispatchDocumentClose').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            svc.documentCloseProcessingService.processDocumentClose({
              document: {
                uri: req.uri,
                getText: () => '',
                languageId: 'apex',
                version: 0,
              } as any,
            });
            return { accepted: true };
          }),
        ),
      ),
    ),

  // -- Enrichment/search pool handlers (Step 11) ----------------------------

  DispatchHover: (req) =>
    guardRole('DispatchHover').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.hoverService.processHover({
              textDocument: { uri: req.textDocument.uri },
              position: {
                line: req.position.line,
                character: req.position.character,
              },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

  DispatchDefinition: (req) =>
    guardRole('DispatchDefinition').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.definitionService.processDefinition({
              textDocument: { uri: req.textDocument.uri },
              position: {
                line: req.position.line,
                character: req.position.character,
              },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

  DispatchReferences: (req) =>
    guardRole('DispatchReferences').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.referencesService.processReferences({
              textDocument: { uri: req.textDocument.uri },
              position: {
                line: req.position.line,
                character: req.position.character,
              },
              context: {
                includeDeclaration: req.context.includeDeclaration,
              },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

  DispatchImplementation: (req) =>
    guardRole('DispatchImplementation').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.implementationService.processImplementation({
              textDocument: { uri: req.textDocument.uri },
              position: {
                line: req.position.line,
                character: req.position.character,
              },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

  DispatchDocumentSymbol: (req) =>
    guardRole('DispatchDocumentSymbol').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.documentSymbolService.processDocumentSymbol({
              textDocument: { uri: req.textDocument.uri },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

  DispatchCodeLens: (req) =>
    guardRole('DispatchCodeLens').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.codeLensService.processCodeLens({
              textDocument: { uri: req.textDocument.uri },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

  DispatchDiagnostic: (req) =>
    guardRole('DispatchDiagnostic').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const svc = yield* ensureEnrichmentServices;
          const result = yield* Effect.promise(() =>
            svc.diagnosticService.processDiagnostic({
              textDocument: { uri: req.textDocument.uri },
            }),
          );
          return { result: result ? JSON.parse(JSON.stringify(result)) : null };
        }),
      ),
    ),

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
          const serialized = JSON.parse(JSON.stringify(st));
          return { found: true, symbolTable: serialized };
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
};

// ---------------------------------------------------------------------------
// Worker→coordinator assistance proxy (Step 7)
//
// Workers that need client RPCs (e.g. apex/findMissingArtifact) send
// WorkerAssistanceRequest via parentPort. The coordinator's
// CoordinatorAssistanceMediator listens for these messages and
// responds with WorkerAssistanceResponse carrying the same correlationId.
// ---------------------------------------------------------------------------

import { parentPort } from 'node:worker_threads';

interface PendingAssistance {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

const pendingAssistanceRequests = new Map<string, PendingAssistance>();
let assistanceListenerAttached = false;
let assistanceIdCounter = 0;

function ensureAssistanceListener(): void {
  if (assistanceListenerAttached || !parentPort) return;
  assistanceListenerAttached = true;

  parentPort.on('message', (data: unknown) => {
    if (
      typeof data !== 'object' ||
      data === null ||
      (data as Record<string, unknown>)._tag !== 'WorkerAssistanceResponse'
    )
      return;

    const { correlationId, result, error } = data as {
      correlationId: string;
      result?: unknown;
      error?: string;
    };

    const pending = pendingAssistanceRequests.get(correlationId);
    if (!pending) return;
    pendingAssistanceRequests.delete(correlationId);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  });
}

/**
 * Request coordinator assistance for a client RPC.
 * Used by worker-side MissingArtifactResolutionService (Step 11) to
 * route apex/findMissingArtifact through the coordinator's LSP connection.
 */
export function requestCoordinatorAssistance(
  method: string,
  params: unknown,
  blocking: boolean,
): Promise<unknown> {
  ensureAssistanceListener();

  if (!parentPort) {
    return Promise.reject(
      new Error('requestCoordinatorAssistance: no parentPort (not a worker)'),
    );
  }

  const correlationId = `assist-${++assistanceIdCounter}-${Date.now()}`;

  return new Promise((resolve, reject) => {
    pendingAssistanceRequests.set(correlationId, { resolve, reject });

    parentPort!.postMessage({
      _tag: 'WorkerAssistanceRequest',
      correlationId,
      method,
      params,
      blocking,
    });
  });
}

// ---------------------------------------------------------------------------
// Bootstrap — Node worker runner
// ---------------------------------------------------------------------------

const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);

WorkerRunner.launch(Layer.provide(runnerLayer, NodeWorkerRunner.layer)).pipe(
  Effect.runFork,
);
