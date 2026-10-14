/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import * as vscode from 'vscode';
import {
  createCodeLensCallbackRegistry,
  registerCodeLensCommandHandlers,
} from '../src/codeLensCommandHandlers';

const context = {
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

describe('CodeLens command handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers stable commands that dispatch semantic actions', () => {
    registerCodeLensCommandHandlers(context, createCodeLensCallbackRegistry());

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex-ls-ts.codelens.runTestClass',
      expect.any(Function),
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex-ls-ts.codelens.debugTestMethod',
      expect.any(Function),
    );
  });

  it('reports when no providers are registered for an action', async () => {
    const registry = createCodeLensCallbackRegistry();

    await registry.dispatch('runTestClass', ['ExampleTest']);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'runTestClass is unavailable because no providers are registered.',
    );
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
    const registry = createCodeLensCallbackRegistry();
    const callback = vi.fn();
    const registration = registry.register('executeAnonymous', callback);
    registration.dispose();

    await registry.dispatch('executeAnonymous', []);

    expect(callback).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });
});
