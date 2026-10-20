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
  createVsCodeCodeLensCallbackRegistry,
  registerCodeLensCommandHandlers,
  type CodeLensAction,
} from '../src/codeLensCommandHandlers';

const context = {
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

describe('CodeLens command handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers stable commands that dispatch semantic actions', () => {
    registerCodeLensCommandHandlers(
      context,
      createVsCodeCodeLensCallbackRegistry(),
    );

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex-ls-ts.codelens.runTestClass',
      expect.any(Function),
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex-ls-ts.codelens.debugTestMethod',
      expect.any(Function),
    );
  });

  it.each([
    ['apex-ls-ts.codelens.executeAnonymous', 'executeAnonymous', []],
    ['apex-ls-ts.codelens.debugAnonymous', 'debugAnonymous', []],
    ['apex-ls-ts.codelens.runTestClass', 'runTestClass', ['ExampleTest']],
    ['apex-ls-ts.codelens.debugTestClass', 'debugTestClass', ['ExampleTest']],
    [
      'apex-ls-ts.codelens.runTestMethod',
      'runTestMethod',
      ['ExampleTest.exampleMethod'],
    ],
    [
      'apex-ls-ts.codelens.debugTestMethod',
      'debugTestMethod',
      ['ExampleTest.exampleMethod'],
    ],
  ] as const)(
    'dispatches %s as %s',
    async (
      command: string,
      action: CodeLensAction,
      arguments_: readonly string[],
    ) => {
      const registry = createVsCodeCodeLensCallbackRegistry();
      const callback = vi.fn();
      registry.register(action, callback);
      registerCodeLensCommandHandlers(context, registry);

      const handler = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find(
          ([registeredCommand]) => registeredCommand === command,
        )?.[1];
      expect(handler).toBeTypeOf('function');
      if (typeof handler !== 'function') {
        return;
      }
      await handler(...arguments_);

      expect(callback).toHaveBeenCalledWith(arguments_);
    },
  );

  it('reports when no providers are registered for an action', async () => {
    const registry = createVsCodeCodeLensCallbackRegistry();

    await registry.dispatch('runTestClass', ['ExampleTest']);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'The runTestClass CodeLens action is unavailable because no extension has registered a handler for it.',
    );
  });
});
