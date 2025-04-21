/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkRunner } from '../../src/test-utils/BenchmarkRunner';

/**
 * Sample file content for LSP benchmarks
 */
const SAMPLE_CODE = `
public class SampleClass {
    private Integer count;
    private String name;
    
    public SampleClass(String name, Integer count) {
        this.name = name;
        this.count = count;
    }
    
    public String getName() {
        return this.name;
    }
    
    public Integer getCount() {
        return this.count;
    }
    
    public void incrementCount() {
        this.count++;
    }
    
    public void performOperation() {
        for (Integer i = 0; i < count; i++) {
            System.debug('Operation ' + i + ' for ' + name);
        }
    }
}
`;

/**
 * This script runs benchmarks on LSP requests
 * Run with: node dist/test/performance/lsp-request-benchmark.js
 */
async function main() {
  // Set up temp file for testing
  const tempDir = path.join(__dirname, '..', '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFile = path.join(tempDir, 'SampleClass.cls');
  fs.writeFileSync(tempFile, SAMPLE_CODE);

  // Configure client options (use your existing LSP client implementation)
  const clientOptions = {
    serverPath: process.env.LSP_SERVER_PATH || 'mock-server.js',
    args: [],
  };

  try {
    // Import the client dynamically to avoid circular dependencies
    const { ApexJsonRpcClient } = await import('../../src/client/ApexJsonRpcClient');
    const client = new ApexJsonRpcClient(clientOptions);
    
    // Start client and connect to server
    await client.start();

    // Initialize the language server
    await client.sendRequest('initialize', {
      processId: process.pid,
      rootUri: `file://${tempDir}`,
      capabilities: {
        textDocument: {
          completion: { dynamicRegistration: true },
          hover: { dynamicRegistration: true },
        },
      },
    });
    
    // Notify server client is initialized
    await client.sendNotification('initialized', {});

    // Open document
    const documentUri = `file://${tempFile}`;
    await client.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: documentUri,
        languageId: 'apex',
        version: 1,
        text: SAMPLE_CODE,
      },
    });

    // Create benchmark runner
    const benchmarkRunner = new BenchmarkRunner({
      name: 'LSP Request Benchmark',
      outputPath: path.join(__dirname, '..', '..', 'benchmark-output.json'),
    });

    // Add benchmark cases
    benchmarkRunner.add('Completion at empty location', async () => {
      await client.sendRequest('textDocument/completion', {
        textDocument: { uri: documentUri },
        position: { line: 1, character: 0 },
      });
    });

    benchmarkRunner.add('Completion at method', async () => {
      await client.sendRequest('textDocument/completion', {
        textDocument: { uri: documentUri },
        position: { line: 20, character: 15 },
      });
    });

    benchmarkRunner.add('Hover at class declaration', async () => {
      await client.sendRequest('textDocument/hover', {
        textDocument: { uri: documentUri },
        position: { line: 1, character: 14 },
      });
    });

    benchmarkRunner.add('Document symbols', async () => {
      await client.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: documentUri },
      });
    });

    // Run benchmarks
    await benchmarkRunner.run();

    // Close document and shut down
    await client.sendNotification('textDocument/didClose', {
      textDocument: { uri: documentUri },
    });
    
    await client.sendRequest('shutdown', {});
    await client.sendNotification('exit', {});
    
    // Stop client
    await client.stop();

    console.log('Benchmark completed successfully');
  } catch (error) {
    console.error('Error running benchmark:', error);
    process.exit(1);
  } finally {
    // Clean up temp files
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
      fs.rmdirSync(tempDir);
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main }; 