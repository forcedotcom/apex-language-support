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

    const result = [...parser.parse(logContent).values()];
    // Should have only one id (0), which will be the response (last message for id=0)
    expect(result).toHaveLength(1);
    const msg = result[0];
    expect(msg).toBeDefined();
    expect(msg.type).toBe('response');
    expect(msg.method).toBe('initialize');
    expect(msg.id).toBe(0);
    expect(msg.result).toBeDefined();
    expect(msg.result.capabilities.textDocumentSync).toBe(1);
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

    const result = [...parser.parse(logContent).values()];
    // Should have two messages: one notification, one response (id=0)
    expect(result).toHaveLength(2);
    // Find notification by negative id
    const notif = result.find((item) => item.type === 'notification');
    expect(notif).toBeDefined();
    if (notif) {
      expect(notif.params).toBeDefined();
      if (!notif.params) {
        throw new Error(
          'Notification params were not attached. Check parser logic.',
        );
      }
      expect(notif.method).toBe('telemetry/event');
      expect(notif.params.properties.Feature).toBe(
        'ApexLanguageServerLauncher',
      );
    }
    // Check response
    const response = result[0];
    expect(response).toBeDefined();
    expect(response.type).toBe('response');
    expect(response.method).toBe('initialize');
    expect(response.id).toBe(0);
  });

  it('should handle multiple request/response pairs', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.

[Trace - 10:20:06 AM] Sending request 'textDocument/hover - (1)'.
[Trace - 10:20:06 AM] Received response 'textDocument/hover - (1)' in 45ms.`;

    const result = [...parser.parse(logContent).values()];
    // Should have two messages: one for each id (0 and 1), both responses
    expect(result).toHaveLength(2);
    expect(result[0]).toBeDefined();
    expect(result[0].type).toBe('response');
    expect(result[0].method).toBe('initialize');
    expect(result[1]).toBeDefined();
    expect(result[1].type).toBe('response');
    expect(result[1].method).toBe('textDocument/hover');
  });

  it('should handle malformed JSON gracefully', () => {
    const logContent = `
[Trace - 10:20:04 AM] Sending request 'initialize - (0)'.
Params: {
    "processId": 2979,
    "malformed": json
}

[Trace - 10:20:05 AM] Received response 'initialize - (0)' in 1182ms.`;
    const result = [...parser.parse(logContent).values()];
    const msg = result[0];
    expect(msg).toBeDefined();
    expect(msg.type).toBe('response');
    expect(msg.method).toBe('initialize');
    expect(msg.params).toBeUndefined();
  });

  it('should parse a real trace log and write JSON output', async () => {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.resolve(__dirname, '../ls-sample-trace.log.txt');
    const outPath = path.resolve(__dirname, '../ls-sample-trace.log.json');
    const logContent = fs.readFileSync(logPath, 'utf8');
    const result = parser.parse(logContent);
    // Convert Map to object for JSON output
    const objResult = Object.fromEntries(result.entries());
    fs.writeFileSync(outPath, JSON.stringify(objResult, null, 2), 'utf8');
    // Basic assertion: result is a non-empty Map
    expect(result.size).toBeGreaterThan(0);
    // Optionally, check that all values are LSPMessage-like
    for (const [, msg] of result.entries()) {
      expect(msg).toHaveProperty('type');
      expect(['request', 'response', 'notification']).toContain(msg.type);
      expect(msg).toHaveProperty('method');
    }
  });
});
