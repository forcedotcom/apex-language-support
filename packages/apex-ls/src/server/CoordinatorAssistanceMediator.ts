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
 * Listens for WorkerAssistanceRequest messages on raw Worker handles.
 * Workers that need client RPCs (e.g. apex/findMissingArtifact) post
 * these messages via parentPort. The mediator delegates to the provided
 * handler (typically connection.sendRequest), deduplicates concurrent
 * requests, and sends WorkerAssistanceResponse back to the originating
 * worker.
 *
 * Uses a side-channel on the same Worker MessagePort — safe because
 * @effect/platform's protocol uses a different message envelope format.
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

export class CoordinatorAssistanceMediator {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly handler: AssistanceHandler,
    private readonly logger: LoggerInterface,
  ) {}

  attachToWorkers(workers: WorkerThreads.Worker[]): void {
    for (let i = 0; i < workers.length; i++) {
      const workerIdx = i;
      const worker = workers[i];
      worker.on('message', (data: unknown) => {
        if (isLogMessage(data)) {
          this.forwardLogMessage(data, workerIdx);
          return;
        }
        if (!isAssistanceRequest(data)) return;
        Effect.runFork(this.handleRequest(data, worker));
      });
    }
    this.logger.debug(
      () => `[AssistanceMediator] Attached to ${workers.length} worker(s)`,
    );
  }

  private forwardLogMessage(msg: WorkerLogMessage, workerIdx: number): void {
    const prefixed = `[worker:${workerIdx}] ${msg.message}`;
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

  private handleRequest(
    req: AssistanceRequestPayload,
    worker: WorkerThreads.Worker,
  ): Effect.Effect<void> {
    const { correlationId, method, params, blocking } = req;

    return Effect.gen(this, function* () {
      const result = yield* Effect.tryPromise({
        try: () => {
          if (blocking) {
            return this.deduplicatedCall(correlationId, method, params);
          }
          this.handler(method, params).catch((err) => {
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
  ): Promise<unknown> {
    const existing = this.inFlight.get(correlationId);
    if (existing) {
      this.logger.debug(
        () => `[AssistanceMediator] Dedup hit for ${correlationId}`,
      );
      return existing;
    }

    const promise = this.handler(method, params).finally(() => {
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
