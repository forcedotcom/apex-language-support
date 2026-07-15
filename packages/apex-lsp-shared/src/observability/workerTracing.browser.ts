/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser replacement for workerTracing.ts.
 *
 * Browser workers do not run the desktop span collector and cannot load the
 * Node-only OTEL context manager. Keeping the same API as the Node module lets
 * the shared barrel remain platform-neutral while the package browser mapping
 * removes every async_hooks/OTEL exporter import from web bundles.
 */

import type * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

export function initWorkerTracing(_url: string, _serviceName: string): void {}

export function shutdownWorkerTracing(): void {}

export function getWorkerTracerLayer(): Layer.Layer<never> | undefined {
  return undefined;
}

export function provideWorkerTracing<A, E, R>() {
  return (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => effect;
}

export function getCollectorUrl(): string | undefined {
  return undefined;
}

export function getActiveWorkerTraceContext(): string | undefined {
  return undefined;
}

export function withExtractedTraceContext<A, E>(
  _request: { readonly traceContext?: string },
  effect: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> {
  return effect;
}
