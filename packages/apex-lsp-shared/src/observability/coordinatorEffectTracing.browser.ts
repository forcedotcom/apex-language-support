/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser replacement for coordinatorEffectTracing.ts.
 *
 * The browser language server does not initialize the desktop Node tracer
 * provider. Keeping this API as a no-op lets web bundles avoid the Node-only
 * @effect/opentelemetry modules while coordinator code can keep the same call
 * sites across platforms.
 */

import type * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

export function getCoordinatorTracerLayer(): Layer.Layer<never> | undefined {
  return undefined;
}

export function provideCoordinatorTracing<A, E, R>() {
  return (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => effect;
}
