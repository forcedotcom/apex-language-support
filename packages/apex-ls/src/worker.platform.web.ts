/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser worker entry point (Step 10).
 *
 * Mirror of worker.platform.ts but bootstrapped with BrowserWorkerRunner
 * and using self.postMessage for the assistance proxy. Polyfills match
 * webWorkerServer.ts (process, Buffer, global).
 *
 * Kept as a standalone file (no local imports) so that each esbuild
 * entry bundles independently without cross-file resolution issues
 * at test time (tsx worker threads).
 */

// Polyfills — must execute before any library code
import process from 'process';
import { Buffer } from 'buffer';

(globalThis as any).process = process;
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
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

const notImplementedYet = (tag: string): Effect.Effect<never> =>
  Effect.die(
    new Error(
      `WorkerHandler: '${tag}' not yet implemented (wired in later steps)`,
    ),
  );

// ---------------------------------------------------------------------------
// Data-owner internal tiered queue (Step 5)
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
    return Effect.succeed({ ready: true });
  },

  PingWorker: (req) =>
    guardRole('PingWorker').pipe(Effect.map(() => ({ echo: req.echo }))),

  QuerySymbolSubset: (req) =>
    guardRole('QuerySymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.succeed({
            entries: Object.fromEntries(
              req.uris.map((uri) => [uri, { mock: true }]),
            ),
          }),
        ),
      ),
    ),

  WorkspaceBatchIngest: (req) =>
    guardRole('WorkspaceBatchIngest').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            yield* Effect.logDebug(
              `[DATA-OWNER] WorkspaceBatchIngest: session=${req.sessionId}, ` +
                `entries=${req.entries.length}`,
            );
            return { processedCount: req.entries.length };
          }),
        ),
      ),
    ),

  DispatchDocumentOpen: () =>
    guardRole('DispatchDocumentOpen').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(notImplementedYet('DispatchDocumentOpen')),
      ),
    ),

  DispatchDocumentChange: () =>
    guardRole('DispatchDocumentChange').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(notImplementedYet('DispatchDocumentChange')),
      ),
    ),

  DispatchDocumentSave: () =>
    guardRole('DispatchDocumentSave').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(notImplementedYet('DispatchDocumentSave')),
      ),
    ),

  DispatchDocumentClose: () =>
    guardRole('DispatchDocumentClose').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(notImplementedYet('DispatchDocumentClose')),
      ),
    ),

  DispatchHover: () =>
    guardRole('DispatchHover').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchHover')),
    ),

  DispatchDefinition: () =>
    guardRole('DispatchDefinition').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDefinition')),
    ),

  DispatchReferences: () =>
    guardRole('DispatchReferences').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchReferences')),
    ),

  DispatchImplementation: () =>
    guardRole('DispatchImplementation').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchImplementation')),
    ),

  DispatchDocumentSymbol: () =>
    guardRole('DispatchDocumentSymbol').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDocumentSymbol')),
    ),

  DispatchCodeLens: () =>
    guardRole('DispatchCodeLens').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchCodeLens')),
    ),

  DispatchDiagnostic: () =>
    guardRole('DispatchDiagnostic').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDiagnostic')),
    ),

  DispatchGenericLspRequest: () =>
    guardRole('DispatchGenericLspRequest').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchGenericLspRequest')),
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
// Worker→coordinator assistance proxy (Step 7 — browser transport)
//
// Uses self.postMessage / self.addEventListener instead of parentPort.
// Messages are JSON-roundtripped to strip non-cloneable values.
// ---------------------------------------------------------------------------

interface PendingAssistance {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

const pendingAssistanceRequests = new Map<string, PendingAssistance>();
let assistanceListenerAttached = false;
let assistanceIdCounter = 0;

function ensureAssistanceListener(): void {
  if (assistanceListenerAttached) return;
  assistanceListenerAttached = true;

  self.addEventListener('message', (event: MessageEvent) => {
    const data = event.data;
    if (
      typeof data !== 'object' ||
      data === null ||
      data._tag !== 'WorkerAssistanceResponse'
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
 * Request coordinator assistance for a client RPC (browser variant).
 */
export function requestCoordinatorAssistance(
  method: string,
  params: unknown,
  blocking: boolean,
): Promise<unknown> {
  ensureAssistanceListener();

  const correlationId = `assist-${++assistanceIdCounter}-${Date.now()}`;

  return new Promise((resolve, reject) => {
    pendingAssistanceRequests.set(correlationId, { resolve, reject });

    const msg = JSON.parse(
      JSON.stringify({
        _tag: 'WorkerAssistanceRequest',
        correlationId,
        method,
        params,
        blocking,
      }),
    );
    self.postMessage(msg);
  });
}

// ---------------------------------------------------------------------------
// Bootstrap — Browser worker runner
// ---------------------------------------------------------------------------

const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);

WorkerRunner.launch(Layer.provide(runnerLayer, BrowserWorkerRunner.layer)).pipe(
  Effect.runFork,
);
