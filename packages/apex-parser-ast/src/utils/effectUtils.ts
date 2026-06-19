/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';

/**
 * Yield to the event loop for immediate yielding.
 * Uses setImmediate in Node.js (more effective) or setTimeout(0) in browsers.
 *
 * This is useful for long-running synchronous operations to prevent blocking
 * the event loop and allow other tasks (like UI updates or incoming requests)
 * to be processed.
 *
 * @example
 * ```typescript
 * import { yieldToEventLoop } from './utils/effectUtils';
 *
 * const processLargeList = Effect.gen(function* () {
 *   for (const item of largeList) {
 *     processItem(item);
 *     // Yield periodically to prevent blocking
 *     if (shouldYield) {
 *       yield* yieldToEventLoop;
 *     }
 *   }
 * });
 * ```
 */
export const yieldToEventLoop = Effect.async<void>((resume) => {
  if (typeof setImmediate !== 'undefined') {
    setImmediate(() => resume(Effect.void));
  } else {
    setTimeout(() => resume(Effect.void), 0);
  }
});
