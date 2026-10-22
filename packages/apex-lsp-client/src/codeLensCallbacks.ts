/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Disposable } from '@salesforce/apex-lsp-shared';

export const CODE_LENS_ACTIONS = ['run', 'debug'] as const;

export type CodeLensAction = (typeof CODE_LENS_ACTIONS)[number];

/** Produces a feature-owned lens for a language-server-owned anchor. */
export type CodeLensCallback<Lens> = (
  lens: Lens,
) => Lens | null | Promise<Lens | null>;

/** Registry for feature-owned CodeLens callbacks by server-declared action. */
export interface CodeLensCallbackRegistry<Lens> {
  register<Action extends CodeLensAction>(
    action: Action,
    callback: CodeLensCallback<Lens>,
  ): Disposable;
  resolve<Action extends CodeLensAction>(
    action: Action,
    lens: Lens,
  ): Promise<Lens | null>;
}

export interface CodeLensCallbackRegistryOptions {
  readonly onCallbackError?: (
    action: CodeLensAction,
    error: unknown,
  ) => void | Promise<void>;
}

export const createCodeLensCallbackRegistry = <Lens>(
  options: CodeLensCallbackRegistryOptions = {},
): CodeLensCallbackRegistry<Lens> => {
  const callbacks = new Map<CodeLensAction, CodeLensCallback<Lens>>();

  return {
    register<Action extends CodeLensAction>(
      action: Action,
      callback: CodeLensCallback<Lens>,
    ) {
      callbacks.set(action, callback);
      return {
        dispose: () => {
          if (callbacks.get(action) === callback) {
            callbacks.delete(action);
          }
        },
      };
    },
    async resolve<Action extends CodeLensAction>(
      action: Action,
      lens: Lens,
    ): Promise<Lens | null> {
      const callback = callbacks.get(action);
      if (!callback) return null;

      try {
        return await callback(lens);
      } catch (error) {
        try {
          await options.onCallbackError?.(action, error);
        } catch {
          // Error reporting cannot make the CodeLens request fail.
        }
        return null;
      }
    },
  };
};
