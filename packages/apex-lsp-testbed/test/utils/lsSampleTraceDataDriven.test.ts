/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'fs';
import path from 'path';

import type { LSPMessage } from '../../src/utils/lspTraceParser.js';

describe('LSP trace log data-driven tests', () => {
  // Load the JSON map of test cases
  const tracePath = path.resolve(__dirname, '../ls-sample-trace.log.json');
  const traceData: Record<string, LSPMessage> = JSON.parse(
    fs.readFileSync(tracePath, 'utf8'),
  );

  // Filter to only include textDocument methods
  const textDocumentMessages = Object.entries(traceData).filter(([, msg]) =>
    msg.method.startsWith('textDocument/'),
  );

  // Each key is a test case (numeric string)
  for (const [key, msg] of textDocumentMessages) {
    it(`should parse and validate LSP message for key ${key} (${msg.method})`, () => {
      // Basic structure checks
      expect(msg).toHaveProperty('type');
      expect(['request', 'response', 'notification']).toContain(msg.type);
      expect(msg).toHaveProperty('method');
      expect(typeof msg.method).toBe('string');
      // If id is present, it should be a number
      if ('id' in msg && msg.id !== undefined) {
        expect(typeof msg.id).toBe('number');
      }
      // If params exist, check they are an object
      if ('params' in msg && msg.params !== undefined) {
        expect(typeof msg.params).toBe('object');
      }
      // If result exists, check it is an object
      if ('result' in msg && msg.result !== undefined) {
        expect(typeof msg.result).toBe('object');
      }
      // If telemetry exists, check its structure
      if ('telemetry' in msg && msg.telemetry !== undefined) {
        expect(typeof msg.telemetry).toBe('object');
        if (
          'properties' in msg.telemetry &&
          msg.telemetry.properties !== undefined
        ) {
          expect(typeof msg.telemetry.properties).toBe('object');
        }
        if (
          'measures' in msg.telemetry &&
          msg.telemetry.measures !== undefined
        ) {
          expect(typeof msg.telemetry.measures).toBe('object');
        }
      }
      // If performance exists, check duration/memory
      if ('performance' in msg && msg.performance !== undefined) {
        expect(typeof msg.performance).toBe('object');
        if (
          'duration' in msg.performance &&
          msg.performance.duration !== undefined
        ) {
          expect(typeof msg.performance.duration).toBe('number');
        }
        if (
          'memory' in msg.performance &&
          msg.performance.memory !== undefined
        ) {
          expect(typeof msg.performance.memory).toBe('object');
          if (
            'total' in msg.performance.memory &&
            msg.performance.memory.total !== undefined
          ) {
            expect(typeof msg.performance.memory.total).toBe('number');
          }
          if (
            'used' in msg.performance.memory &&
            msg.performance.memory.used !== undefined
          ) {
            expect(typeof msg.performance.memory.used).toBe('number');
          }
        }
      }
    });
  }
});
