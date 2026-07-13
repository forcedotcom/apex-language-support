/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Integration test for distributed tracing infrastructure.
 *
 * Tests the withExtractedTraceContext() function in isolation by starting a
 * mock OTLP HTTP server, extracting trace context from a W3C traceparent header,
 * and verifying that Effect.fn spans inherit the parent trace ID and span ID.
 *
 * This is a focused unit-level test that does NOT require spinning up worker
 * topology or exercising the full LSP request flow. It proves that the core
 * distributed tracing mechanism (makeExternalSpan + withParentSpan) works.
 */

import * as http from 'http';
import * as Effect from 'effect/Effect';
import {
  initWorkerTracing,
  withExtractedTraceContext,
  shutdownWorkerTracing,
} from '@salesforce/apex-lsp-shared';

interface OtlpSpan {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  kind: number;
}

describe('withExtractedTraceContext()', () => {
  let mockCollector: http.Server;
  let collectorPort: number;
  let receivedBodies: string[] = [];

  beforeAll(async () => {
    // Start a mock OTLP HTTP server to capture exported spans
    await new Promise<void>((resolve) => {
      mockCollector = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/v1/traces') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => {
            receivedBodies.push(Buffer.concat(chunks).toString('utf-8'));
            res.writeHead(200);
            res.end();
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      mockCollector.listen(0, '127.0.0.1', () => {
        const address = mockCollector.address();
        if (address && typeof address === 'object') {
          collectorPort = address.port;
          resolve();
        }
      });
    });
  });

  afterAll(async () => {
    await shutdownWorkerTracing();
    await new Promise<void>((resolve) => {
      mockCollector?.close(() => resolve());
    });
  });

  beforeEach(() => {
    receivedBodies = [];
  });

  it('extracts parent trace context and creates child span', async () => {
    const spanCollectorUrl = `http://127.0.0.1:${collectorPort}`;

    // Initialize worker tracing to point at our mock collector
    initWorkerTracing(spanCollectorUrl, 'test-worker');

    // Known trace context from a coordinator span
    const coordinatorTraceId = 'a4da210590970d819e83f75404da6e0c';
    const coordinatorSpanId = '335350cc5528d5b6';
    const traceContext = `00-${coordinatorTraceId}-${coordinatorSpanId}-01`;

    // Create an Effect.fn that should become a child span
    const testEffect = Effect.fn(
      'test.child.span',
      {},
    )(function* () {
      yield* Effect.log('Executing child span');
      return 'test result';
    })();

    // Wrap with withExtractedTraceContext to inject parent span
    const effectWithParent = withExtractedTraceContext(
      { traceContext },
      testEffect,
    );

    // Run the effect
    const result = await Effect.runPromise(effectWithParent);
    expect(result).toBe('test result');

    // Poll until spans are exported (OTLP batching is async)
    const deadline = Date.now() + 10_000;
    while (receivedBodies.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(receivedBodies.length).toBeGreaterThan(0);

    // Parse OTLP JSON payload
    const exported = JSON.parse(receivedBodies[0]);
    const resourceSpans = exported.resourceSpans || [];
    expect(resourceSpans.length).toBeGreaterThan(0);

    const scopeSpans = resourceSpans[0].scopeSpans || [];
    expect(scopeSpans.length).toBeGreaterThan(0);

    const spans: OtlpSpan[] = scopeSpans[0].spans || [];
    expect(spans.length).toBeGreaterThan(0);

    // Find the child span
    const childSpan = spans.find((s) => s.name === 'test.child.span');
    expect(childSpan).toBeDefined();

    if (childSpan) {
      // Critical assertions: child span inherits parent's trace ID
      expect(childSpan.traceId).toBe(coordinatorTraceId);
      expect(childSpan.parentSpanId).toBe(coordinatorSpanId);

      console.log('✅ Distributed tracing verified:');
      console.log('   Parent (coordinator):');
      console.log(`     TraceID:  ${coordinatorTraceId}`);
      console.log(`     SpanID:   ${coordinatorSpanId}`);
      console.log('   Child (worker):');
      console.log(`     TraceID:  ${childSpan.traceId}`);
      console.log(`     ParentID: ${childSpan.parentSpanId}`);
      console.log(`     Name:     ${childSpan.name}`);
    }
  }, 30_000);

  it('runs without traceContext if not provided', async () => {
    const spanCollectorUrl = `http://127.0.0.1:${collectorPort}`;
    initWorkerTracing(spanCollectorUrl, 'test-worker-no-parent');

    // Effect with no parent trace context
    const testEffect = Effect.fn(
      'test.orphan.span',
      {},
    )(function* () {
      return 'orphan result';
    })();

    const effectWithoutParent = withExtractedTraceContext({}, testEffect);

    const result = await Effect.runPromise(effectWithoutParent);
    expect(result).toBe('orphan result');

    // Wait for export
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Should still export a span, but with no parent
    expect(receivedBodies.length).toBeGreaterThan(0);

    const exported = JSON.parse(receivedBodies[receivedBodies.length - 1]);
    const spans: OtlpSpan[] =
      exported.resourceSpans?.[0]?.scopeSpans?.[0]?.spans || [];

    const orphanSpan = spans.find((s) => s.name === 'test.orphan.span');
    expect(orphanSpan).toBeDefined();
    expect(orphanSpan?.parentSpanId).toBeUndefined(); // No parent
  }, 30_000);
});
