/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const fs = require('fs');
const path = require('path');

const Benchmark = require('benchmark');

const { createTestServer } = require('../../src/test-utils/serverFactory');

// --- Load test data synchronously ---
const logPath = path.join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = fs.readFileSync(logPath, 'utf8');
const logData = JSON.parse(rawData);

jest.setTimeout(1000 * 60 * 10);

// Extract relevant request/response pairs
const testData = (
  Object.values(logData) as Array<{ type: string; method: string }>
)
  .filter(
    (entry: { type: string; method: string }) =>
      entry.type === 'request' && /^textDocument/.test(entry.method),
  )
  .reduce((acc: [string, unknown][], request: { method: string }) => {
    // Only add if we haven't seen this method before
    if (!acc.some(([method]) => method === request.method)) {
      acc.push([request.method, request]);
    }
    return acc;
  }, []);

// Skip test because of known issue with WebServer connection headers
describe.skip('WebServer LSP Performance Benchmarks', () => {
  let serverContext;

  beforeAll(async () => {
    const options = {
      serverType: 'webServer',
      verbose: true,
      workspacePath: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    };
    
    // Create server and wait for initialization
    serverContext = await createTestServer(options);
    
    // Wait for server to be properly initialized
    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  afterAll(async () => {
    if (serverContext && serverContext.cleanup) {
      await serverContext.cleanup();
      
      // Additional delay to ensure proper connection termination
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });

  it('should benchmark WebServer LSP request handling', async () => {
    // Make sure client is started before running tests
    if (!serverContext.client._isRunning) {
      await serverContext.client.start();
    }
    
    const suite = new Benchmark.Suite();
    const requestTimeout = 10000; // 10 second timeout per request
    const results = {};
    // Add benchmark for each LSP method type
    (testData as [string, { method: string; id: string; params: unknown }][]).forEach(([method, request]) => {
      suite.add(`WebServer LSP ${method} Id: ${request.id}`, {
        defer: true,
        fn: function (deferred) {
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
        .on('cycle', function (event) {
          const benchmark = event.target;
          if (benchmark.name) {
            results[benchmark.name] = benchmark;
          }
          console.log(String(benchmark));
        })
        .on('complete', function () {
          console.log(
            'Fastest webServer method is ' + this.filter('fastest').map('name'),
          );

          // Write results to disk
          const outputPath = path.join(
            __dirname,
            '../webserver-benchmark-results.json',
          );

          fs.writeFileSync(
            outputPath,
            JSON.stringify(results, null, 2),
          );
          resolve();
        })
        .run({ async: true });
    });
  });
});
