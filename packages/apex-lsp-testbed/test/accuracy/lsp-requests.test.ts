/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { LSPMessage } from '../../src/utils/lspTraceParser';

describe('LSP Request/Response Accuracy', () => {
  let logData: Record<string, LSPMessage> = {};

  beforeAll(() => {
    const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
    const rawData = readFileSync(logPath, 'utf8');
    logData = JSON.parse(rawData) as Record<string, LSPMessage>;
  });

  // Helper to find matching response
  const findMatchingResponse = (request: LSPMessage): LSPMessage | undefined =>
    Object.values(logData).find(
      (entry) =>
        entry.type === 'request' &&
        entry.id === request.id &&
        entry.result !== undefined,
    );

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
    const response = findMatchingResponse(request);

    // Create a clean snapshot object with just the essential info
    const snapshotData = {
      request: {
        method: request.method,
        params: request.params,
      },
      response: response
        ? {
            result: response.result,
          }
        : undefined,
    };

    expect(snapshotData).toMatchSnapshot();
  });
});
