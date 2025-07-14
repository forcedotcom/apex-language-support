/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexJsonRpcClient,
  ConsoleLogger,
  JsonRpcClientOptions,
} from '../src/client/ApexJsonRpcClient';
import * as path from 'path';

/**
 * Example of using ApexJsonRpcClient with web worker
 */
async function exampleWebWorkerUsage() {
  const logger = new ConsoleLogger('WebWorkerExample');

  // Configure the client to use web worker
  const options: JsonRpcClientOptions = {
    serverType: 'webWorker',
    serverPath: path.join(__dirname, '../../apex-ls-node/out/index.js'),
    webWorkerOptions: {
      workerUrl: path.join(__dirname, '../../apex-ls-node/out/index.js'),
      workerOptions: {
        name: 'apex-language-server-worker',
      },
    },
    initializeParams: {
      processId: process.pid,
      clientInfo: {
        name: 'Web Worker Example Client',
        version: '1.0.0',
      },
      capabilities: {
        textDocument: {
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext'],
          },
          documentSymbol: {
            dynamicRegistration: true,
            hierarchicalDocumentSymbolSupport: true,
          },
        },
        workspace: {
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
          },
        },
      },
      rootUri: `file://${process.cwd()}`,
    },
  };

  const client = new ApexJsonRpcClient(options, logger);

  try {
    logger.info('Starting web worker language server...');

    // Start the client (this will start the web worker)
    await client.start();

    logger.info('Web worker server started successfully');

    // Check if the server is healthy
    const isHealthy = await client.isHealthy();
    logger.info(`Server health check: ${isHealthy ? 'OK' : 'FAILED'}`);

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

      await client.openTextDocument('file:///test.cls', testDocument, 'apex');

      logger.info('Document opened successfully');

      // Example: Get document symbols
      const symbols = await client.documentSymbol('file:///test.cls');
      logger.info(`Found ${symbols?.length || 0} symbols in document`);

      // Example: Send a ping
      await client.ping();
      logger.info('Ping successful');

      // Close the document
      await client.closeTextDocument('file:///test.cls');
      logger.info('Document closed successfully');
    }
  } catch (error) {
    logger.error(`Error: ${error}`);
  } finally {
    // Stop the client
    await client.stop();
    logger.info('Web worker server stopped');
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleWebWorkerUsage().catch(console.error);
}

export { exampleWebWorkerUsage };
