/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  enableConsoleLogging,
  disableLogging,
  getLogger,
  setLogLevel,
} from '../src/index';

describe('Console Logging', () => {
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    setLogLevel('debug');
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    infoSpy = jest.spyOn(console, 'info').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    setLogLevel('info');
    logSpy.mockRestore();
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    // Reset to no-op logger after each test
    disableLogging();
  });

  describe('enableConsoleLogging', () => {
    it('should enable console logging with timestamps', () => {
      enableConsoleLogging();
      const logger = getLogger();

      logger.info('Test info message');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test info message/,
        ),
      );
    });

    it('should handle different log levels correctly', () => {
      enableConsoleLogging();
      const logger = getLogger();

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] Debug message/,
        ),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Info message/,
        ),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Warning message/,
        ),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Error message/,
        ),
      );
    });

    it('should handle LogMessageType string values correctly', () => {
      enableConsoleLogging();
      const logger = getLogger();

      logger.log('error', 'Error via string');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Error via string/,
        ),
      );

      logger.log('warning', 'Warning via string');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Warning via string/,
        ),
      );

      logger.log('info', 'Info via string');
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Info via string/,
        ),
      );

      logger.log('log', 'Log via string');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[LOG\] Log via string/,
        ),
      );

      logger.log('debug', 'Debug via string');
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] Debug via string/,
        ),
      );
    });

    it('should handle lazy evaluation correctly', () => {
      enableConsoleLogging();
      const logger = getLogger();
      const messageProvider = jest.fn(() => 'Lazy message');

      logger.info(messageProvider);

      expect(messageProvider).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Lazy message/,
        ),
      );
    });

    it('should handle alwaysLog method', () => {
      enableConsoleLogging();
      const logger = getLogger();

      logger.alwaysLog('Always visible message');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[LOG\] Always visible message/,
        ),
      );
    });

    it('should display alwaysLog even when log level is error', () => {
      enableConsoleLogging();
      setLogLevel('error');
      const logger = getLogger();

      // These should be filtered out
      logger.debug('Debug message');
      logger.info('Info message');

      // This should always appear
      logger.alwaysLog('Critical status message');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[LOG\] Critical status message/,
        ),
      );
    });

    it('should handle alwaysLog with lazy evaluation', () => {
      enableConsoleLogging();
      const logger = getLogger();
      const messageProvider = jest.fn(() => 'Always visible lazy message');

      logger.alwaysLog(messageProvider);

      expect(messageProvider).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[LOG\] Always visible lazy message/,
        ),
      );
    });
  });

  describe('disableLogging', () => {
    it('should disable all logging', () => {
      enableConsoleLogging();
      disableLogging();
      const logger = getLogger();

      logger.info('This should not be logged');

      expect(logSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
