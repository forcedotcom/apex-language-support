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

// --- Load test data synchronously ---
const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = readFileSync(logPath, 'utf8');
const logData: Record<string, any> = JSON.parse(rawData);

jest.setTimeout(10_000);

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
const extractTestDataForGroup = (config: RequestGroupConfig): [string, any][] =>
  Object.values(logData)
    .filter(
      (entry) =>
        entry.type === 'request' && config.methodPattern.test(entry.method),
    )
    .map((request) => [request.method, request]);

describe('LSP Request/Response Accuracy', () => {
  const targetServer: ServerType = 'nodeServer';
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    const options: ServerOptions = {
      serverType: targetServer,
      verbose: true,
      workspacePath: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    };
    serverContext = await createTestServer(options);
  });

  afterAll(async () => {
    if (serverContext) {
      await serverContext.cleanup();
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
          const actualResponse = await serverContext.client.sendRequest(
            method,
            request.params,
          );

          const snapshotData = {
            request: {
              method: request.method,
              params: request.params,
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
