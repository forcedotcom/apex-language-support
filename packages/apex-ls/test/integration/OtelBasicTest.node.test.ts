/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Basic OTEL API test to verify context propagation works
 */

import { trace, context as otelContext } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';

describe('OTEL Basic API', () => {
  it('trace.getActiveSpan() returns span inside startActiveSpan callback', () => {
    // Set up context manager
    const contextManager = new AsyncLocalStorageContextManager();
    contextManager.enable();
    otelContext.setGlobalContextManager(contextManager);

    const spanExporter = new InMemorySpanExporter();
    const tracerProvider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(spanExporter)],
    });

    trace.setGlobalTracerProvider(tracerProvider);

    const tracer = trace.getTracer('test');
    let activeSpanInsideCallback: any = null;

    tracer.startActiveSpan('test-span', (span) => {
      // This should return the span
      activeSpanInsideCallback = trace.getActiveSpan();
      span.end();
    });

    expect(activeSpanInsideCallback).not.toBeNull();
    expect(activeSpanInsideCallback?.name).toBe('test-span');
  });
});
