/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import * as vscode from 'vscode';
import { createCodeLensCallbackRegistry } from '@salesforce/apex-lsp-client/codeLens';
import { createLanguageClientMiddleware } from '../src/languageClientMiddleware';

const range = (line: number): vscode.Range =>
  ({
    start: { line, character: 0 },
    end: { line, character: 0 },
  }) as vscode.Range;

const lenses = [
  {
    range: range(0),
    command: { command: 'sf.anon.apex.run.delegate', title: 'Execute' },
  },
  {
    range: range(0),
    command: { command: 'sf.anon.apex.debug.delegate', title: 'Debug' },
  },
  {
    range: range(2),
    command: {
      command: 'sf.apex.test.class.run.delegate',
      title: 'Run All Tests',
      arguments: ['ExampleTest'],
    },
  },
  {
    range: range(3),
    command: {
      command: 'sf.apex.debug.class.run.delegate',
      title: 'Debug All Tests',
      arguments: ['ExampleTest'],
    },
  },
  {
    range: range(5),
    command: {
      command: 'sf.apex.test.method.run.delegate',
      title: 'Run Test',
      arguments: ['ExampleTest.exampleMethod'],
    },
  },
  {
    range: range(6),
    command: {
      command: 'sf.apex.debug.method.run.delegate',
      title: 'Debug Test',
      arguments: ['ExampleTest.exampleMethod'],
    },
  },
  { range: range(8), command: undefined },
] as vscode.CodeLens[];

describe('CodeLens middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates each server anchor to its registered descriptor callback', async () => {
    const registry = createCodeLensCallbackRegistry<vscode.CodeLens>();
    registry.register('sf.apex.test.class.run.delegate', (lens) => ({
      ...lens,
      range: range(99),
      command: {
        command: 'salesforcedx-vscode-apex.runTestClass',
        title: 'Run Test Class',
        arguments: ['ExampleTest'],
      },
    }));
    registry.register('sf.apex.debug.method.run.delegate', (lens) => ({
      ...lens,
      command: {
        command: 'salesforcedx-vscode-apex.debugTestMethod',
        title: 'Debug Test Method',
        arguments: ['ExampleTest.exampleMethod'],
      },
    }));
    const middleware = createLanguageClientMiddleware(registry);

    await expect(
      middleware.provideCodeLenses!(
        {} as vscode.TextDocument,
        {} as vscode.CancellationToken,
        vi.fn().mockResolvedValue(lenses),
      ),
    ).resolves.toEqual([
      {
        range: lenses[2].range,
        command: {
          command: 'salesforcedx-vscode-apex.runTestClass',
          title: 'Run Test Class',
          arguments: ['ExampleTest'],
        },
      },
      {
        range: lenses[5].range,
        command: {
          command: 'salesforcedx-vscode-apex.debugTestMethod',
          title: 'Debug Test Method',
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

  it('suppresses server delegate lenses with no registered callback', async () => {
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
