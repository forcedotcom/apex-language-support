/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import Benchmark from 'benchmark';

import {
  createTestServer,
  ServerOptions,
} from '../../src/test-utils/serverFactory';
import { normalizeTraceData } from '../../src/test-utils/traceDataUtils';

// --- Load test data synchronously ---
const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = readFileSync(logPath, 'utf8');
const logData: Record<string, any> = JSON.parse(rawData);

// Normalize the trace data for portability
const normalizedLogData = normalizeTraceData(logData);

jest.setTimeout(1000 * 60 * 15); // 15 minutes timeout

// Extract relevant request/response pairs
const testData: [string, any][] = Object.values(normalizedLogData)
  .filter(
    (entry) => entry.type === 'request' && /^textDocument/.test(entry.method),
  )
  .reduce((acc: [string, any][], request) => {
    // Only add if we haven't seen this method before
    if (!acc.some(([method]) => method === request.method)) {
      acc.push([request.method, request]);
    }
    return acc;
  }, []);

// Server types to test
const serverTypes = ['jorje', 'nodeServer', 'webServer'] as const;

// Results storage by server type and method
interface BenchmarkResult {
  method: string;
  serverId: string;
  serverType: string;
  hz: number; // operations per second
  stats: {
    rme: number; // relative margin of error
    mean: number;
    deviation: number;
    variance: number;
  };
}

describe.skip('Server Type Performance Comparison', () => {
  const requestTimeout = 10000; // 10 second timeout per request
  let serverContexts: Record<string, any> = {};
  const results: BenchmarkResult[] = [];

  // Run before all tests
  beforeAll(async () => {
    // Set up all server types
    for (const serverType of serverTypes) {
      console.log(`Setting up ${serverType} server...`);
      try {
        const options: ServerOptions = {
          serverType: serverType,
          verbose: true,
          workspacePath: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
        };
        serverContexts[serverType] = await createTestServer(options);

        // Wait for server to be ready
        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log(`${serverType} server ready`);
      } catch (error) {
        console.error(`Error setting up ${serverType} server:`, error);
      }
    }
  });

  // Run after all tests
  afterAll(async () => {
    // Clean up all servers
    for (const serverType of serverTypes) {
      if (serverContexts[serverType]) {
        await serverContexts[serverType].cleanup();
      }
    }

    // Write consolidated results
    const outputPath = join(__dirname, '../server-comparison-results.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
  });

  // Test each LSP method
  for (const [method] of testData) {
    it(`should compare ${method} performance across server types`, async () => {
      const suite = new Benchmark.Suite();

      // Add benchmarks for each server type
      for (const serverType of serverTypes) {
        const serverContext = serverContexts[serverType];
        if (!serverContext) {
          console.warn(
            `Skipping ${serverType} for ${method} (server not available)`,
          );
          continue;
        }

        // Ensure client is started
        await serverContext.client.start();

        // Get first request of this method type
        const request = testData.find(([m]) => m === method)?.[1];
        if (!request) continue;

        // Add benchmark for this server type
        suite.add(`${serverType} - ${method}`, {
          defer: true,
          fn: function (deferred: { resolve: () => void }) {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(
                () =>
                  reject(
                    new Error(`Request timed out after ${requestTimeout}ms`),
                  ),
                requestTimeout,
              );
            });

            const req = serverContext.client.sendRequest(
              method,
              request.params,
            );

            Promise.race([Promise.resolve(req), timeoutPromise])
              .then(() => deferred.resolve())
              .catch((error) => {
                console.error(`Error in ${serverType} ${method}:`, error);
                deferred.resolve(); // Resolve anyway to continue the benchmark
              });
          },
        });
      }

      return new Promise<void>((resolve) => {
        suite
          .on('cycle', function (event: Benchmark.Event) {
            const benchmark = event.target as Benchmark.Target;
            console.log(String(benchmark));

            // Parse the server type and method from the name
            const [serverType, methodName] = (benchmark.name || '').split(
              ' - ',
            );

            if (serverType && methodName && benchmark.stats) {
              results.push({
                method: methodName,
                serverId: benchmark.id ? String(benchmark.id) : '',
                serverType,
                hz: benchmark.hz || 0,
                stats: {
                  rme: benchmark.stats.rme,
                  mean: benchmark.stats.mean,
                  deviation: benchmark.stats.deviation,
                  variance: benchmark.stats.variance,
                },
              });
            }
          })
          .on('complete', function (this: Benchmark.Suite) {
            const fastest = this.filter('fastest');
            console.log(
              `Fastest server for ${method} is ${fastest.map('name').toString().split(' - ')[0]}`,
            );
            resolve();
          })
          .run({ async: true });
      });
    });
  }
});
