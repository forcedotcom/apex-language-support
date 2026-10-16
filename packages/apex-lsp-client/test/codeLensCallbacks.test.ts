/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createCodeLensCallbackRegistry } from '../src/codeLensCallbacks';

describe('CodeLens callback registry', () => {
  it('reports when no providers are registered for an action', async () => {
    const onUnavailable = vi.fn();
    const registry = createCodeLensCallbackRegistry({ onUnavailable });

    await registry.dispatch('runTestClass', ['ExampleTest']);

    expect(onUnavailable).toHaveBeenCalledWith('runTestClass');
  });

  it('invokes every provider in registration order', async () => {
    const registry = createCodeLensCallbackRegistry();
    const calls: string[] = [];
    const first = vi.fn(async () => {
      calls.push('first');
    });
    const second = vi.fn(async () => {
      calls.push('second');
    });
    registry.register('debugTestMethod', first);
    registry.register('debugTestMethod', second);

    await registry.dispatch('debugTestMethod', ['ExampleTest.exampleMethod']);

    expect(first).toHaveBeenCalledWith(['ExampleTest.exampleMethod']);
    expect(second).toHaveBeenCalledWith(['ExampleTest.exampleMethod']);
    expect(calls).toEqual(['first', 'second']);
  });

  it('removes a provider when its registration is disposed', async () => {
    const onUnavailable = vi.fn();
    const registry = createCodeLensCallbackRegistry({ onUnavailable });
    const callback = vi.fn();
    const registration = registry.register('executeAnonymous', callback);
    registration.dispose();

    await registry.dispatch('executeAnonymous', []);

    expect(callback).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledWith('executeAnonymous');
  });

  it('reports a provider failure and continues dispatching', async () => {
    const onProviderError = vi.fn();
    const registry = createCodeLensCallbackRegistry({ onProviderError });
    const error = new Error('provider failed');
    const succeedingCallback = vi.fn();
    registry.register('runTestClass', async () => {
      throw error;
    });
    registry.register('runTestClass', succeedingCallback);

    await registry.dispatch('runTestClass', ['ExampleTest']);

    expect(onProviderError).toHaveBeenCalledWith('runTestClass', error);
    expect(succeedingCallback).toHaveBeenCalledWith(['ExampleTest']);
  });

  it('rejects after dispatching remaining providers when failures are unreported', async () => {
    const registry = createCodeLensCallbackRegistry();
    const error = new Error('provider failed');
    const succeedingCallback = vi.fn();
    registry.register('runTestClass', async () => {
      throw error;
    });
    registry.register('runTestClass', succeedingCallback);

    await expect(
      registry.dispatch('runTestClass', ['ExampleTest']),
    ).rejects.toBe(error);
    expect(succeedingCallback).toHaveBeenCalledWith(['ExampleTest']);
  });

  it('continues dispatching when error reporting fails', async () => {
    const reportingError = new Error('reporting failed');
    const onProviderError = vi.fn(async () => {
      throw reportingError;
    });
    const registry = createCodeLensCallbackRegistry({ onProviderError });
    const succeedingCallback = vi.fn();
    registry.register('runTestClass', async () => {
      throw undefined;
    });
    registry.register('runTestClass', succeedingCallback);

    await expect(
      registry.dispatch('runTestClass', ['ExampleTest']),
    ).rejects.toBe(reportingError);
    expect(succeedingCallback).toHaveBeenCalledWith(['ExampleTest']);
  });
});
