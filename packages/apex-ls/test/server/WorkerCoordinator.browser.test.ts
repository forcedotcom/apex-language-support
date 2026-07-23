/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { makeBrowserWorkerLayerFactory } from '../../src/server/WorkerCoordinator';
import { Effect, Layer } from 'effect';

describe('browser worker layer factory', () => {
  const workerUrl = 'https://example.test/dist/worker.platform.web.js';
  const originalFetch = globalThis.fetch;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    jest.restoreAllMocks();
  });

  it('loads one common bundle before exposing role-specific layers', async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => '/* worker */',
    }) as typeof fetch;
    URL.createObjectURL = jest.fn().mockReturnValueOnce('blob:worker');

    const factory = await makeBrowserWorkerLayerFactory(workerUrl, {
      compilationPoolSize: 3,
      compilationConcurrency: 2,
    });

    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, workerUrl);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(factory('dataOwner')).toBeDefined();
    expect(factory('lspRequest')).toBeDefined();
  });

  it('revokes the common worker blob when the worker layer scope closes', async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => '/* worker */',
    }) as typeof fetch;
    URL.createObjectURL = jest.fn().mockReturnValueOnce('blob:worker');
    URL.revokeObjectURL = jest.fn();

    const factory = await makeBrowserWorkerLayerFactory(workerUrl, {
      compilationPoolSize: 1,
      compilationConcurrency: 1,
    });

    await Effect.runPromise(Effect.scoped(Layer.build(factory('lspRequest'))));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:worker');
  });

  it('fails topology preparation when the common bundle is unavailable', async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }) as typeof fetch;

    await expect(
      makeBrowserWorkerLayerFactory(workerUrl, {
        compilationPoolSize: 1,
        compilationConcurrency: 1,
      }),
    ).rejects.toThrow('Unable to load browser worker bundle');
  });
});
