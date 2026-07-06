/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Node worker entry point.
 *
 * Spawned by the coordinator (WorkerCoordinator). The first message is
 * always WorkerInit, which assigns the worker's role. Subsequent messages
 * are validated against the role's allowed-tag set — disallowed tags cause
 * a defect (defense-in-depth against coordinator misrouting).
 *
 * Platform-neutral request/handler logic lives in worker.platform.shared.ts,
 * imported below. This file supplies the Node-specific pieces: worker_threads
 * transport, resource-loader remote layer, and logger wiring.
 */

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as NodeWorkerRunner from '@effect/platform-node/NodeWorkerRunner';
import { Effect, Layer, Logger, LogLevel } from 'effect';
import {
  isAssistanceResponse,
  type WorkerLogMessage,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';
import {
  handlers,
  AllWorkerRequests,
  setAssistanceTransport,
  setWorkerId,
  setResourceLoaderLayerFactory,
  setWarmRemoteStdlibNamespaceCache,
  currentWorkerLogLevel,
  resolveMissingNamesViaDataOwner,
  loadDependentsForReferences,
  recompileCursorFileAtFullDetail,
  declaringFileForCursorSymbol,
} from './worker.platform.shared.ts';

// Re-exported for existing test imports that still reference this path
// (test/server/resolveMissingNamesViaDataOwner.test.ts,
// test/server/loadDependentsForReferences.node.test.ts,
// test/server/referenceEnrichmentRecipe.node.test.ts). Task 8 repoints these
// to import from worker.platform.shared.ts directly, at which point this
// re-export block can be removed.
export {
  resolveMissingNamesViaDataOwner,
  loadDependentsForReferences,
  recompileCursorFileAtFullDetail,
  declaringFileForCursorSymbol,
};

// ---------------------------------------------------------------------------
// Worker ID for write-back tracking
// ---------------------------------------------------------------------------

let workerIdCounter = 0;
const workerId = `worker-${process.pid}-${Date.now()}-${++workerIdCounter}`;

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

    // Include workerId: the counter + Date.now() are per-worker, so two
    // different workers issuing their Nth assist in the same millisecond would
    // otherwise collide on the same correlationId and the coordinator mediator
    // would dedup them as one call (dropping one worker's request). workerId is
    // globally unique, so this makes correlationIds unique across all workers.
    const correlationId = `assist-${workerId}-${++assistanceIdCounter}-${Date.now()}`;

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

setWorkerId(workerId);
setAssistanceTransport(requestCoordinatorAssistancePromise);
setResourceLoaderLayerFactory(makeResourceLoaderRemoteLayer);
setWarmRemoteStdlibNamespaceCache(warmRemoteStdlibNamespaceCache);

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

// ---------------------------------------------------------------------------
// Bootstrap — Node worker runner
// ---------------------------------------------------------------------------

const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);

WorkerRunner.launch(Layer.provide(runnerLayer, NodeWorkerRunner.layer)).pipe(
  Effect.provide(WorkerLoggerLayer),
  Effect.runFork,
);
