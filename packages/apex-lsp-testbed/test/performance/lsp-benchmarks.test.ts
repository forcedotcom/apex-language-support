/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import Benchmark from 'benchmark';

// Create equivalents for __dirname and __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LSPLogEntry {
  type: string;
  direction?: string;
  method?: string;
  params?: any;
  result?: any;
  id?: number | string;
}

describe('LSP Performance Benchmarks', () => {
  let logData: LSPLogEntry[];
  let clientRequests: LSPLogEntry[];

  beforeAll(() => {
    const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
    const rawData = readFileSync(logPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // Convert object with numeric keys to array
    logData = Object.values(jsonData);

    // Filter client-initiated requests - handle the actual log structure
    clientRequests = logData.filter(
      (entry) => entry && entry.type === 'request' && entry.method,
    );
  });

  // Basic test to validate data loading
  it('should load LSP trace data correctly', () => {
    expect(logData).toBeDefined();
    expect(logData.length).toBeGreaterThan(0);
    expect(clientRequests).toBeDefined();
    expect(clientRequests.length).toBeGreaterThan(0);

    console.log(`Loaded ${logData.length} log entries`);
    console.log(`Found ${clientRequests.length} client requests`);
  });

  // Benchmark test with a longer timeout
  it('should benchmark LSP request handling', (done) => {
    const suite = new Benchmark.Suite();

    // Group requests by method for aggregate performance metrics
    const requestsByMethod = clientRequests.reduce(
      (acc, request) => {
        const method = request.method as string;
        if (!acc[method]) {
          acc[method] = [];
        }
        acc[method].push(request);
        return acc;
      },
      {} as Record<string, LSPLogEntry[]>,
    );

    // Add benchmark for each LSP method type
    Object.entries(requestsByMethod).forEach(([method, requests]) => {
      suite.add(`LSP ${method}`, {
        defer: true,
        fn: function (deferred: { resolve: () => void }) {
          // Select a random request of this method type for variety
          const request = requests[Math.floor(Math.random() * requests.length)];

          // TODO: Replace with actual language server call
          Promise.resolve(request).then(() => deferred.resolve());
        },
      });
    });

    suite
      .on('cycle', function (event: Benchmark.Event) {
        console.log(String(event.target));
      })
      .on('complete', function (this: Benchmark.Suite) {
        console.log('Fastest method is ' + this.filter('fastest').map('name'));
        done();
      })
      .run({ async: true });
  }, 60000); // 60 second timeout
});
