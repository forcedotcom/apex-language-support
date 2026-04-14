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

const ensureDataOwnerServices: Effect.Effect<DataOwnerServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { bootstrapDataOwnerServices } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const svc = yield* Effect.promise(() => bootstrapDataOwnerServices());
        yield* Effect.logInfo('[DATA-OWNER] services bootstrapped');
        return svc;
      }),
    ),
  );

const ensureEnrichmentServices: Effect.Effect<EnrichmentServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { bootstrapEnrichmentServices } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const svc = yield* Effect.promise(() => bootstrapEnrichmentServices());
        yield* Effect.logInfo('[ENRICHMENT] services bootstrapped');
        return svc;
      }),
    ),
  );

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
};
type DocOnlyReq = { textDocument: { uri: string } };
type RefsReq = PositionReq & { context: { includeDeclaration: boolean } };

const enrichmentHandlers = {
  DispatchHover: enrichmentHandler<PositionReq>('DispatchHover', (svc, req) =>
    svc.hoverService.processHover({
      textDocument: { uri: req.textDocument.uri },
      position: req.position,
    }),
  ),
  DispatchDefinition: enrichmentHandler<PositionReq>(
    'DispatchDefinition',
    (svc, req) =>
      svc.definitionService.processDefinition({
        textDocument: { uri: req.textDocument.uri },
        position: req.position,
      }),
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
    (svc, req) =>
      svc.diagnosticService.processDiagnostic({
        textDocument: { uri: req.textDocument.uri },
      }),
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
    return Effect.gen(function* () {
      yield* Effect.logInfo(
        `[worker] role=${req.role} protocol=v${req.protocolVersion}/${WIRE_PROTOCOL_VERSION}` +
          ` logLevel=${currentWorkerLogLevel}`,
      );
    }).pipe(Effect.flatMap(() => handleWorkerInitRole(req)));
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
              entries[uri] = cloneForWire(st);
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
              const doc: WorkerDocument = {
                uri: entry.uri,
                getText: () => entry.content,
                languageId: entry.languageId,
                version: entry.version,
              };
              void storage.setDocument(entry.uri, doc as never);
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
        const diagnostics = yield* Effect.promise(() =>
          svc.documentProcessingService.processDocumentOpenInternal({
            document: doc as never,
          }),
        );
        return {
          accepted: true,
          diagnostics: cloneForWire(diagnostics) ?? undefined,
        };
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
        const diagnostics = yield* Effect.promise(() =>
          svc.documentProcessingService.processDocumentOpenInternal({
            document: doc as never,
          }),
        );
        return {
          accepted: true,
          diagnostics: cloneForWire(diagnostics) ?? undefined,
        };
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

const pendingAssistanceCallbacks = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();
let assistanceListenerAttached = false;
let assistanceIdCounter = 0;

function ensureAssistanceListener(): void {
  if (assistanceListenerAttached || !parentPort) return;
  assistanceListenerAttached = true;

  parentPort.on('message', (data: unknown) => {
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

    if (!parentPort) {
      return yield* Effect.fail(
        new AssistanceError('no parentPort (not a worker)'),
      );
    }

    const correlationId = `assist-${++assistanceIdCounter}-${Date.now()}`;

    const result = yield* Effect.async<unknown, AssistanceError>((resume) => {
      pendingAssistanceCallbacks.set(correlationId, {
        resolve: (value) => resume(Effect.succeed(value)),
        reject: (error) =>
          resume(Effect.fail(new AssistanceError(error.message))),
      });

      parentPort!.postMessage({
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
  if (!parentPort) return;
  const wireLevel = effectLogLevelToWire(logLevel);
  if (!wireLevel) return;
  if (LOG_LEVEL_PRIORITY[wireLevel] < LOG_LEVEL_PRIORITY[currentWorkerLogLevel])
    return;

  const msg: WorkerLogMessage = {
    _tag: 'WorkerLogMessage',
    level: wireLevel,
    message: typeof message === 'string' ? message : String(message),
  };
  parentPort.postMessage(msg);
});

// Disabled: posting WorkerLogMessage to parentPort collides with the
// @effect/platform worker protocol on the same MessagePort, crashing
// the worker fiber runtime. Needs a dedicated MessageChannel for logs.
const _WorkerLoggerLayer = Logger.replace(Logger.defaultLogger, workerLogger);

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
  // Effect.provide(_WorkerLoggerLayer), // see comment above
  Effect.runFork,
);
