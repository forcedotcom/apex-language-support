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
 * Platform-neutral request/handler logic lives in worker.platform.shared.ts,
 * imported below with an explicit .ts extension (required for tsx-in-worker
 * resolution in integration tests). esbuild bundles it independently into
 * this entry, so the two esbuild outputs (Node CJS / Web IIFE) remain
 * fully self-contained with no cross-entry resolution at runtime.
 */

// Polyfills — must execute before any library code
import process from 'process';
import { Buffer } from 'buffer';

(globalThis as any).process = process;
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
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
  // @ts-ignore - .ts extension required for tsx-in-worker resolution in integration tests
} from './worker.platform.shared.ts';

// ---------------------------------------------------------------------------
// Worker ID (no process.pid in browser)
// ---------------------------------------------------------------------------

let workerIdCounter = 0;
const workerId = `worker-web-${Date.now()}-${++workerIdCounter}`;

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

setWorkerId(workerId);
setAssistanceTransport(requestCoordinatorAssistancePromise);
setResourceLoaderLayerFactory(makeResourceLoaderRemoteLayer);
setWarmRemoteStdlibNamespaceCache(warmRemoteStdlibNamespaceCache);

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
