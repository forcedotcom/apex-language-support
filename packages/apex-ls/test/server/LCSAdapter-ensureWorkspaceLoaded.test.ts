/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EventEmitter } from 'node:events';
import { Effect } from 'effect';
import {
  ensureWorkspaceLoaded,
  reset as resetWorkspaceLoadState,
} from '@salesforce/apex-lsp-compliant-services';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import type {
  AssistanceHandler,
  AssistanceRequestPayload,
} from '../../src/server/CoordinatorAssistanceMediator';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

function createSpyLogger(): LoggerInterface {
  const noop = () => {};
  return {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    log: noop,
    alwaysLog: noop,
  } as unknown as LoggerInterface;
}

function makeMockWorker(): EventEmitter & { postMessage: jest.Mock } {
  const emitter = new EventEmitter();
  (emitter as any).postMessage = jest.fn();
  return emitter as any;
}

function makeRequest(
  overrides?: Partial<AssistanceRequestPayload>,
): AssistanceRequestPayload {
  return {
    _tag: 'WorkerAssistanceRequest',
    correlationId: `test-${Date.now()}`,
    method: 'coordinator:EnsureWorkspaceLoaded',
    params: { workDoneToken: 'tok-1' },
    blocking: true,
    ...overrides,
  };
}

/**
 * Mirrors the LCSAdapter mediator's primary handler branch for
 * coordinator:EnsureWorkspaceLoaded. Exercising the live LCSAdapter would
 * require the full topology bootstrap; keeping the bridge logic in lock-step
 * with the production lambda gives the same coverage in isolation.
 */
function makePrimaryHandler(
  connection: { sendNotification: jest.Mock },
  logger: LoggerInterface,
): AssistanceHandler {
  return async (method, params) => {
    if (method === 'coordinator:EnsureWorkspaceLoaded') {
      const p = params as { workDoneToken?: string | number };
      await Effect.runPromise(
        ensureWorkspaceLoaded(connection as any, logger, p.workDoneToken),
      );
      return undefined;
    }
    throw new Error(`Unexpected method ${method}`);
  };
}

describe('LCSAdapter mediator: coordinator:EnsureWorkspaceLoaded', () => {
  let logger: LoggerInterface;

  beforeEach(() => {
    logger = createSpyLogger();
    resetWorkspaceLoadState();
  });

  it('fires apex/requestWorkspaceLoad on the LSP Connection when worker requests load', async () => {
    const sendNotification = jest.fn();
    const connection = { sendNotification };
    const handler = makePrimaryHandler(connection, logger);

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    worker.emit(
      'message',
      makeRequest({
        correlationId: 'c-ensure-load',
        params: { workDoneToken: 'progress-token-7' },
      }),
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(sendNotification).toHaveBeenCalledWith('apex/requestWorkspaceLoad', {
      workDoneToken: 'progress-token-7',
    });
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        _tag: 'WorkerAssistanceResponse',
        correlationId: 'c-ensure-load',
        result: undefined,
      }),
    );
  });

  it('skips notification when workspace already loading (state guard)', async () => {
    const sendNotification = jest.fn();
    const connection = { sendNotification };
    const handler = makePrimaryHandler(connection, logger);

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    worker.emit('message', makeRequest({ correlationId: 'c1' }));
    await new Promise((r) => setTimeout(r, 30));
    worker.emit('message', makeRequest({ correlationId: 'c2' }));
    await new Promise((r) => setTimeout(r, 30));

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });
});
