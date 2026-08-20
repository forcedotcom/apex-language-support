/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LanguageClientOptions } from 'vscode-languageclient';
import { formattedError } from '@salesforce/apex-lsp-shared';
import { logToOutputChannel } from './logging';

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
    sendRequest: async (type, params, token, next) => {
      const method = typeof type === 'string' ? type : type.method;
      if (method !== 'textDocument/hover') {
        return next(type, params, token);
      }

      const requestStartTime = Date.now();
      const hoverParams = params as
        | {
            textDocument?: { uri?: string };
            position?: { line?: number; character?: number };
          }
        | undefined;
      const uri = hoverParams?.textDocument?.uri ?? 'unknown';
      const line = hoverParams?.position?.line ?? '?';
      const character = hoverParams?.position?.character ?? '?';
      logToOutputChannel(
        `🔍 [CLIENT] Hover request initiated: ${uri} at ${line}:${character} [time: ${requestStartTime}]`,
        'debug',
      );

      try {
        const result = await next(type, params, token);
        const totalTime = Date.now() - requestStartTime;
        logToOutputChannel(
          `✅ [CLIENT] Hover request completed: ${uri} ` +
            `total=${totalTime}ms, result=${result ? 'success' : 'null'}`,
          'debug',
        );
        return result;
      } catch (error) {
        const totalTime = Date.now() - requestStartTime;
        logToOutputChannel(
          `❌ [CLIENT] Hover request failed after ${totalTime}ms: ` +
            `${uri} - ${formattedError(error)}`,
          'error',
        );
        throw error;
      }
    },
  };
};
