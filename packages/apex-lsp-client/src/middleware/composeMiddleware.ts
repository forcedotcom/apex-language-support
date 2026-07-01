/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClientMiddleware } from '../apexClientMiddleware';

/**
 * Direction of message flow through the middleware chain. Determines which
 * hook method (`sendRequest`/`sendNotification` vs `onRequest`/`onNotification`)
 * is invoked on each middleware.
 */
export type ChainDirection = 'outgoing' | 'incoming';

/**
 * Compose a request middleware chain (onion model).
 *
 * Folds registered middlewares into a chain where:
 * - Registration order = execution order (first registered wraps outermost).
 * - The innermost `next` calls the provided `sendFn` (either
 *   `connection.sendRequest` for outgoing or the raw handler for incoming).
 * - Each middleware may transform params, short-circuit (return without
 *   calling `next`), or delegate unchanged.
 *
 * @param middlewares - Snapshot of registered middlewares (read from Ref at
 *   invocation time).
 * @param sendFn - Terminal function: the real send or raw handler.
 * @param direction - Selects the middleware hook to invoke.
 * @param method - LSP method name (passed to the hook).
 * @param params - Request parameters.
 */
export function composeRequestChain<P, R>(
  middlewares: ReadonlyArray<ApexClientMiddleware>,
  sendFn: (params: P) => Promise<R>,
  direction: ChainDirection,
  method: string,
  params: P,
): Promise<R> {
  const hook = direction === 'outgoing' ? 'sendRequest' : 'onRequest';

  // Build the chain from the inside out. The innermost next is the terminal
  // sendFn; each middleware wraps the next one outward.
  let next: (p: P) => Promise<R> = (p) => sendFn(p);

  // Iterate in reverse so that the first middleware in the array is outermost.
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const mw = middlewares[i];
    const hookFn = mw[hook] as
      | ((method: string, params: P, next: (p: P) => Promise<R>) => Promise<R>)
      | undefined;
    if (hookFn) {
      const currentNext = next;
      next = (p: P) => hookFn.call(mw, method, p, currentNext);
    }
  }

  return next(params);
}

/**
 * Compose a notification middleware chain (synchronous, sequential, no-await).
 *
 * Folds registered middlewares into a synchronous call chain where:
 * - Registration order = execution order (first registered wraps outermost).
 * - The innermost `next` calls the provided `sendFn`.
 * - The entire chain executes in a single synchronous tick (D2).
 * - No Promises in the fold: a middleware performing async work before `next`
 *   violates the contract — its async transform is silently lost.
 *
 * Notification middlewares execute synchronously. Async side-effects (logging,
 * telemetry) must be fire-and-forget after calling `next`; they MUST NOT gate
 * param transformation or `next` invocation.
 *
 * @param middlewares - Snapshot of registered middlewares.
 * @param sendFn - Terminal function: the real sendNotification or raw handler.
 * @param direction - Selects the middleware hook to invoke.
 * @param method - LSP method name.
 * @param params - Notification parameters.
 */
export function composeNotificationChain<P>(
  middlewares: ReadonlyArray<ApexClientMiddleware>,
  sendFn: (params: P) => void,
  direction: ChainDirection,
  method: string,
  params: P,
): void {
  const hook = direction === 'outgoing' ? 'sendNotification' : 'onNotification';

  // Build the chain from the inside out, synchronously.
  let next: (p: P) => void = (p) => sendFn(p);

  // Iterate in reverse so that the first middleware in the array is outermost.
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const mw = middlewares[i];
    const hookFn = mw[hook] as
      | ((method: string, params: P, next: (p: P) => void) => void)
      | undefined;
    if (hookFn) {
      const currentNext = next;
      next = (p: P) => {
        hookFn.call(mw, method, p, currentNext);
      };
    }
  }

  next(params);
}
