/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { BenchmarkRunner } from '../../src/test-utils/BenchmarkRunner';
import { ApexJsonRpcClient } from '../../src/client/ApexJsonRpcClient';

// This test uses benchmark.js to measure LSP performance
describe('LSP Performance Tests', () => {
  let client: ApexJsonRpcClient;
  const serverPath = process.env.LSP_SERVER_PATH || 'mock-server.js';
  const outputPath = path.join(__dirname, '..', '..', 'benchmark-output.json');

  beforeAll(async () => {
    // Set up LSP client
    client = new ApexJsonRpcClient({
      serverPath,
      args: [],
    });
    await client.start();
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should benchmark LSP operations', async () => {
    // Create benchmark suite
    const runner = new BenchmarkRunner({
      name: 'LSP Operations',
      outputPath,
    });

    // Add test cases
    runner.add('Initialize', async () => {
      // Create a minimal initialize request
      const params = {
        processId: process.pid,
        rootUri: 'file:///test',
        capabilities: {
          textDocument: {
            completion: { dynamicRegistration: true },
            hover: { dynamicRegistration: true },
          },
        },
      };
      
      // Measure performance of initialize request
      await client.sendRequest('initialize', params);
    });

    runner.add('Completion', async () => {
      // Measure performance of completion request
      await client.sendRequest('textDocument/completion', {
        textDocument: { uri: 'file:///test/Test.cls' },
        position: { line: 0, character: 0 },
      });
    });

    runner.add('Hover', async () => {
      // Measure performance of hover request
      await client.sendRequest('textDocument/hover', {
        textDocument: { uri: 'file:///test/Test.cls' },
        position: { line: 0, character: 0 },
      });
    });

    runner.add('DocumentSymbol', async () => {
      // Measure performance of document symbol request
      await client.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: 'file:///test/Test.cls' },
      });
    });

    // Add more LSP benchmarks as needed
    runner.add('Definition', async () => {
      // Measure performance of definition request
      await client.sendRequest('textDocument/definition', {
        textDocument: { uri: 'file:///test/Test.cls' },
        position: { line: 5, character: 10 },
      });
    });

    // Run benchmark and collect results
    await runner.run();
  }, 60000); // Longer timeout for benchmarks
}); 