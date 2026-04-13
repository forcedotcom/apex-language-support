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
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

export interface AssistanceRequestPayload {
  readonly _tag: 'WorkerAssistanceRequest';
  readonly correlationId: string;
  readonly method: string;
  readonly params: unknown;
  readonly blocking: boolean;
}

export interface AssistanceResponsePayload {
  readonly _tag: 'WorkerAssistanceResponse';
  readonly correlationId: string;
  readonly result?: unknown;
  readonly error?: string;
}

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

  /**
   * Attach message listeners to all raw worker handles.
   * Filters for WorkerAssistanceRequest-tagged messages; ignores
   * all others (platform protocol messages pass through untouched).
   */
  attachToWorkers(workers: WorkerThreads.Worker[]): void {
    for (const worker of workers) {
      worker.on('message', (data: unknown) => {
        if (!isAssistanceRequest(data)) return;
        void this.handleRequest(data, worker);
      });
    }
    this.logger.debug(
      () => `[AssistanceMediator] Attached to ${workers.length} worker(s)`,
    );
  }

  private async handleRequest(
    req: AssistanceRequestPayload,
    worker: WorkerThreads.Worker,
  ): Promise<void> {
    const { correlationId, method, params, blocking } = req;

    try {
      let result: unknown;
      if (blocking) {
        result = await this.deduplicatedCall(correlationId, method, params);
      } else {
        const m = method;
        this.handler(method, params).catch((err) => {
          this.logger.warn(() => `[AssistanceMediator] BG ${m}: ${err}`);
        });
        result = { accepted: true };
      }

      const response: AssistanceResponsePayload = {
        _tag: 'WorkerAssistanceResponse',
        correlationId,
        result,
      };
      worker.postMessage(response);
    } catch (err) {
      const response: AssistanceResponsePayload = {
        _tag: 'WorkerAssistanceResponse',
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      };
      worker.postMessage(response);
    }
  }

  private async deduplicatedCall(
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

function isAssistanceRequest(data: unknown): data is AssistanceRequestPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)._tag === 'WorkerAssistanceRequest'
  );
}
