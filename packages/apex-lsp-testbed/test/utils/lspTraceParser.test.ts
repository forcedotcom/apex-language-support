/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LSPTraceParser } from '../../src/utils/lspTraceParser';

describe('LSPTraceParser', () => {
  let parser: LSPTraceParser;

  beforeEach(() => {
    parser = new LSPTraceParser();
  });

  it('should parse a simple request/response pair', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979,
    "clientInfo": {
        "name": "Visual Studio Code",
        "version": "1.99.3"
    }
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.
Result: {
    "capabilities": {
        "textDocumentSync": 1,
        "hoverProvider": true
    }
}`;

    const result = parser.parse(logContent);
    expect(result).toHaveLength(1);
    const pair = result[0];
    expect('request' in pair).toBe(true);
    if ('request' in pair) {
      expect(pair.request.method).toBe('initialize');
      expect(pair.request.id).toBe(0);
      expect(pair.response?.method).toBe('initialize');
      expect(pair.duration).toBe(1182);
      expect(pair.request.params).toBeDefined();
      expect(pair.request.params.processId).toBe(2979);
      expect(pair.response).toBeDefined();
      expect(pair.response?.result?.capabilities.textDocumentSync).toBe(1);
    }
  });

  it('should parse notifications and telemetry events', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979
}

[Trace - 10:20:05 AM] Received notification 'telemetry/event'.
Params: {
    "properties": {
        "Feature": "ApexLanguageServerLauncher"
    },
    "measures": {
        "ExecutionTime": 333
    }
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.`;

    const result = parser.parse(logContent);
    expect(result).toHaveLength(2);
    // Find notification and request/response pair
    const notif = result.find(
      (item) => 'type' in item && item.type === 'notification',
    );
    const pair = result.find(
      (item) => 'request' in item && item.request.method === 'initialize',
    );
    expect(notif).toBeDefined();
    expect(pair).toBeDefined();
    if (notif && 'type' in notif && notif.type === 'notification') {
      expect(notif.method).toBe('telemetry/event');
      expect(notif.params).toBeDefined();
      expect(notif.params.properties.Feature).toBe(
        'ApexLanguageServerLauncher',
      );
    }
    if (pair && 'request' in pair) {
      expect(pair.request.method).toBe('initialize');
      expect(pair.duration).toBe(1182);
    }
  });

  it('should handle multiple request/response pairs', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.

[Trace - 10:20:06 AM] Sending request 'textDocument/hover - (1)'.
[Trace - 10:20:06 AM] Received response 'textDocument/hover - (1)' in 45ms.`;

    const result = parser.parse(logContent);
    // Only request/response pairs should be present
    const pairs = result.filter((item) => 'request' in item);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].request.method).toBe('initialize');
    expect(pairs[1].request.method).toBe('textDocument/hover');
    expect(pairs[0].duration).toBe(1182);
    expect(pairs[1].duration).toBe(45);
  });

  it('should handle malformed JSON gracefully', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979,
    "malformed": json
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.`;

    const result = parser.parse(logContent);
    const pair = result.find(
      (item) => 'request' in item && item.request.method === 'initialize',
    );
    expect(pair).toBeDefined();
    if (pair && 'request' in pair) {
      expect(pair.request.params).toBeUndefined();
      expect(pair.duration).toBe(1182);
    }
  });
});
