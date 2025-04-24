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

interface LSPLogEntry {
  type: string;
  direction: string;
  method?: string;
  params?: any;
  result?: any;
  id?: number | string;
}

describe.skip('LSP Performance Benchmarks', () => {
  let logData: LSPLogEntry[];
  let clientRequests: LSPLogEntry[];

  beforeAll(() => {
    const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
    const rawData = readFileSync(logPath, 'utf8');
    logData = JSON.parse(rawData);

    // Filter client-initiated requests
    clientRequests = logData.filter(
      (entry) =>
        entry.type === 'request' &&
        entry.direction === 'client-to-server' &&
        entry.method,
    );
  });

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
  });
});
