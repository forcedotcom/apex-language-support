/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Helper utilities for injecting W3C trace context into worker request payloads
 * to maintain distributed tracing continuity across the coordinator→worker boundary.
 */

import * as Effect from 'effect/Effect';
import { context, propagation, trace } from '@opentelemetry/api';

/**
 * Effect-based trace context injection - accesses Effect's current span.
 *
 * Returns an Effect that injects the current span's W3C traceparent into the payload.
 * Use this inside Effect pipelines where the span context is available.
 *
 * @param payload - The request payload object
 * @returns Effect that yields the payload with traceContext field added
 */
export function injectTraceContextEffect<T extends Record<string, unknown>>(
  payload: T,
): Effect.Effect<T & { traceContext?: string }> {
  return Effect.currentSpan.pipe(
    Effect.map((span) => {
      // Build W3C traceparent: 00-<traceId>-<spanId>-01
      const traceparent = `00-${span.traceId}-${span.spanId}-01`;
      return { ...payload, traceContext: traceparent };
    }),
    Effect.catchTag('NoSuchElementException', () => Effect.succeed(payload)),
  );
}

/**
 * Inject trace context from the OpenTelemetry global active span.
 * Use this in coordinator code that uses runWithSpan() (OTEL spans, not Effect spans).
 *
 * @param payload - The request payload object
 * @returns The payload with traceContext field added if a span is active
 */
export function injectTraceContextFromOtelSpan<
  T extends Record<string, unknown>,
>(payload: T): T & { traceContext?: string } {
  try {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      if (carrier.traceparent) {
        return { ...payload, traceContext: carrier.traceparent };
      }
    }
  } catch {
    // Trace propagation is optional and must never disrupt request dispatch.
  }

  return payload;
}

/**
 * Extract trace context from a request payload and return the parent context.
 *
 * @param traceContext - The W3C traceparent string from the request
 * @returns The extracted context, or active context if extraction fails
 */
export function extractTraceContext(
  traceContext: string | undefined,
): ReturnType<typeof context.active> {
  if (!traceContext) {
    return context.active();
  }

  try {
    const carrier = { traceparent: traceContext };
    return propagation.extract(context.active(), carrier);
  } catch (_error) {
    // Extraction failed - return active context
    return context.active();
  }
}
