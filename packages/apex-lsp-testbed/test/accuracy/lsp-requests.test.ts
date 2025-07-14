/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// Import the test utils with a namespace to avoid conflicts
import {
  createTestServer,
  ServerOptions,
} from '../../src/test-utils/serverFactory';
import { ServerType } from '../../src/utils/serverUtils';
import {
  normalizeTraceData,
  denormalizeRequest,
  getDocumentOpenEventsBeforeRequest,
} from '../../src/test-utils/traceDataUtils';

// --- Load test data synchronously ---
const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = readFileSync(logPath, 'utf8');
const logData: Record<string, any> = JSON.parse(rawData);

jest.setTimeout(180_000); // Increased timeout for server operations

// Add global error handlers to catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

/**
 * Configuration for request groups to test.
 * Each group defines a test case with a name, filter pattern, and optional description.
 */
interface RequestGroupConfig {
  /** Name of the request group (used in test descriptions) */
  name: string;
  /** Regex pattern to match request methods */
  methodPattern: RegExp;
  /** Optional description for the test group */
  description?: string;
}

/**
 * Configuration for all request groups to test.
 * Add new request types here to automatically generate test cases.
 */
const REQUEST_GROUPS: RequestGroupConfig[] = [
  {
    name: 'textDocument/documentSymbol',
    methodPattern: /^textDocument\/documentSymbol/,
    description: 'Document symbol requests',
  },
  // Add more request groups here as needed:
  // {
  //   name: 'textDocument/completion',
  //   methodPattern: /^textDocument\/completion/,
  //   description: 'Completion requests',
  // },
  // {
  //   name: 'textDocument/hover',
  //   methodPattern: /^textDocument\/hover/,
  //   description: 'Hover requests',
  // },
];

/**
 * Extracts test data for a specific request group.
 * @param config - The request group configuration
 * @returns Array of test data tuples [method, request]
 */
const extractTestDataForGroup = (
  config: RequestGroupConfig,
): [string, any][] => {
  // Normalize the trace data first
  const normalizedLogData = normalizeTraceData(logData);

  return Object.values(normalizedLogData)
    .filter(
      (entry) =>
        entry.type === 'request' && config.methodPattern.test(entry.method),
    )
    .map((request) => [request.method, request]);
};

describe('LSP Request/Response Accuracy', () => {
  const targetServer: ServerType = 'nodeServer';
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    const options: ServerOptions = {
      serverType: targetServer,
      verbose: false,
      workspacePath: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    };

    // Add timeout to server startup
    const serverPromise = createTestServer(options);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Server startup timeout')), 60000);
    });

    serverContext = (await Promise.race([
      serverPromise,
      timeoutPromise,
    ])) as Awaited<ReturnType<typeof createTestServer>>;

    // Give the server a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (serverContext) {
      try {
        await serverContext.cleanup();
      } catch (error) {
        console.warn(`Cleanup failed: ${error}`);
      }
    }

    // Give some time for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Force cleanup any remaining processes
    try {
      // Kill any remaining Node.js processes that might be hanging
      const { exec } = require('child_process');
      exec('pkill -f "apex-ls-node"', (error: any) => {
        if (error) {
          console.warn('No apex-ls-node processes to kill');
        }
      });
    } catch (error) {
      console.warn('Failed to force cleanup processes:', error);
    }
  });

  // Generate test groups for each configured request type
  REQUEST_GROUPS.forEach((groupConfig) => {
    const testData = extractTestDataForGroup(groupConfig);

    // Skip creating a describe block if no test data is found
    if (testData.length === 0) {
      return;
    }

    describe(`${groupConfig.name} requests`, () => {
      it.each(testData)(
        'LSP %s request/response matches snapshot for request %s',
        async (method, request) => {
          // Convert normalized URIs back to actual workspace paths
          const denormalizedRequest = denormalizeRequest(
            request,
            serverContext.workspace?.rootUri || '',
          );

          // For document symbol requests, ensure the document is opened first
          if (method === 'textDocument/documentSymbol') {
            // Check if this document was opened in the trace before this request
            const normalizedLogData = normalizeTraceData(logData);
            const documentOpenEvents = getDocumentOpenEventsBeforeRequest(
              normalizedLogData,
              request.id,
              request.params.textDocument.uri,
            );

            if (documentOpenEvents.length > 0) {
              // Open the document first with denormalized URI
              const openEvent =
                documentOpenEvents[documentOpenEvents.length - 1];
              const denormalizedOpenEvent = denormalizeRequest(
                openEvent,
                serverContext.workspace?.rootUri || '',
              );

              try {
                await serverContext.client.openTextDocument(
                  denormalizedOpenEvent.params.textDocument.uri,
                  denormalizedOpenEvent.params.textDocument.text,
                  denormalizedOpenEvent.params.textDocument.languageId ||
                    'apex',
                );

                // Give the server a moment to process the document
                await new Promise((resolve) => setTimeout(resolve, 100));
              } catch (error) {
                console.warn(`Failed to open document: ${error}`);
                // Continue with the test even if document opening fails
              }
            }
          }

          let actualResponse;
          try {
            // Check if server is still healthy before sending request
            if (!(await serverContext.client.isHealthy())) {
              throw new Error('Server is not healthy, cannot send request');
            }

            actualResponse = await serverContext.client.sendRequest(
              method,
              denormalizedRequest.params,
            );
          } catch (error) {
            // Handle EPIPE errors more gracefully
            if (error instanceof Error && error.message.includes('EPIPE')) {
              console.error(`EPIPE error in test: ${error.message}`);
              actualResponse = {
                error: `Server connection lost (EPIPE): ${error.message}`,
                type: 'connection_error',
              };
            } else {
              console.warn(`Request failed: ${error}`);
              actualResponse = {
                error: error instanceof Error ? error.message : String(error),
                type: 'request_error',
              };
            }
          }

          const snapshotData = {
            request: {
              method: request.method,
              params: request.params, // Use the normalized request for snapshot
            },
            expectedResponse: request?.result,
            actualResponse,
          };

          expect(snapshotData).toMatchSnapshot(`${groupConfig.name}-request`);
        },
      );
    });
  });
});
