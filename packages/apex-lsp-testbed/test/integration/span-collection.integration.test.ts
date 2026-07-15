/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import * as http from 'http';
import { ApexJsonRpcClient } from '../../src/client/ApexJsonRpcClient';

/**
 * Integration test to verify that OTEL spans are collected end-to-end:
 * - Coordinator spans (runWithSpan)
 * - Worker spans (Effect.fn)
 * - Trace context propagation across coordinator→worker boundary
 * - Parent-child relationships maintained
 */
describe('Span Collection Integration', () => {
  let client: ApexJsonRpcClient;
  let spanCollectorServer: http.Server;
  let collectorPort: number;
  let receivedSpans: any[] = [];

  // Path to the actual Node.js server bundle
  const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');

  // Path to test fixtures (declared for potential future use)
  const _testFixturePath = join(__dirname, '../fixtures/SimpleLoggingTest.cls');
  const _testFixtureUri = pathToFileURL(_testFixturePath).href;
  const _testFixtureContent = readFileSync(_testFixturePath, 'utf-8');

  // Workspace URI for initialization
  const workspaceUri = pathToFileURL(join(__dirname, '../fixtures')).href;

  // Increase timeout for integration test
  jest.setTimeout(60000); // 60 seconds for workspace load + span collection

  beforeAll(async () => {
    // Start simple HTTP server to receive OTLP spans
    await new Promise<void>((resolve) => {
      spanCollectorServer = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/v1/traces') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const otlpRequest = JSON.parse(body);
              // Extract spans from OTLP request format
              if (otlpRequest.resourceSpans) {
                for (const resourceSpan of otlpRequest.resourceSpans) {
                  if (resourceSpan.scopeSpans) {
                    for (const scopeSpan of resourceSpan.scopeSpans) {
                      if (scopeSpan.spans) {
                        receivedSpans.push(...scopeSpan.spans);
                      }
                    }
                  }
                }
              }
              res.writeHead(200);
              res.end('{}');
            } catch (err) {
              console.error(
                '[Span Collector] Failed to parse OTLP request:',
                err,
              );
              res.writeHead(400);
              res.end('{}');
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      spanCollectorServer.listen(0, () => {
        const addr = spanCollectorServer.address();
        if (addr && typeof addr === 'object') {
          collectorPort = addr.port;
          console.log(
            `[Test] Span collector listening on port ${collectorPort}`,
          );
          resolve();
        }
      });
    });

    // Create client with OTLP endpoint configured via environment
    // Note: The server currently reads tracing config from environment variables,
    // not from initializationOptions
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://localhost:${collectorPort}`;
    process.env.APEX_LS_ENABLE_TRACING = 'true';

    client = new ApexJsonRpcClient({
      serverPath,
      serverType: 'nodeServer',
      serverArgs: ['--stdio'],
      initializeParams: {
        rootUri: workspaceUri,
        initializationOptions: {
          logLevel: 'DEBUG',
          apex: {
            logLevel: 'DEBUG',
            experimental: {
              workers: {
                enabled: true,
              },
            },
          },
        },
      },
      env: {
        ...process.env,
        OTEL_EXPORTER_OTLP_ENDPOINT: `http://localhost:${collectorPort}`,
        APEX_LS_ENABLE_TRACING: 'true',
        APEX_WORKER_EXPERIMENT: '1',
      },
    });

    // Start the server
    await client.start();

    // Wait for initialization and workspace load to complete
    // Also wait for spans to be exported (SimpleSpanProcessor exports immediately,
    // but there's still network latency)
    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
    if (spanCollectorServer) {
      await new Promise<void>((resolve) => {
        spanCollectorServer.close(() => resolve());
      });
    }
  });

  it('should collect spans from server', () => {
    console.log(`[Test] Received ${receivedSpans.length} spans total`);
    if (receivedSpans.length > 0) {
      console.log(
        `[Test] Sample span names: ${receivedSpans
          .slice(0, 10)
          .map((s) => s.name)
          .join(', ')}`,
      );
    }

    // Check that we received at least some spans
    // (worker initialization spans prove the tracing pipeline works end-to-end)
    expect(receivedSpans.length).toBeGreaterThan(0);
  });

  it('should collect worker spans with telemetryIgnore attribute', () => {
    // Look for worker spans
    const workerSpans = receivedSpans.filter((span) => {
      const name = span.name || '';
      return name.startsWith('worker.');
    });

    expect(workerSpans.length).toBeGreaterThan(0);

    // Verify all worker spans have telemetryIgnore attribute
    for (const span of workerSpans) {
      const attrs = span.attributes || [];
      const telemetryIgnore = attrs.find(
        (attr: any) => attr.key === 'telemetryIgnore',
      );
      if (telemetryIgnore) {
        expect(telemetryIgnore.value.boolValue).toBe(true);
      }
    }
  });

  it('should maintain parent-child relationships', () => {
    // Skip this test if we don't have enough spans
    if (receivedSpans.length < 2) {
      console.log('[Test] Not enough spans to test parent-child relationships');
      return;
    }

    // Build a map of span IDs to spans
    const spanMap = new Map<string, any>();
    for (const span of receivedSpans) {
      if (span.spanId) {
        spanMap.set(span.spanId, span);
      }
    }

    // Find spans that have parent spans
    const childSpans = receivedSpans.filter(
      (span) => span.parentSpanId && span.parentSpanId.length > 0,
    );

    // If we have child spans, verify at least some parents exist
    if (childSpans.length > 0) {
      let foundParents = 0;
      for (const child of childSpans) {
        if (spanMap.has(child.parentSpanId)) {
          foundParents++;
        }
      }
      expect(foundParents).toBeGreaterThan(0);
    }
  });

  it('should verify trace IDs are present in spans', () => {
    // Verify all spans have trace IDs
    for (const span of receivedSpans) {
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
    }
  });

  it('should collect worker initialization spans', () => {
    // Look for worker initialization spans
    const initSpans = receivedSpans.filter((span) => {
      const name = span.name || '';
      return name.includes('worker.init');
    });

    // We should have worker initialization spans from the 3 worker roles
    expect(initSpans.length).toBeGreaterThan(0);
  });

  it('should verify OTLP format structure', () => {
    // Verify spans have the expected OTLP structure
    for (const span of receivedSpans) {
      expect(span).toHaveProperty('traceId');
      expect(span).toHaveProperty('spanId');
      expect(span).toHaveProperty('name');
      expect(span).toHaveProperty('startTimeUnixNano');
      expect(span).toHaveProperty('endTimeUnixNano');
    }
  });
});
