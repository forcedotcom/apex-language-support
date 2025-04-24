/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  createTestServer,
  ServerOptions as ServerOptions,
} from '../../src/test-utils/serverFactory.js';

describe.skip('LSP Request/Response Accuracy', () => {
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;
  let logData: Record<string, any> = {};

  beforeAll(async () => {
    // Read the expected request/response pairs from the log file
    const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
    const rawData = readFileSync(logPath, 'utf8');
    logData = JSON.parse(rawData);

    // Initialize the server
    const options: ServerOptions = {
      serverType: 'jorje',
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

  // Filter and test client-initiated requests
  test.each(
    Object.values(logData)
      .filter(
        (entry) =>
          entry.type === 'request' &&
          entry.direction === 'send' &&
          entry.method &&
          entry.result === undefined,
      )
      .map((request) => [request.method, request]),
  )('LSP %s request/response matches snapshot', async (method, request) => {
    // Make the actual request to the server
    const response = await serverContext.client.sendRequest(
      request.method,
      request.params,
    );

    // Create a clean snapshot object with just the essential info
    const snapshotData = {
      request: {
        method: request.method,
        params: request.params,
      },
      response: {
        result: response,
      },
    };

    expect(snapshotData).toMatchSnapshot();
  });
});
