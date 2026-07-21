/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { makeBrowserWorkerLayerFactory } from '../../src/server/WorkerCoordinator';

describe('browser worker layer factory', () => {
  const workerUrl = 'https://example.test/dist/worker.platform.web.js';
  const compilerUrl = 'https://example.test/dist/compiler.worker.web.js';
  const originalFetch = globalThis.fetch;
  const originalCreateObjectUrl = URL.createObjectURL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectUrl;
    jest.restoreAllMocks();
  });

  it('loads both bundles before exposing role-specific layers', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '/* worker */',
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '/* compiler */',
      }) as typeof fetch;
    URL.createObjectURL = jest
      .fn()
      .mockReturnValueOnce('blob:worker')
      .mockReturnValueOnce('blob:compiler');

    const factory = await makeBrowserWorkerLayerFactory(
      workerUrl,
      compilerUrl,
      { compilationPoolSize: 3, compilationConcurrency: 2 },
    );

    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, workerUrl);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, compilerUrl);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(factory('dataOwner')).toBeDefined();
    expect(factory('lspRequest')).toBeDefined();
  });

  it('fails topology preparation when the compiler bundle is unavailable', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '/* worker */',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }) as typeof fetch;

    await expect(
      makeBrowserWorkerLayerFactory(workerUrl, compilerUrl, {
        compilationPoolSize: 1,
        compilationConcurrency: 1,
      }),
    ).rejects.toThrow('Unable to load browser compiler bundle');
  });
});
