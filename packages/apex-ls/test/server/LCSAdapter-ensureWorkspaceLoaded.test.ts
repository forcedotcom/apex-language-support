/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EventEmitter } from 'node:events';
import { reset as resetWorkspaceLoadState } from '@salesforce/apex-lsp-compliant-services';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import type { AssistanceRequestPayload } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
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

describe('LCSAdapter primary assistance handler — coordinator:EnsureWorkspaceLoaded', () => {
  let logger: LoggerInterface;

  beforeEach(() => {
    logger = createSpyLogger();
    resetWorkspaceLoadState();
  });

  it('fires apex/requestWorkspaceLoad on the LSP Connection when worker requests load', async () => {
    const sendNotification = jest.fn();
    const sendRequest = jest.fn();
    // Wire the production primary handler into the production mediator —
    // the same pair of objects LCSAdapter constructs in
    // initializeWorkerTopology. Any drift in the live branching logic
    // surfaces here.
    const handler = createPrimaryAssistanceHandler({
      connection: { sendNotification, sendRequest } as any,
      logger,
      getResourceLoaderProxy: () => undefined,
    });
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
    // The catch-all sendRequest must NOT have been hit — the
    // coordinator:EnsureWorkspaceLoaded branch must short-circuit before
    // falling through to the LSP wire.
    expect(sendRequest).not.toHaveBeenCalled();
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
    const handler = createPrimaryAssistanceHandler({
      connection: { sendNotification, sendRequest: jest.fn() } as any,
      logger,
      getResourceLoaderProxy: () => undefined,
    });
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

  it('falls through to connection.sendRequest for unknown methods', async () => {
    // Regression guard: only the recognised coordinator:* and
    // resourceLoader:* prefixes are intercepted. Anything else must hit
    // the LSP wire so the client can handle it.
    const sendRequest = jest.fn().mockResolvedValue({ ok: true });
    const handler = createPrimaryAssistanceHandler({
      connection: { sendRequest, sendNotification: jest.fn() } as any,
      logger,
      getResourceLoaderProxy: () => undefined,
    });

    const result = await handler('client/registerCapability', { id: 'x' });

    expect(sendRequest).toHaveBeenCalledWith('client/registerCapability', {
      id: 'x',
    });
    expect(result).toEqual({ ok: true });
  });
});
