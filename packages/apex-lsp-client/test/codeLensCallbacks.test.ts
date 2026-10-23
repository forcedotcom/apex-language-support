/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createCodeLensCallbackRegistry } from '../src/codeLensCallbacks';

describe('CodeLens callback registry', () => {
  it('returns null when no callback is registered for an action', async () => {
    const registry = createCodeLensCallbackRegistry<string>();

    await expect(
      registry.resolve('sf.apex.test.method.run.delegate', 'server lens'),
    ).resolves.toBeNull();
  });

  it('allows independent callbacks for server descriptors', async () => {
    const registry = createCodeLensCallbackRegistry<string>();
    const run = vi.fn((lens: string) => `run ${lens}`);
    const debug = vi.fn((lens: string) => `debug ${lens}`);
    registry.register('sf.apex.test.method.run.delegate', run);
    registry.register('sf.apex.debug.method.run.delegate', debug);

    await expect(
      registry.resolve('sf.apex.test.method.run.delegate', 'anchor'),
    ).resolves.toBe('run anchor');
    await expect(
      registry.resolve('sf.apex.debug.method.run.delegate', 'anchor'),
    ).resolves.toBe('debug anchor');
    expect(run).toHaveBeenCalledWith('anchor');
    expect(debug).toHaveBeenCalledWith('anchor');
  });

  it('removes a callback when its registration is disposed', async () => {
    const registry = createCodeLensCallbackRegistry<string>();
    const callback = vi.fn((lens: string) => lens);
    const registration = registry.register(
      'sf.apex.test.method.run.delegate',
      callback,
    );
    registration.dispose();

    await expect(
      registry.resolve('sf.apex.test.method.run.delegate', 'anchor'),
    ).resolves.toBeNull();

    expect(callback).not.toHaveBeenCalled();
  });

  it('replaces the existing callback for an action', async () => {
    const registry = createCodeLensCallbackRegistry<string>();
    const first = vi.fn((lens: string) => `first ${lens}`);
    const second = vi.fn((lens: string) => `second ${lens}`);
    const firstRegistration = registry.register(
      'sf.apex.test.method.run.delegate',
      first,
    );
    registry.register('sf.apex.test.method.run.delegate', second);
    firstRegistration.dispose();

    await expect(
      registry.resolve('sf.apex.test.method.run.delegate', 'anchor'),
    ).resolves.toBe('second anchor');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('anchor');
  });

  it('reports a callback failure and suppresses its lens', async () => {
    const onCallbackError = vi.fn();
    const registry = createCodeLensCallbackRegistry<string>({
      onCallbackError,
    });
    const error = new Error('provider failed');
    registry.register('sf.apex.test.method.run.delegate', async () => {
      throw error;
    });

    await expect(
      registry.resolve('sf.apex.test.method.run.delegate', 'anchor'),
    ).resolves.toBeNull();

    expect(onCallbackError).toHaveBeenCalledWith(
      'sf.apex.test.method.run.delegate',
      error,
    );
  });

  it('suppresses a lens when error reporting fails', async () => {
    const registry = createCodeLensCallbackRegistry<string>({
      onCallbackError: async () => {
        throw new Error('reporting failed');
      },
    });
    registry.register('sf.apex.test.method.run.delegate', async () => {
      throw new Error('provider failed');
    });

    await expect(
      registry.resolve('sf.apex.test.method.run.delegate', 'anchor'),
    ).resolves.toBeNull();
  });
});
