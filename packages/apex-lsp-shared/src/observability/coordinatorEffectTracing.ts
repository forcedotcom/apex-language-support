/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect-native tracer layer for the coordinator (apex-ls main process).
 *
 * Bridges Effect spans to the global NodeTracerProvider that initCoordinatorTracing
 * already registered, so Effect spans and imperative runWithSpan spans share one
 * exporter and span processor. Uses @effect/opentelemetry's Tracer.layerGlobal.
 *
 * NOTE: This module only works in Node.js environments. In browser/web environments,
 * the functions return undefined (tracing disabled).
 */

import { Effect, Layer } from 'effect';
import { isTracingEnabled } from './tracing';

// Check if we're in a Node.js environment (not browser/web)
const isNodeEnvironment =
  typeof process !== 'undefined' && process.versions?.node;

/** Cached tracer layer for the coordinator process (builds on first access). */
let coordinatorTracerLayer: Layer.Layer<never> | undefined;

/**
 * Initialize the coordinator Effect-native tracer layer by binding to the
 * already-registered global NodeTracerProvider.
 *
 * Called lazily via getCoordinatorTracerLayer() when tracing is enabled.
 *
 * IMPORTANT: This layer reuses the provider/exporter/context-manager that
 * initCoordinatorTracing (coordinatorTracing.ts) set up. Do NOT call
 * trace.setGlobalTracerProvider or context.setGlobalContextManager again.
 *
 * Returns undefined in non-Node environments (browser/web).
 */
function initCoordinatorEffectTracing(): Layer.Layer<never> | undefined {
  if (!isNodeEnvironment) {
    return undefined;
  }

  // These imports will fail in browser environments, so we guard with isNodeEnvironment
  const EffectTracer =
    require('@effect/opentelemetry/Tracer') as typeof import('@effect/opentelemetry/Tracer');
  const Resource =
    require('@effect/opentelemetry/Resource') as typeof import('@effect/opentelemetry/Resource');

  // Tracer.layerGlobal binds to trace.getTracerProvider() lazily.
  // Its context() callback wraps each Effect span's execution in OTEL's
  // context.with(setSpan(...)), so the Effect span becomes the active span
  // for imperative trace.getActiveSpan() / propagation.inject() calls.
  const layer: Layer.Layer<never> = Layer.provide(
    EffectTracer.layerGlobal,
    Resource.layer({
      serviceName: 'apex-ls-coordinator',
    }),
  ) as Layer.Layer<never>;

  coordinatorTracerLayer = layer;
  return layer;
}

/**
 * Get the tracer layer for coordinator Effect runtimes.
 *
 * Returns the layerGlobal-based tracer layer if tracing is enabled, undefined
 * otherwise. The layer is initialized lazily on first access.
 *
 * Always returns undefined in non-Node environments (browser/web).
 */
export function getCoordinatorTracerLayer(): Layer.Layer<never> | undefined {
  if (!isNodeEnvironment || !isTracingEnabled()) {
    return undefined;
  }
  if (!coordinatorTracerLayer) {
    return initCoordinatorEffectTracing();
  }
  return coordinatorTracerLayer;
}

/**
 * Provide the coordinator tracer layer to an Effect if tracing is enabled.
 *
 * This is a helper that coordinator Effects can pipe through to enable
 * Effect.fn / Effect.withSpan instrumentation. If tracing isn't enabled,
 * returns the Effect unchanged.
 *
 * Usage:
 * ```typescript
 * const loadEffect = Effect.gen(function* () {
 *   // workspace load body with Effect.withSpan(...)
 * }).pipe(provideCoordinatorTracing());
 * Effect.runPromise(loadEffect);
 * ```
 *
 * @returns A function that provides the tracer layer to an Effect
 */
export function provideCoordinatorTracing<A, E, R>() {
  return (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    const layer = getCoordinatorTracerLayer();
    if (!layer) {
      return effect;
    }
    // Effect.provide changes the effect type, so we need to cast it back
    return Effect.provide(effect, layer) as Effect.Effect<A, E, R>;
  };
}
