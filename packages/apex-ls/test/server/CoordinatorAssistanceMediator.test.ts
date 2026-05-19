/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EventEmitter } from 'node:events';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import type {
  AssistanceHandler,
  AssistanceRequestPayload,
  AssistanceResponsePayload,
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
    method: 'apex/findMissingArtifact',
    params: { identifiers: [{ name: 'Foo' }] },
    blocking: true,
    ...overrides,
  };
}

describe('CoordinatorAssistanceMediator', () => {
  let logger: LoggerInterface;

  beforeEach(() => {
    logger = createSpyLogger();
  });

  it('routes blocking request to handler and responds', async () => {
    const handler: AssistanceHandler = jest
      .fn()
      .mockResolvedValue({ opened: ['file:///Foo.cls'] });

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    const req = makeRequest({ correlationId: 'c1' });
    worker.emit('message', req);

    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalledWith(
      'apex/findMissingArtifact',
      req.params,
    );

    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        _tag: 'WorkerAssistanceResponse',
        correlationId: 'c1',
        result: { opened: ['file:///Foo.cls'] },
      }),
    );
  });

  it('routes background request as fire-and-forget', async () => {
    const handler: AssistanceHandler = jest
      .fn()
      .mockResolvedValue({ accepted: true });

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    const req = makeRequest({ correlationId: 'c2', blocking: false });
    worker.emit('message', req);

    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalledWith(
      'apex/findMissingArtifact',
      req.params,
    );

    const response = worker.postMessage.mock
      .calls[0][0] as AssistanceResponsePayload;
    expect(response._tag).toBe('WorkerAssistanceResponse');
    expect(response.correlationId).toBe('c2');
    expect(response.result).toEqual({ accepted: true });
  });

  it('responds with error when handler rejects', async () => {
    const handler: AssistanceHandler = jest
      .fn()
      .mockRejectedValue(new Error('connection lost'));

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    const req = makeRequest({ correlationId: 'c3' });
    worker.emit('message', req);

    await new Promise((r) => setTimeout(r, 50));

    const response = worker.postMessage.mock
      .calls[0][0] as AssistanceResponsePayload;
    expect(response._tag).toBe('WorkerAssistanceResponse');
    expect(response.correlationId).toBe('c3');
    expect(response.error).toBe('connection lost');
  });

  it('deduplicates concurrent blocking requests with same correlationId', async () => {
    let callCount = 0;
    const handler: AssistanceHandler = jest.fn().mockImplementation(() => {
      callCount++;
      return new Promise((resolve) =>
        setTimeout(() => resolve({ opened: ['file:///Foo.cls'] }), 100),
      );
    });

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    const req1 = makeRequest({ correlationId: 'dup-1' });
    const req2 = makeRequest({ correlationId: 'dup-1' });
    worker.emit('message', req1);
    worker.emit('message', req2);

    await new Promise((r) => setTimeout(r, 200));

    expect(callCount).toBe(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });

  it('ignores non-assistance messages', async () => {
    const handler: AssistanceHandler = jest.fn();
    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker = makeMockWorker();
    mediator.attachToWorkers([worker as any]);

    worker.emit('message', { _tag: 'SomethingElse', data: 123 });
    worker.emit('message', [0, 1, 'platform-message']);
    worker.emit('message', null);
    worker.emit('message', 42);

    await new Promise((r) => setTimeout(r, 50));
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles multiple workers independently', async () => {
    const handler: AssistanceHandler = jest
      .fn()
      .mockResolvedValue({ notFound: true });

    const mediator = new CoordinatorAssistanceMediator(handler, logger);
    const worker1 = makeMockWorker();
    const worker2 = makeMockWorker();
    mediator.attachToWorkers([worker1 as any, worker2 as any]);

    worker1.emit('message', makeRequest({ correlationId: 'w1' }));
    worker2.emit('message', makeRequest({ correlationId: 'w2' }));

    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalledTimes(2);
    expect(worker1.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'w1' }),
    );
    expect(worker2.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'w2' }),
    );
  });
});
