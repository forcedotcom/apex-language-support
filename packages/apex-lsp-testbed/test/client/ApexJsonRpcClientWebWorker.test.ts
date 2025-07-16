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
} from '../../src/client/ApexJsonRpcClient';
import * as path from 'path';

// Mock the web-worker module
jest.mock('web-worker', () => ({
  default: jest.fn().mockImplementation(() => ({
    onerror: null,
    onmessage: null,
    postMessage: jest.fn(),
    terminate: jest.fn(),
  })),
}));

describe('ApexJsonRpcClient Web Worker', () => {
  let client: ApexJsonRpcClient;
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger('TestWebWorker');

    const options: JsonRpcClientOptions = {
      serverType: 'webWorker',
      serverPath: path.join(__dirname, '../../../apex-ls-node/out/index.js'),
      webWorkerOptions: {
        workerUrl: path.join(__dirname, '../../../apex-ls-node/out/index.js'),
        workerOptions: {
          name: 'test-worker',
        },
      },
      initializeParams: {
        processId: process.pid,
        clientInfo: {
          name: 'Test Client',
          version: '1.0.0',
        },
        capabilities: {
          textDocument: {
            completion: {
              dynamicRegistration: true,
            },
          },
        },
        rootUri: `file://${process.cwd()}`,
      },
    };

    client = new ApexJsonRpcClient(options, logger);
  });

  afterEach(async () => {
    if (client) {
      await client.stop();
    }
  });

  it('should create client with web worker options', () => {
    expect(client).toBeDefined();
    expect(client.getServerCapabilities()).toBeNull(); // Not initialized yet
  });

  it('should have web worker configuration', () => {
    // Access private property for testing
    const privateClient = client as any;
    expect(privateClient.options.webWorkerOptions).toBeDefined();
    expect(privateClient.options.webWorkerOptions.workerUrl).toContain(
      'apex-ls-node',
    );
  });

  it('should identify as web worker type', () => {
    // Access private property for testing
    const privateClient = client as any;
    expect(privateClient.serverType).toBe('webWorker');
  });
});
