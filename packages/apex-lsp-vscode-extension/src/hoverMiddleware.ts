/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LanguageClientOptions } from 'vscode-languageclient';

export const createHoverMiddleware = (): NonNullable<
  LanguageClientOptions['middleware']
> => {
  let hoverSequence = 0;
  const inFlightSupersede = new Map<number, () => void>();

  return {
    provideHover: async (document, position, token, next) => {
      const requestSequence = ++hoverSequence;
      for (const [sequence, resolveSupersede] of inFlightSupersede.entries()) {
        if (sequence < requestSequence) {
          resolveSupersede();
          inFlightSupersede.delete(sequence);
        }
      }

      const nextPromise = Promise.resolve(next(document, position, token)).then(
        (value) => ({ source: 'next' as const, value }),
      );
      const cancellationPromise = new Promise<{
        source: 'cancel';
        value: null;
      }>((resolve) => {
        if (token.isCancellationRequested) {
          resolve({ source: 'cancel', value: null });
          return;
        }
        token.onCancellationRequested(() =>
          resolve({ source: 'cancel', value: null }),
        );
      });
      const supersedePromise = new Promise<{
        source: 'supersede';
        value: null;
      }>((resolve) => {
        inFlightSupersede.set(requestSequence, () =>
          resolve({ source: 'supersede', value: null }),
        );
      });

      const raceResult = await Promise.race([
        nextPromise,
        cancellationPromise,
        supersedePromise,
      ]);
      inFlightSupersede.delete(requestSequence);
      if (raceResult.value === null) {
        void nextPromise.catch(() => {});
      }
      return raceResult.value;
    },
  };
};
