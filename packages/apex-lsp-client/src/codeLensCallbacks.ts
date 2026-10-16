/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Disposable } from '@salesforce/apex-lsp-shared';

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
  ): Disposable;
  dispatch<Action extends CodeLensAction>(
    action: Action,
    arguments_: CodeLensActionArguments[Action],
  ): Promise<void>;
}

export interface CodeLensCallbackRegistryOptions {
  readonly onUnavailable?: (action: CodeLensAction) => void | Promise<void>;
  readonly onProviderError?: (
    action: CodeLensAction,
    error: unknown,
  ) => void | Promise<void>;
}

export const createCodeLensCallbackRegistry = (
  options: CodeLensCallbackRegistryOptions = {},
): CodeLensCallbackRegistry => {
  const callbacks = new Map<CodeLensAction, CodeLensCallback[]>();

  return {
    register<Action extends CodeLensAction>(
      action: Action,
      callback: CodeLensCallback<Action>,
    ) {
      const actionCallbacks = callbacks.get(action) ?? [];
      callbacks.set(action, [...actionCallbacks, callback as CodeLensCallback]);
      return {
        dispose: () => {
          const registered = callbacks.get(action) ?? [];
          callbacks.set(
            action,
            registered.filter((entry) => entry !== callback),
          );
        },
      };
    },
    async dispatch<Action extends CodeLensAction>(
      action: Action,
      arguments_: CodeLensActionArguments[Action],
    ) {
      const actionCallbacks = callbacks.get(action) ?? [];
      if (actionCallbacks.length === 0) {
        await options.onUnavailable?.(action);
        return;
      }

      let hasUnreportedError = false;
      let unreportedError: unknown;
      for (const callback of actionCallbacks) {
        try {
          await callback(arguments_);
        } catch (error) {
          if (options.onProviderError) {
            try {
              await options.onProviderError(action, error);
            } catch (reportingError) {
              if (!hasUnreportedError) {
                hasUnreportedError = true;
                unreportedError = reportingError;
              }
            }
          } else {
            if (!hasUnreportedError) {
              hasUnreportedError = true;
              unreportedError = error;
            }
          }
        }
      }
      if (hasUnreportedError) {
        throw unreportedError;
      }
    },
  };
};
