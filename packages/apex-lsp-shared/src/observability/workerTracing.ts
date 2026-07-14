/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker-side OTEL tracing with @effect/opentelemetry.
 *
 * Creates an OtlpTracer layer that handlers can provide to their Effects
 * so that Effect.fn spans are created and exported to the collector.
 */

import * as OtlpTracer from '@effect/opentelemetry/OtlpTracer';
import { layerJson as OtlpSerializationLayer } from '@effect/opentelemetry/OtlpSerialization';
import * as EffectTracer from '@effect/opentelemetry/Tracer';
import { layer as FetchHttpClientLayer } from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { context, propagation, trace, TraceFlags } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { getLogger } from '../logger';

let tracerLayer: Layer.Layer<never> | undefined;
let collectorUrl: string | undefined;

/**
 * Initialize worker tracing with @effect/opentelemetry.
 *
 * Creates an OTLP/HTTP tracer layer that handlers can provide to their
 * Effects. Effect.fn calls within those Effects will automatically create
 * spans that export to the collector.
 *
 * @param url - The span collector endpoint (e.g., http://127.0.0.1:12345)
 * @param serviceName - The service name for this worker (e.g., "apex-ls-worker-data-owner")
 */
export function initWorkerTracing(url: string, serviceName: string): void {
  if (tracerLayer) {
    // Already initialized
    return;
  }

  try {
    collectorUrl = url;

    // CRITICAL: Set up OTEL context infrastructure for distributed tracing
    // Without these, trace context extraction and async context propagation fail

    // Set up W3C trace context propagator - required for propagation.extract() to work
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    // Set up async context manager - required for maintaining parent context across async boundaries
    const contextManager = new AsyncLocalStorageContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);

    // Create OTLP tracer layer with resource metadata. OtlpTracer.layer
    // requires HttpClient and OtlpSerialization — provide both so the
    // resulting layer has no outstanding requirements; otherwise the first
    // span created against it dies with "Service not found" and takes down
    // whatever Effect it was provided to (topology init, in the worker case).
    //
    // CRITICAL: Provide a context callback that runs the function within the active
    // OTEL context. This allows Effect.fn spans to inherit parent trace IDs from
    // the OTEL context set up by withExtractedTraceContext().
    tracerLayer = OtlpTracer.layer({
      url: `${url}/v1/traces`,
      resource: {
        serviceName,
      },
      context: (f, span) => {
        // OtlpTracer uses Effect-native spans rather than SDK Span instances.
        // Publish the current Effect span as an OTEL SpanContext so imperative
        // APIs such as propagation.inject() see the correct worker span.
        const spanContext = {
          traceId: span.traceId,
          spanId: span.spanId,
          traceFlags: span.sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
          isRemote: span._tag === 'ExternalSpan',
        };
        return context.with(
          trace.setSpanContext(context.active(), spanContext),
          f,
        );
      },
    }).pipe(Layer.provide([FetchHttpClientLayer, OtlpSerializationLayer]));

    getLogger().log(
      'info',
      `[workerTracing] Initialized Effect tracer layer for ${serviceName} -> ${url}`,
    );
  } catch (error) {
    // Tracing is optional - don't fail worker init if it doesn't work
    getLogger().log('error', `Failed to initialize worker tracing: ${error}`);
    tracerLayer = undefined;
  }
}

/**
 * Shut down worker tracing, clearing the tracer layer.
 */
export async function shutdownWorkerTracing(): Promise<void> {
  tracerLayer = undefined;
  collectorUrl = undefined;
}

/**
 * Get the tracer layer for worker Effect runtimes.
 *
 * Returns the OtlpTracer layer if tracing was initialized, undefined otherwise.
 */
export function getWorkerTracerLayer(): Layer.Layer<never> | undefined {
  return tracerLayer;
}

/**
 * Provide the worker tracer layer to an Effect if tracing is initialized.
 *
 * This is a helper that handlers can pipe their Effects through to enable
 * Effect.fn span creation. If tracing isn't initialized, returns the Effect
 * unchanged.
 *
 * Usage:
 * ```typescript
 * const handler = (req) =>
 *   Effect.fn('myHandler', {attributes: {telemetryIgnore: true}})(function* () {
 *     // handler body
 *   })().pipe(provideWorkerTracing());
 * ```
 *
 * @returns A function that provides the tracer layer to an Effect
 */
export function provideWorkerTracing<A, E, R>() {
  return (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    const layer = getWorkerTracerLayer();
    if (!layer) {
      return effect;
    }
    // Effect.provide changes the effect type, so we need to cast it back
    return Effect.provide(effect, layer) as Effect.Effect<A, E, R>;
  };
}

/**
 * Get the collector URL if tracing is initialized.
 */
export function getCollectorUrl(): string | undefined {
  return collectorUrl;
}

/**
 * Return the W3C traceparent for the active worker span, if one exists.
 *
 * This is intentionally synchronous: Promise-based assistance adapters must
 * capture the current span before starting a separate Effect runtime, which
 * would otherwise lose the submitting fiber's context.
 */
export function getActiveWorkerTraceContext(): string | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent;
}

/**
 * Extract trace context from a request and run an Effect within that context.
 * This maintains parent-child span relationships when the coordinator passes
 * trace context in the request payload.
 *
 * Uses Effect's native `Effect.withParentSpan` to set the parent span from
 * the W3C traceparent header, ensuring worker spans appear as children of
 * coordinator spans in distributed traces.
 *
 * Usage in worker handlers:
 * ```typescript
 * const handler = (req) =>
 *   withExtractedTraceContext(req,
 *     Effect.fn('myHandler')(function* () {
 *       // handler body - spans created here will be children of the coordinator span
 *     })()
 *   );
 * ```
 */
export function withExtractedTraceContext<A, E>(
  request: { traceContext?: string },
  effect: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> {
  if (!request.traceContext) {
    // No trace context in request - run normally
    const layer = getWorkerTracerLayer();
    return layer ? Effect.provide(effect, layer) : effect;
  }

  // Parse W3C traceparent format: 00-{traceId}-{spanId}-{flags}
  // Example: 00-06c39d7869fe71eefe5fdb316c051c4f-68e12f83a3ffd969-01
  try {
    const parts = request.traceContext.split('-');
    if (parts.length !== 4 || parts[0] !== '00') {
      getLogger().log(
        'warning',
        `[traceContext] Invalid traceparent format: ${request.traceContext}`,
      );
      const layer = getWorkerTracerLayer();
      return layer ? Effect.provide(effect, layer) : effect;
    }

    const [, traceId, spanId, flagsHex] = parts;
    const traceFlags = parseInt(flagsHex, 16);

    getLogger().log(
      'debug',
      `[traceContext] Extracted parent: traceId=${traceId} spanId=${spanId} ` +
        `flags=${traceFlags} from ${request.traceContext}`,
    );

    // Create an ExternalSpan from the coordinator's trace context.
    // This tells Effect that spans created within this Effect should be
    // children of the coordinator span.
    const parentSpan = EffectTracer.makeExternalSpan({
      traceId,
      spanId,
      traceFlags,
    });

    // Apply tracer layer and set parent span
    const layer = getWorkerTracerLayer();
    const effectWithTracing = layer ? Effect.provide(effect, layer) : effect;
    return Effect.withParentSpan(effectWithTracing, parentSpan);
  } catch (error) {
    // Trace context extraction failed - run effect normally
    getLogger().log('error', `Failed to extract trace context: ${error}`);
    const layer = getWorkerTracerLayer();
    return layer ? Effect.provide(effect, layer) : effect;
  }
}
