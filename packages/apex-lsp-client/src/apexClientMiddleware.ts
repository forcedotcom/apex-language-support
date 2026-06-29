/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * A single `next`-based interceptor chain at the JSON-RPC layer.
 *
 * This is the SDK's transport-level middleware — deliberately NOT
 * `vscode-languageclient`'s editor-bound `Middleware`. Each method is optional
 * and receives a `next` continuation:
 * - call `next(params)` to continue the chain (optionally transforming params),
 * - return without calling `next` to short-circuit / substitute a result.
 *
 * Multiple middlewares compose in registration order (onion). Scope: all
 * methods, both directions (client→server send and server→client receive),
 * standard LSP + custom `apex/*`. Registration is `client.use(mw): Disposable`;
 * the built-in logging middleware and the typed `apex/*` registrations are
 * themselves consumers of this one chain.
 *
 * Effect boundary: this is the PUBLIC type a consumer implements, so it is
 * expressed in `Promise`/plain types — no exported signature references an
 * Effect type. The core composes registered middlewares internally via Effect
 * combinators (each becomes a named, traced step); that composition is an
 * implementation detail that never surfaces here.
 */
export interface ApexClientMiddleware {
  /**
   * Intercept an outgoing (client→server) request.
   */
  sendRequest?<P, R>(
    method: string,
    params: P,
    next: (p: P) => Promise<R>,
  ): Promise<R>;

  /**
   * Intercept an outgoing (client→server) notification.
   */
  sendNotification?<P>(method: string, params: P, next: (p: P) => void): void;

  /**
   * Intercept an incoming (server→client) request.
   */
  onRequest?<P, R>(
    method: string,
    params: P,
    next: (p: P) => Promise<R>,
  ): Promise<R>;

  /**
   * Intercept an incoming (server→client) notification.
   */
  onNotification?<P>(method: string, params: P, next: (p: P) => void): void;
}

/**
 * Direction of a message flowing through the middleware chain. Surfaced as a
 * structured field by the default logging middleware.
 */
export type MiddlewareDirection = 'outgoing' | 'incoming';
