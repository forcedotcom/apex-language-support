/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

const traceContext = '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01';

jest.mock('../../src/server/traceContextInjection', () => ({
  injectTraceContextFromOtelSpan: jest.fn(
    (payload: Record<string, unknown>) => ({
      ...payload,
      traceContext: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    }),
  ),
}));

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    runWithSpan: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  };
});

describe('ResourceLoaderProxy tracing', () => {
  it('forwards the active assistance span to the resource-loader worker', async () => {
    const messages: Array<Record<string, unknown>> = [];
    const worker = {
      executeEffect: (message: Record<string, unknown>) => {
        messages.push(message);
        return Effect.succeed({ found: false });
      },
    } as any;
    const logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      alwaysLog: jest.fn(),
    } as unknown as LoggerInterface;
    const proxy = new ResourceLoaderProxy(worker, logger);

    await proxy.getFile('System/String.cls');

    expect(messages).toHaveLength(1);
    expect(messages[0].traceContext).toBe(traceContext);
  });

  it('records caller-side cache waits for both misses and hits', async () => {
    const worker = {
      executeEffect: jest.fn(() => Effect.succeed({ found: false })),
    } as any;
    const logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      alwaysLog: jest.fn(),
    } as unknown as LoggerInterface;
    const proxy = new ResourceLoaderProxy(worker, logger);

    await proxy.resolveStandardClassFqn('System.String');
    await proxy.resolveStandardClassFqn('System.String');

    const { runWithSpan } = jest.requireMock('@salesforce/apex-lsp-shared') as {
      runWithSpan: jest.Mock;
    };
    const calls = runWithSpan.mock.calls.filter(
      ([name]) => name === 'resourceLoader.proxy.resolveClass',
    );
    expect(calls).toHaveLength(2);
    expect(calls[0][2]['resource.cache_hit']).toBe(false);
    expect(calls[1][2]['resource.cache_hit']).toBe(true);
    expect(worker.executeEffect).toHaveBeenCalledTimes(1);
  });
});
