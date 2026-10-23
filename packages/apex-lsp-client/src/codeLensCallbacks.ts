/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Disposable } from '@salesforce/apex-lsp-shared';

export type CodeLensDescriptor = string;

/** Produces a feature-owned lens for a language-server-owned anchor. */
export type CodeLensCallback<Lens> = (
  lens: Lens,
) => Lens | null | Promise<Lens | null>;

/** Registry for feature-owned CodeLens callbacks by server-declared descriptor. */
export interface CodeLensCallbackRegistry<Lens> {
  register(
    descriptor: CodeLensDescriptor,
    callback: CodeLensCallback<Lens>,
  ): Disposable;
  resolve(descriptor: CodeLensDescriptor, lens: Lens): Promise<Lens | null>;
}

export interface CodeLensCallbackRegistryOptions {
  readonly onCallbackError?: (
    descriptor: CodeLensDescriptor,
    error: unknown,
  ) => void | Promise<void>;
}

export const createCodeLensCallbackRegistry = <Lens>(
  options: CodeLensCallbackRegistryOptions = {},
): CodeLensCallbackRegistry<Lens> => {
  const callbacks = new Map<CodeLensDescriptor, CodeLensCallback<Lens>>();

  return {
    register(descriptor: CodeLensDescriptor, callback: CodeLensCallback<Lens>) {
      callbacks.set(descriptor, callback);
      return {
        dispose: () => {
          if (callbacks.get(descriptor) === callback) {
            callbacks.delete(descriptor);
          }
        },
      };
    },
    async resolve(
      descriptor: CodeLensDescriptor,
      lens: Lens,
    ): Promise<Lens | null> {
      const callback = callbacks.get(descriptor);
      if (!callback) return null;

      try {
        return await callback(lens);
      } catch (error) {
        try {
          await options.onCallbackError?.(descriptor, error);
        } catch {
          // Error reporting cannot make the CodeLens request fail.
        }
        return null;
      }
    },
  };
};
