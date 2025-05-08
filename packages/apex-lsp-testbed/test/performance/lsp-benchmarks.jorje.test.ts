/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import Benchmark from 'benchmark';

import {
  createTestServer,
  ServerOptions,
} from '../../src/test-utils/serverFactory';

// --- Load test data synchronously ---
const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = readFileSync(logPath, 'utf8');
const logData: Record<string, any> = JSON.parse(rawData);

jest.setTimeout(1000 * 60 * 10);

// Extract relevant request/response pairs
const testData: [string, any][] = Object.values(logData)
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

describe('Jorje LSP Performance Benchmarks', () => {
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    const options: ServerOptions = {
      serverType: 'jorje',
      verbose: true,
      workspacePath: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    };
    serverContext = await createTestServer(options);

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    if (serverContext) {
      await serverContext.cleanup();
    }
  });

  it('should benchmark LSP request handling', async () => {
    const suite = new Benchmark.Suite();
    const requestTimeout = 10000; // 10 second timeout per request
    const results: Record<string, Benchmark.Target> = {};

    // Ensure client is started
    await serverContext.client.start();

    // Add benchmark for each LSP method type
    testData.forEach(([method, request]) => {
      suite.add(`LSP ${method} Id: ${request.id}`, {
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

          const req = serverContext.client.sendRequest(method, request.params);

          Promise.race([Promise.resolve(req), timeoutPromise])
            .then(() => deferred.resolve())
            .catch((error) => {
              console.error(`Error in ${method}:`, error);
              deferred.resolve(); // Resolve anyway to continue the benchmark
            });
        },
      });
    });

    return new Promise<void>((resolve) => {
      suite
        .on('cycle', function (event: Benchmark.Event) {
          const benchmark = event.target as Benchmark.Target;
          if (benchmark.name) {
            results[benchmark.name] = benchmark;
          }
          console.log(String(benchmark));
        })
        .on('complete', function (this: Benchmark.Suite) {
          console.log(
            'Fastest method is ' + this.filter('fastest').map('name'),
          );

          // Write results to disk
          const outputPath = join(__dirname, '../benchmark-results.json');
          require('fs').writeFileSync(
            outputPath,
            JSON.stringify(results, null, 2),
          );
          resolve();
        })
        .run({ async: true });
    });
  });
});
