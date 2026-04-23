/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Step 7 — Coordinator-side assistance mediator.
 *
 * Listens for WorkerAssistanceRequest messages on dedicated MessagePorts
 * (one per worker, created in makeNodeWorkerLayer). Workers post
 * assistance requests via the dedicated port, keeping them off the main
 * Worker message channel so they don't interfere with @effect/platform's
 * wire protocol.
 *
 * Log forwarding still listens on the raw Worker handles.
 */

import type * as WorkerThreads from 'node:worker_threads';
import { Effect } from 'effect';
import {
  isAssistanceRequest,
  type AssistanceRequestPayload,
  type AssistanceResponsePayload,
  type LoggerInterface,
  type WorkerLogMessage,
} from '@salesforce/apex-lsp-shared';

export type AssistanceHandler = (
  method: string,
  params: unknown,
) => Promise<unknown>;

interface MessagePortLike {
  postMessage(value: unknown): void;
}

const DATA_OWNER_METHOD_PREFIX = 'dataOwner:';

export class CoordinatorAssistanceMediator {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly handler: AssistanceHandler,
    private readonly logger: LoggerInterface,
    private readonly dataOwnerHandler?: AssistanceHandler,
  ) {}

  attachToWorkers(
    workers: WorkerThreads.Worker[],
    assistancePorts?: WorkerThreads.MessagePort[],
    workerNames?: string[],
  ): void {
    for (let i = 0; i < workers.length; i++) {
      const workerIdx = i;
      const worker = workers[i];
      const port = assistancePorts?.[i];
      const label = workerNames?.[i] || `worker:${workerIdx}`;

      this.attachStderrForwarding(worker, label);

      if (port) {
        // Log forwarding and assistance on dedicated port
        port.on('message', (data: unknown) => {
          if (isLogMessage(data)) {
            this.forwardLogMessage(data, label);
            return;
          }
          if (!isAssistanceRequest(data)) return;
          Effect.runFork(this.handleRequest(data, port));
        });
      } else {
        // Fallback: log forwarding on main worker channel (browser workers)
        worker.on('message', (data: unknown) => {
          if (isLogMessage(data)) {
            this.forwardLogMessage(data, label);
          }
        });
        // Fallback: assistance on main channel (browser workers)
        worker.on('message', (data: unknown) => {
          if (!isAssistanceRequest(data)) return;
          Effect.runFork(
            this.handleRequest(data, worker as unknown as MessagePortLike),
          );
        });
      }
    }
    this.logger.alwaysLog(
      () =>
        `[AssistanceMediator] Attached to ${workers.length} worker(s)` +
        (assistancePorts ? ' with dedicated assistance ports' : ''),
    );
  }

  /**
   * Browser variant of attachToWorkers.
   * Each port is the coordinator end (port1Assist) of the MessageChannel whose
   * port2 was transferred to the worker via WorkerPortsInit. Mirrors
   * the Node path exactly — dedicated channel, no main-channel pollution.
   */
  attachToBrowserAssistancePorts(
    ports: import('./WorkerCoordinator').BrowserMessagePort[],
  ): void {
    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      const label = `browser-worker:${i}`;

      port.addEventListener('message', (event: { data: unknown }) => {
        const data = event.data;
        if (isLogMessage(data)) {
          this.forwardLogMessage(data, label);
          return;
        }
        if (!isAssistanceRequest(data)) return;
        Effect.runFork(
          this.handleRequest(data, {
            postMessage: (msg: unknown) => port.postMessage(msg),
          }),
        );
      });
      port.start();
    }
    this.logger.alwaysLog(
      () =>
        `[AssistanceMediator] Attached to ${ports.length} browser worker(s)`,
    );
  }

  private attachStderrForwarding(
    worker: WorkerThreads.Worker,
    label: string,
  ): void {
    if (!worker.stderr) return;
    let buffer = '';
    worker.stderr.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trimEnd();
        buffer = buffer.slice(newlineIdx + 1);
        if (line.length === 0) continue;
        this.logger.info(() => `[${label}] ${line}`);
      }
    });
  }

  private forwardLogMessage(msg: WorkerLogMessage, label: string): void {
    const prefixed = `[${label}] ${msg.message}`;
    switch (msg.level) {
      case 'error':
        this.logger.error(() => prefixed);
        break;
      case 'warning':
        this.logger.warn(() => prefixed);
        break;
      case 'info':
        this.logger.info(() => prefixed);
        break;
      case 'debug':
        this.logger.debug(() => prefixed);
        break;
    }
  }

  private resolveHandler(method: string): {
    handler: AssistanceHandler;
    effectiveMethod: string;
  } {
    if (method.startsWith(DATA_OWNER_METHOD_PREFIX) && this.dataOwnerHandler) {
      return {
        handler: this.dataOwnerHandler,
        effectiveMethod: method.slice(DATA_OWNER_METHOD_PREFIX.length),
      };
    }
    return { handler: this.handler, effectiveMethod: method };
  }

  private handleRequest(
    req: AssistanceRequestPayload,
    worker: MessagePortLike,
  ): Effect.Effect<void> {
    const { correlationId, method, params, blocking } = req;
    const { handler, effectiveMethod } = this.resolveHandler(method);

    return Effect.gen(this, function* () {
      const result = yield* Effect.tryPromise({
        try: () => {
          if (blocking) {
            return this.deduplicatedCall(
              correlationId,
              effectiveMethod,
              params,
              handler,
            );
          }
          handler(effectiveMethod, params).catch((err) => {
            this.logger.warn(() => `[AssistanceMediator] BG ${method}: ${err}`);
          });
          return Promise.resolve({ accepted: true } as unknown);
        },
        catch: (err) => err,
      });

      const response: AssistanceResponsePayload = {
        _tag: 'WorkerAssistanceResponse',
        correlationId,
        result,
      };
      worker.postMessage(response);
    }).pipe(
      Effect.catchAll((err) =>
        Effect.sync(() => {
          const response: AssistanceResponsePayload = {
            _tag: 'WorkerAssistanceResponse',
            correlationId,
            error: err instanceof Error ? err.message : String(err),
          };
          worker.postMessage(response);
        }),
      ),
    );
  }

  private deduplicatedCall(
    correlationId: string,
    method: string,
    params: unknown,
    handler: AssistanceHandler = this.handler,
  ): Promise<unknown> {
    const existing = this.inFlight.get(correlationId);
    if (existing) {
      this.logger.debug(
        () => `[AssistanceMediator] Dedup hit for ${correlationId}`,
      );
      return existing;
    }

    const promise = handler(method, params).finally(() => {
      this.inFlight.delete(correlationId);
    });
    this.inFlight.set(correlationId, promise);
    return promise;
  }

  dispose(): void {
    this.inFlight.clear();
  }
}

function isLogMessage(data: unknown): data is WorkerLogMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)._tag === 'WorkerLogMessage'
  );
}
