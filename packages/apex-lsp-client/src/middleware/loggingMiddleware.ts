/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  ApexClientMiddleware,
  MiddlewareDirection,
} from '../ApexClientMiddleware';

/**
 * Default observability middleware.
 *
 * Logs the method + direction of every message flowing through the chain via
 * `Effect.log` with structured fields (`{ method, direction }`), then yields the
 * `next` continuation unchanged. It is purely observational — it never
 * transforms params or short-circuits.
 *
 * Logger-agnostic by design: it does NOT accept a `Logger` parameter and never
 * imports `vscode-jsonrpc`'s `Logger`. The wire binding is supplied at the
 * boundary by providing an Effect logger Layer (e.g. `EffectLspLoggerLive` in
 * production, `EffectTestLoggerLive` in tests) when the surrounding Effect is
 * run. The core folds {@link logMiddlewareEvent} into its composed pipeline so
 * the provided layer governs where these logs land.
 */

/**
 * Build the log step for one middleware event. Internal Effect used by the core
 * composition so the provided logger Layer governs output; not part of the
 * exported public surface (it would otherwise leak an Effect type).
 */
export const logMiddlewareEvent = Effect.fn('ApexClientMiddleware.log')(
  function* (method: string, direction: MiddlewareDirection) {
    yield* Effect.logDebug('apex-lsp-client middleware').pipe(
      Effect.annotateLogs({ method, direction }),
    );
  },
);

/**
 * The default logging middleware, conforming to the public
 * {@link ApexClientMiddleware} surface (Promise/plain types only). Each method
 * fires the structured log (fire-and-forget against the ambient runtime) and
 * delegates to `next`. When the core composes middleware it runs
 * {@link logMiddlewareEvent} inside its own provided-layer pipeline; this
 * standalone form keeps the middleware usable on its own.
 */
export const loggingMiddleware: ApexClientMiddleware = {
  sendRequest: (method, params, next) => {
    Effect.runFork(logMiddlewareEvent(method, 'outgoing'));
    return next(params);
  },
  sendNotification: (method, params, next) => {
    Effect.runFork(logMiddlewareEvent(method, 'outgoing'));
    next(params);
  },
  onRequest: (method, params, next) => {
    Effect.runFork(logMiddlewareEvent(method, 'incoming'));
    return next(params);
  },
  onNotification: (method, params, next) => {
    Effect.runFork(logMiddlewareEvent(method, 'incoming'));
    next(params);
  },
};
