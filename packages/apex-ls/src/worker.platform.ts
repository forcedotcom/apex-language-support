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
import * as Worker from '@effect/platform/Worker';
import * as NodeWorkerRunner from '@effect/platform-node/NodeWorkerRunner';
import * as NodeWorker from '@effect/platform-node/NodeWorker';
import { Cause, Effect, Layer, Logger, LogLevel } from 'effect';
import {
  InitializeCompilationWorker,
  isAssistanceResponse,
  type CompilationWorkerRequest,
  type WorkerLogMessage,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';
import {
  initWorkerTracing,
  getActiveWorkerTraceContext,
  provideWorkerTracing,
  withExtractedTraceContext,
} from '@salesforce/apex-lsp-shared/observability/workerTracing';

import {
  handlers,
  AllWorkerRequests,
  setAssistanceTransport,
  setAssignedRole,
  setWorkerId,
  setResourceLoaderLayerFactory,
  setWorkerTracingHooks,
  setWarmRemoteStdlibNamespaceCache,
  setFqnIndex,
  currentWorkerLogLevel,
  // @ts-ignore - .ts extension required for tsx-in-worker resolution in integration tests
} from './worker.platform.shared.ts';
import {
  CompilationWorkerPool,
  fromSerializedWorkerPool,
  makeSerializedWorkerPoolReadiness,
  unavailableCompilationWorkerPool,
  withCompilationWorkerStartupTimeout,
} from './compiler/CompilationWorkerPool.ts';

import { availableParallelism } from 'node:os';
import {
  MessageChannel,
  parentPort,
  workerData,
  Worker as NodeWorkerThread,
} from 'node:worker_threads';

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

// Dedicated port for assistance requests — avoids polluting the main
// Worker channel that @effect/platform uses for its wire protocol.
const assistPort: import('node:worker_threads').MessagePort | null =
  ((workerData as Record<string, unknown> | undefined)?.assistPort as
    import('node:worker_threads').MessagePort | null) ?? null;

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
  // Capture synchronously while the caller's Effect span is still active.
  // The Promise adapter below starts a separate Effect runtime.
  const traceContext = getActiveWorkerTraceContext();

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
        ...(traceContext ? { traceContext } : {}),
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

// Load FQN index at module level for worker use
let fqnIndex: Map<string, string> | null = null;
(async () => {
  try {
    const { getEmbeddedFqnIndexDataUrl, loadFqnIndexFromGzip } =
      await import('@salesforce/apex-lsp-parser-ast');
    const dataUrl = getEmbeddedFqnIndexDataUrl();
    if (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      const buffer = Uint8Array.from(Buffer.from(base64, 'base64'));
      fqnIndex = loadFqnIndexFromGzip(buffer);
      setFqnIndex(fqnIndex);
    }
  } catch {
    // Expected in unbundled/dev builds; fall through to IPC
  }
})();

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
        // Local resolution from embedded FQN index (zero IPC)
        if (fqnIndex) {
          const normalizedInput = className.replace(/\.cls$/i, '');
          const pathParts = normalizedInput.split(/[/.\\]/).filter(Boolean);

          // Qualified input (namespace.class): try qualified key only
          if (pathParts.length >= 2) {
            const qualifiedKey = pathParts.join('.').toLowerCase();
            const fqn = fqnIndex.get(qualifiedKey);
            // If user specified a namespace explicitly, respect it — don't fall
            // through to unqualified. Return fqn or null (miss = wrong namespace).
            if (fqn) return fqn;
            // Miss: the specified namespace doesn't have this class (or non-stdlib)
            // Fall through to IPC for non-stdlib user types or edge cases
          } else if (pathParts.length === 1) {
            // Unqualified input: try unqualified key
            const unqualifiedKey = pathParts[0].toLowerCase();
            const fqn = fqnIndex.get(unqualifiedKey);
            if (fqn) return fqn;
            // Miss: unknown class, fall through to IPC
          }
        }

        // Fallback: IPC to resourceLoader worker (unbundled/dev, or unknown class)
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
setWorkerTracingHooks({
  initialize: initWorkerTracing,
  provide: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    provideWorkerTracing<A, E, R>()(effect),
  withParent: withExtractedTraceContext,
});

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

const runtimeWorkerData = workerData as
  | {
      role?: string;
      compilationPoolSize?: number;
      compilationConcurrency?: number;
      workerScript?: string;
    }
  | undefined;
if (runtimeWorkerData?.role === 'compiler') {
  setAssignedRole('compiler');
}
const requestedCompilationPoolSize = Math.max(
  1,
  Math.floor(runtimeWorkerData?.compilationPoolSize ?? 2),
);
const compilationPoolSize = Math.min(
  requestedCompilationPoolSize,
  Math.max(1, availableParallelism() - 2),
);
const compilationConcurrency = Math.max(
  1,
  Math.floor(runtimeWorkerData?.compilationConcurrency ?? 1),
);
const workerScript =
  typeof __filename !== 'undefined'
    ? __filename
    : runtimeWorkerData?.workerScript;

const spawnCompilerWorker = (): NodeWorkerThread => {
  if (!workerScript) {
    throw new Error('Worker script path is required to spawn compiler workers');
  }
  const compilerAssist = new MessageChannel();
  compilerAssist.port1.on('message', (message: unknown) => {
    assistPort?.postMessage(message);
  });
  const worker = new NodeWorkerThread(workerScript, {
    workerData: {
      role: 'compiler',
      assistPort: compilerAssist.port2,
    },
    transferList: [compilerAssist.port2],
    execArgv: workerScript.endsWith('.ts') ? ['--import', 'tsx'] : [],
  });
  worker.once('exit', () => compilerAssist.port1.close());
  return worker;
};

const CompilationWorkerPoolLive =
  runtimeWorkerData?.role === 'dataOwner'
    ? Layer.scoped(
        CompilationWorkerPool,
        Effect.gen(function* () {
          const readiness =
            yield* makeSerializedWorkerPoolReadiness(compilationPoolSize);
          return yield* withCompilationWorkerStartupTimeout(
            Effect.gen(function* () {
              const pool =
                yield* Worker.makePoolSerialized<CompilationWorkerRequest>({
                  size: compilationPoolSize,
                  concurrency: compilationConcurrency,
                  initialMessage: () => new InitializeCompilationWorker({}),
                  onCreate: readiness.onCreate,
                });
              yield* readiness.awaitReady;
              return fromSerializedWorkerPool(
                pool,
                compilationPoolSize,
                compilationConcurrency,
              );
            }),
            readiness.initialized,
            compilationPoolSize,
          );
        }).pipe(Effect.provide(NodeWorker.layer(spawnCompilerWorker))),
      )
    : Layer.succeed(CompilationWorkerPool, unavailableCompilationWorkerPool);

// ---------------------------------------------------------------------------
// Re-export shared functions for testing
// ---------------------------------------------------------------------------

export {
  recompileCursorFileAtFullDetail,
  loadDependentsForReferences,
  resolveMissingNamesViaDataOwner,
  scanCandidatesForOccurrences,
  targetSymbolForCursor,
  declarationLocationForCursor,
  resolveOccurrencesForCursor,
  // @ts-ignore - .ts extension required for tsx-in-worker resolution in integration tests
} from './worker.platform.shared.ts';

const workerProgram = WorkerRunner.launch(
  Layer.provide(
    runnerLayer,
    Layer.merge(NodeWorkerRunner.layer, CompilationWorkerPoolLive),
  ),
).pipe(Effect.provide(WorkerLoggerLayer));

// WorkerRunner completes only after receiving the platform shutdown message
// and closing every managed layer (including the nested compilation pool).
// Explicitly terminate the worker at that boundary: worker_threads can retain
// internal MessagePort handles after parentPort.close(), causing the parent
// manager to wait for its five-second forced-termination fallback per level.
void Effect.runPromiseExit(workerProgram).then((exit) => {
  if (exit._tag === 'Failure' && !Cause.isInterruptedOnly(exit.cause)) {
    console.error(`Apex worker runner failed: ${Cause.pretty(exit.cause)}`);
    process.exit(1);
  }
  process.exit(0);
});
