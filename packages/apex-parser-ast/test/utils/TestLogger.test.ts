/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestLogger, createTestLogger, getTestLogger } from './testLogger';

describe('TestLogger', () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = new TestLogger();
  });

  afterEach(() => {
    logger.clear();
  });

  describe('Basic Logging', () => {
    it('should capture debug messages', () => {
      logger.debug('Debug message');
      logger.debug(() => 'Debug function message');

      const debugLogs = logger.getDebugLogs();
      expect(debugLogs).toHaveLength(2);
      expect(debugLogs[0]).toBe('Debug message');
      expect(debugLogs[1]).toBe('Debug function message');
    });

    it('should capture info messages', () => {
      logger.info('Info message');
      logger.info(() => 'Info function message');

      const infoLogs = logger.getInfoLogs();
      expect(infoLogs).toHaveLength(2);
      expect(infoLogs[0]).toBe('Info message');
      expect(infoLogs[1]).toBe('Info function message');
    });

    it('should capture warning messages', () => {
      logger.warn('Warning message');
      logger.warn(() => 'Warning function message');

      const warnLogs = logger.getWarnLogs();
      expect(warnLogs).toHaveLength(2);
      expect(warnLogs[0]).toBe('Warning message');
      expect(warnLogs[1]).toBe('Warning function message');
    });

    it('should capture error messages', () => {
      logger.error('Error message');
      logger.error(() => 'Error function message');

      const errorLogs = logger.getErrorLogs();
      expect(errorLogs).toHaveLength(2);
      expect(errorLogs[0]).toBe('Error message');
      expect(errorLogs[1]).toBe('Error function message');
    });
  });

  describe('Log Retrieval', () => {
    it('should get all logs with metadata', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const allLogs = logger.getLogs();
      expect(allLogs).toHaveLength(4);
      expect(allLogs[0]).toMatchObject({
        level: 'debug',
        message: 'Debug message',
      });
      expect(allLogs[1]).toMatchObject({
        level: 'info',
        message: 'Info message',
      });
      expect(allLogs[2]).toMatchObject({
        level: 'warn',
        message: 'Warning message',
      });
      expect(allLogs[3]).toMatchObject({
        level: 'error',
        message: 'Error message',
      });
    });

    it('should filter logs by level', () => {
      logger.debug('Debug 1');
      logger.debug('Debug 2');
      logger.info('Info 1');
      logger.warn('Warning 1');
      logger.error('Error 1');

      expect(logger.getDebugLogs()).toHaveLength(2);
      expect(logger.getInfoLogs()).toHaveLength(1);
      expect(logger.getWarnLogs()).toHaveLength(1);
      expect(logger.getErrorLogs()).toHaveLength(1);
    });
  });

  describe('Log Search', () => {
    it('should search logs by string pattern', () => {
      logger.debug('Debug message about testing');
      logger.info('Info message about debugging');
      logger.warn('Warning about test failures');
      logger.error('Error in test execution');

      const testLogs = logger.searchLogs('test');
      expect(testLogs).toHaveLength(3);
      expect(testLogs).toContain('Debug message about testing');
      expect(testLogs).toContain('Warning about test failures');
      expect(testLogs).toContain('Error in test execution');
    });

    it('should search logs by regex pattern', () => {
      logger.debug('Debug message about testing');
      logger.info('Info message about debugging');
      logger.warn('Warning about test failures');
      logger.error('Error in test execution');

      const debugLogs = logger.searchLogs(/debug/i);
      expect(debugLogs).toHaveLength(2);
      expect(debugLogs).toContain('Debug message about testing');
      expect(debugLogs).toContain('Info message about debugging');
    });
  });

  describe('Log Management', () => {
    it('should clear all logs', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      expect(logger.getLogCount()).toBe(2);

      logger.clear();
      expect(logger.getLogCount()).toBe(0);
      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should get correct log count', () => {
      expect(logger.getLogCount()).toBe(0);

      logger.debug('Debug message');
      expect(logger.getLogCount()).toBe(1);

      logger.info('Info message');
      logger.warn('Warning message');
      expect(logger.getLogCount()).toBe(3);
    });
  });

  describe('String Representation', () => {
    it('should format logs as string', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const logString = logger.toString();
      expect(logString).toContain('[DEBUG] Debug message');
      expect(logString).toContain('[INFO] Info message');
      expect(logString).toContain('[WARN] Warning message');
      expect(logString).toContain('[ERROR] Error message');
    });
  });

  describe('Factory Functions', () => {
    it('should create logger with createTestLogger', () => {
      const factoryLogger = createTestLogger();
      expect(factoryLogger).toBeInstanceOf(TestLogger);
      expect(factoryLogger.getLogCount()).toBe(0);
    });

    it('should create logger with getTestLogger', () => {
      const factoryLogger = getTestLogger();
      expect(factoryLogger).toBeInstanceOf(TestLogger);
      expect(factoryLogger.getLogCount()).toBe(0);
    });
  });

  describe('Integration Example', () => {
    it('should demonstrate typical usage pattern', () => {
      // Simulate a typical debugging scenario
      logger.debug('Starting symbol graph operation');
      logger.info('Adding symbol: MyClass');
      logger.debug('Creating vertex with key: MyClass:MyClass.cls');
      logger.info('Adding symbol: myMethod');
      logger.debug('Creating vertex with key: myMethod:MyClass.cls');
      logger.debug('Adding reference: myMethod -> MyClass');
      logger.debug(
        'Created edge from myMethod:MyClass.cls to MyClass:MyClass.cls',
      );
      logger.warn('Incoming edges count: 0 (expected 1)');
      logger.error('Graph traversal not working as expected');

      // Verify we captured all the important information
      expect(logger.getLogCount()).toBeGreaterThanOrEqual(8);
      expect(logger.searchLogs('vertex')).toHaveLength(2);
      expect(logger.searchLogs('edge')).toHaveLength(2);
      expect(logger.getWarnLogs()).toHaveLength(1);
      expect(logger.getErrorLogs()).toHaveLength(1);

      // Check for specific debug information
      const debugLogs = logger.getDebugLogs();
      expect(debugLogs).toContain('Starting symbol graph operation');
      expect(debugLogs).toContain(
        'Creating vertex with key: MyClass:MyClass.cls',
      );
      expect(debugLogs).toContain(
        'Creating vertex with key: myMethod:MyClass.cls',
      );
      expect(debugLogs).toContain('Adding reference: myMethod -> MyClass');
      expect(debugLogs).toContain(
        'Created edge from myMethod:MyClass.cls to MyClass:MyClass.cls',
      );
    });
  });
});
