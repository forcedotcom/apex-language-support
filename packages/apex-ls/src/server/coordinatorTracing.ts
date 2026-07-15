/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Coordinator-side OTEL tracing initialization.
 *
 * Sets up an OTEL tracer provider that exports spans to the same collector
 * that workers use, enabling end-to-end distributed tracing from coordinator
 * spans through to worker spans.
 */

import { trace, context, propagation } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  resourceFromAttributes,
  defaultResource,
} from '@opentelemetry/resources';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { enableTracing } from '@salesforce/apex-lsp-shared';

let tracerProvider: NodeTracerProvider | undefined;

/**
 * Initialize coordinator-side OTEL tracing.
 *
 * Creates a tracer provider that exports spans to the given collector URL.
 * After calling this, runWithSpan() will create actual spans instead of
 * no-oping.
 *
 * @param collectorUrl - The span collector endpoint (e.g., http://127.0.0.1:12345)
 * @param serviceName - The service name for the coordinator (default: "apex-ls-coordinator")
 */
export function initCoordinatorTracing(
  collectorUrl: string,
  serviceName = 'apex-ls-coordinator',
): void {
  if (tracerProvider) {
    // Already initialized
    return;
  }

  try {
    // Set up W3C trace context propagator - required for propagation.inject() to work
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    // Set up context manager - required for trace.getActiveSpan() to work
    const contextManager = new AsyncLocalStorageContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);

    // Create OTLP exporter
    const exporter = new OTLPTraceExporter({
      url: `${collectorUrl}/v1/traces`,
    });

    // Create resource with service name
    const resource = defaultResource().merge(
      resourceFromAttributes({
        'service.name': serviceName,
      }),
    );

    // Create tracer provider with simple span processor for immediate export
    // (useful for testing and development)
    tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });

    // Register as global tracer provider
    trace.setGlobalTracerProvider(tracerProvider);

    // Enable tracing in apex-lsp-shared so runWithSpan() creates spans
    enableTracing();

    console.log(
      `[coordinatorTracing] Initialized OTEL tracing for ${serviceName} -> ${collectorUrl}`,
    );
  } catch (error) {
    // Tracing is optional - don't fail coordinator init if it doesn't work
    console.error(`Failed to initialize coordinator tracing: ${error}`);
    tracerProvider = undefined;
  }
}

/**
 * Shut down coordinator tracing and flush any pending spans.
 */
export async function shutdownCoordinatorTracing(): Promise<void> {
  if (tracerProvider) {
    await tracerProvider.shutdown();
    tracerProvider = undefined;
  }
}
