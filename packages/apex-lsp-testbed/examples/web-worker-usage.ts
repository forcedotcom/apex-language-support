/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexClientCore } from '@salesforce/apex-lsp-client';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';

import { ApexLspTestClient } from '../src/test-utils/ApexLspTestClient';
import { MockRpcConnection } from '../src/test-utils/MockRpcConnection';

/**
 * Example of using ApexLspTestClient with MockRpcConnection (SDK-backed).
 *
 * In production, web worker transport is handled by the SDK's
 * `createBrowserClient` (browser entry point). This example demonstrates
 * the testbed's mock transport for unit/demo testing without a real server.
 */
async function exampleSdkUsage() {
  console.log('[Example] Starting SDK-backed mock language server...');

  // Create a mock connection (replaces web worker for demo/test purposes)
  const mockConn = new MockRpcConnection();
  const core = await ApexClientCore.create(mockConn);
  mockConn.listen();

  // Initialize the server with default settings
  const initResult = await core.initialize(DEFAULT_APEX_SETTINGS);
  const client = new ApexLspTestClient(core, initResult);

  try {
    console.log('[Example] Server initialized successfully');

    // Show server capabilities
    const capabilities = client.getServerCapabilities();
    console.log(
      `[Example] Server capabilities: ${JSON.stringify(capabilities, null, 2)}`,
    );

    // Check if the server is healthy
    const isHealthy = client.isHealthy();
    console.log(
      `[Example] Server health check: ${isHealthy ? 'OK' : 'FAILED'}`,
    );

    if (isHealthy) {
      // Example: Open a document
      const testDocument = `
public class TestClass {
    private String name;

    public TestClass(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }
}`;

      client.openTextDocument('file:///test.cls', testDocument, 'apex');
      console.log('[Example] Document opened successfully');

      // Example: Get document symbols
      const symbols = await client.documentSymbol({
        textDocument: { uri: 'file:///test.cls' },
      });
      console.log(
        `[Example] Found ${Array.isArray(symbols) ? symbols.length : 0} symbols in document`,
      );

      // Example: Get hover info
      const hoverResult = await client.hover({
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 10 },
      });
      console.log(`[Example] Hover result: ${JSON.stringify(hoverResult)}`);

      // Example: Get completions
      const completions = await client.completion({
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 5, character: 14 },
      });
      console.log(
        `[Example] Completions: ${Array.isArray(completions) ? completions.length : 0} items`,
      );

      // Close the document
      client.closeTextDocument('file:///test.cls');
      console.log('[Example] Document closed successfully');
    }
  } catch (error) {
    console.error(`[Example] Error: ${error}`);
  } finally {
    // Shutdown the server
    await core.shutdown();
    await core.dispose();
    console.log('[Example] Server stopped');
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleSdkUsage().catch(console.error);
}

export { exampleSdkUsage };
