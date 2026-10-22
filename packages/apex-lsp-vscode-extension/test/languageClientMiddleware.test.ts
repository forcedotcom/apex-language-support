/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import * as vscode from 'vscode';
import { createLanguageClientMiddleware } from '../src/languageClientMiddleware';

const lenses = [
  { command: { command: 'sf.anon.apex.run.delegate', title: 'Execute' } },
  { command: { command: 'sf.anon.apex.debug.delegate', title: 'Debug' } },
  {
    command: {
      command: 'sf.apex.test.class.run.delegate',
      title: 'Run All Tests',
      arguments: ['ExampleTest'],
    },
  },
  {
    command: {
      command: 'sf.apex.debug.class.run.delegate',
      title: 'Debug All Tests',
      arguments: ['ExampleTest'],
    },
  },
  {
    command: {
      command: 'sf.apex.test.method.run.delegate',
      title: 'Run Test',
      arguments: ['ExampleTest.exampleMethod'],
    },
  },
  {
    command: {
      command: 'sf.apex.debug.method.run.delegate',
      title: 'Debug Test',
      arguments: ['ExampleTest.exampleMethod'],
    },
  },
  { command: undefined },
] as vscode.CodeLens[];

describe('CodeLens middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces delegates with stable CodeLens click commands', async () => {
    const middleware = createLanguageClientMiddleware();

    await expect(
      middleware.provideCodeLenses!(
        {} as vscode.TextDocument,
        {} as vscode.CancellationToken,
        vi.fn().mockResolvedValue(lenses),
      ),
    ).resolves.toEqual([
      {
        command: {
          command: 'apex-ls-ts.codelens.executeAnonymous',
          title: 'Execute',
        },
      },
      {
        command: {
          command: 'apex-ls-ts.codelens.debugAnonymous',
          title: 'Debug',
        },
      },
      {
        command: {
          command: 'apex-ls-ts.codelens.runTestClass',
          title: 'Run All Tests',
          arguments: ['ExampleTest'],
        },
      },
      {
        command: {
          command: 'apex-ls-ts.codelens.debugTestClass',
          title: 'Debug All Tests',
          arguments: ['ExampleTest'],
        },
      },
      {
        command: {
          command: 'apex-ls-ts.codelens.runTestMethod',
          title: 'Run Test',
          arguments: ['ExampleTest.exampleMethod'],
        },
      },
      {
        command: {
          command: 'apex-ls-ts.codelens.debugTestMethod',
          title: 'Debug Test',
          arguments: ['ExampleTest.exampleMethod'],
        },
      },
      lenses[6],
    ]);
  });

  it.each([null, undefined] as const)(
    'preserves an empty CodeLens response of %s',
    async (result: null | undefined) => {
      const middleware = createLanguageClientMiddleware();
      const next = vi.fn().mockResolvedValue(result);

      await expect(
        middleware.provideCodeLenses!(
          {} as vscode.TextDocument,
          {} as vscode.CancellationToken,
          next,
        ),
      ).resolves.toBe(result);
    },
  );

  it('filters commands that are not CodeLens delegates', async () => {
    const middleware = createLanguageClientMiddleware();

    await expect(
      middleware.provideCodeLenses!(
        {} as vscode.TextDocument,
        {} as vscode.CancellationToken,
        vi
          .fn()
          .mockResolvedValue([
            { command: { command: 'constructor', title: 'Unknown' } },
          ]),
      ),
    ).resolves.toEqual([]);
  });
});
