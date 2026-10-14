/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { logToOutputChannel } from './logging';

export const CODE_LENS_ACTIONS = [
  'executeAnonymous',
  'debugAnonymous',
  'runTestClass',
  'debugTestClass',
  'runTestMethod',
  'debugTestMethod',
] as const;

export type CodeLensAction = (typeof CODE_LENS_ACTIONS)[number];

export interface CodeLensActionArguments {
  readonly executeAnonymous: readonly [];
  readonly debugAnonymous: readonly [];
  readonly runTestClass: readonly [className: string];
  readonly debugTestClass: readonly [className: string];
  readonly runTestMethod: readonly [qualifiedMethodName: string];
  readonly debugTestMethod: readonly [qualifiedMethodName: string];
}

export type CodeLensCallback<Action extends CodeLensAction = CodeLensAction> = (
  arguments_: CodeLensActionArguments[Action],
) => void | Promise<void>;

export interface CodeLensCallbackRegistry {
  register<Action extends CodeLensAction>(
    action: Action,
    callback: CodeLensCallback<Action>,
  ): vscode.Disposable;
  dispatch<Action extends CodeLensAction>(
    action: Action,
    arguments_: CodeLensActionArguments[Action],
  ): Promise<void>;
}

export const createCodeLensCallbackRegistry = (): CodeLensCallbackRegistry => {
  const callbacks = new Map<CodeLensAction, CodeLensCallback[]>();

  return {
    register<Action extends CodeLensAction>(
      action: Action,
      callback: CodeLensCallback<Action>,
    ) {
      const actionCallbacks = callbacks.get(action) ?? [];
      callbacks.set(action, [...actionCallbacks, callback as CodeLensCallback]);
      return new vscode.Disposable(() => {
        const registered = callbacks.get(action) ?? [];
        callbacks.set(
          action,
          registered.filter((entry) => entry !== callback),
        );
      });
    },
    async dispatch<Action extends CodeLensAction>(
      action: Action,
      arguments_: CodeLensActionArguments[Action],
    ) {
      const actionCallbacks = callbacks.get(action) ?? [];
      if (actionCallbacks.length === 0) {
        await vscode.window.showErrorMessage(
          `${action} is unavailable because no providers are registered.`,
        );
        return;
      }

      for (const callback of actionCallbacks) {
        try {
          await callback(arguments_);
        } catch (error) {
          logToOutputChannel(
            `CodeLens ${action} provider failed: ${String(error)}`,
            'error',
          );
        }
      }
    },
  };
};

const CODE_LENS_COMMAND_ACTIONS: Readonly<Record<string, CodeLensAction>> = {
  'apex-ls-ts.codelens.executeAnonymous': 'executeAnonymous',
  'apex-ls-ts.codelens.debugAnonymous': 'debugAnonymous',
  'apex-ls-ts.codelens.runTestClass': 'runTestClass',
  'apex-ls-ts.codelens.debugTestClass': 'debugTestClass',
  'apex-ls-ts.codelens.runTestMethod': 'runTestMethod',
  'apex-ls-ts.codelens.debugTestMethod': 'debugTestMethod',
};

export const registerCodeLensCommandHandlers = (
  context: vscode.ExtensionContext,
  registry: CodeLensCallbackRegistry,
): void => {
  for (const [command, action] of Object.entries(CODE_LENS_COMMAND_ACTIONS)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, (...arguments_) =>
        registry.dispatch(action, arguments_ as never),
      ),
    );
  }
};
