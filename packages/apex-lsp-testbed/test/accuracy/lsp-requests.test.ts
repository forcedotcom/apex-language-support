/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { ServerType } from '../../src/utils/serverUtils';

// Import the test utils with a namespace to avoid conflicts
const testUtils = require('../../src/test-utils/serverFactory');
const { createTestServer } = testUtils;

// --- Load test data synchronously ---
const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = readFileSync(logPath, 'utf8');
const logData: Record<string, any> = JSON.parse(rawData);

jest.setTimeout(10000);

// Extract relevant request/response pairs
const testData: [string, any][] = Object.values(logData)
  .filter((entry) => entry.type === 'request' && /^textDocument/.test(entry.method))
  // .filter((entry) => entry.id === 33)
  .map((request) => [request.method, request]);

describe.skip('LSP Request/Response Accuracy', () => {
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    const options = {
      serverType: 'jorje' as ServerType,
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

  it.each(testData)('LSP %s request/response matches snapshot for request %s', async (method, request) => {
    const actualResponse = await serverContext.client.sendRequest(method, request.params);

    const snapshotData = {
      request: {
        method: request.method,
        params: request.params,
      },
      expectedResponse: request?.result,
      actualResponse,
    };

    expect(snapshotData).toMatchSnapshot();
  });
});
