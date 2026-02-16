/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  logMessageTypeToLspNumber,
  shouldLog,
  setLogLevel,
} from '../src/logger';
import type { LogMessageType } from '../src/notification';

describe('Logger MessageType Functions', () => {
  describe('logMessageTypeToLspNumber', () => {
    it('should map error to LSP MessageType 1', () => {
      expect(logMessageTypeToLspNumber('error')).toBe(1);
    });

    it('should map warning to LSP MessageType 2', () => {
      expect(logMessageTypeToLspNumber('warning')).toBe(2);
    });

    it('should map info to LSP MessageType 3', () => {
      expect(logMessageTypeToLspNumber('info')).toBe(3);
    });

    it('should map log to LSP MessageType 4 (for alwaysLog, raw output)', () => {
      expect(logMessageTypeToLspNumber('log')).toBe(4);
    });

    it('should map debug to LSP MessageType 5 (formatted by VS Code)', () => {
      expect(logMessageTypeToLspNumber('debug')).toBe(5);
    });

    it('should default unknown types to MessageType 3 (Info)', () => {
      expect(logMessageTypeToLspNumber('unknown' as LogMessageType)).toBe(3);
    });
  });

  describe('shouldLog', () => {
    afterEach(() => {
      // Reset to default log level after each test
      setLogLevel('info');
    });

    it('should allow all messages at debug level', () => {
      setLogLevel('debug');

      expect(shouldLog('debug')).toBe(true);
      expect(shouldLog('info')).toBe(true);
      expect(shouldLog('warning')).toBe(true);
      expect(shouldLog('error')).toBe(true);
      expect(shouldLog('log')).toBe(true);
    });

    it('should filter debug messages at info level', () => {
      setLogLevel('info');

      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(true);
      expect(shouldLog('warning')).toBe(true);
      expect(shouldLog('error')).toBe(true);
      expect(shouldLog('log')).toBe(true);
    });

    it('should filter debug and info messages at warning level', () => {
      setLogLevel('warning');

      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(false);
      expect(shouldLog('warning')).toBe(true);
      expect(shouldLog('error')).toBe(true);
      expect(shouldLog('log')).toBe(true);
    });

    it('should filter debug, info, and warning messages at error level', () => {
      setLogLevel('error');

      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(false);
      expect(shouldLog('warning')).toBe(false);
      expect(shouldLog('error')).toBe(true);
      expect(shouldLog('log')).toBe(true);
    });

    it('should always show log type (alwaysLog) regardless of level', () => {
      setLogLevel('error');
      expect(shouldLog('log')).toBe(true);

      setLogLevel('warning');
      expect(shouldLog('log')).toBe(true);

      setLogLevel('info');
      expect(shouldLog('log')).toBe(true);

      setLogLevel('error');
      expect(shouldLog('log')).toBe(true);
    });

    it('should have log type with highest priority', () => {
      // Test that log (priority 6) shows even at error level (priority 5)
      setLogLevel('error');
      expect(shouldLog('log')).toBe(true);
      expect(shouldLog('error')).toBe(true);
      expect(shouldLog('warning')).toBe(false);
      expect(shouldLog('info')).toBe(false);
      expect(shouldLog('debug')).toBe(false);
    });
  });
});
