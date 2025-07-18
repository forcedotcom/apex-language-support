/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  type LogMessageType,
  getLogNotificationHandler,
  shouldLog,
} from '@salesforce/apex-lsp-logging';

import { LSPLoggerFactory } from '../../src/utils/LSPLoggerFactory';

// Mock the logging module
jest.mock('@salesforce/apex-lsp-logging', () => ({
  setLogLevel: jest.fn(),
  setLogNotificationHandler: jest.fn(),
  getLogNotificationHandler: jest.fn(),
  shouldLog: jest.fn(),
}));

describe('LSPLoggerFactory', () => {
  let mockHandler: any;
  let factory: LSPLoggerFactory;
  let logger: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock handler
    mockHandler = {
      sendLogMessage: jest.fn(),
    };

    // Mock the logging functions
    (shouldLog as jest.Mock).mockReturnValue(true);
    (getLogNotificationHandler as jest.Mock).mockReturnValue(mockHandler);

    // Create factory and logger
    factory = new LSPLoggerFactory();
    logger = factory.getLogger();
  });

  describe('LSPLoggerFactory', () => {
    describe('getLogger', () => {
      it('should return the same logger instance (singleton)', () => {
        const logger1 = factory.getLogger();
        const logger2 = factory.getLogger();
        expect(logger1).toBe(logger2);
      });

      it('should return a logger with all required methods', () => {
        const logger = factory.getLogger();
        expect(logger.log).toBeDefined();
        expect(logger.debug).toBeDefined();
        expect(logger.info).toBeDefined();
        expect(logger.warn).toBeDefined();
        expect(logger.error).toBeDefined();
      });
    });
  });

  describe('LSPLogger', () => {
    describe('formatTimestamp', () => {
      it('should format timestamp in correct format', () => {
        // Use a fixed date to ensure consistent test results
        const fixedDate = new Date('2025-01-20T17:46:20.000Z');
        jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

        logger.info('test message');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringMatching(
            /^\[\d{1,2}:\d{2}:\d{2} [AP]M\] \[INFO\] test message$/,
          ),
        });

        jest.restoreAllMocks();
      });

      it('should use current time when called', () => {
        const spy = jest.spyOn(Date.prototype, 'toLocaleTimeString');

        logger.info('test message');

        expect(spy).toHaveBeenCalledWith('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        spy.mockRestore();
      });
    });

    describe('formatMessageType', () => {
      it('should format debug message type correctly', () => {
        logger.debug('test debug');
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'log', // debug maps to log for backward compatibility
          message: expect.stringContaining('[DEBUG]'),
        });
      });

      it('should format info message type correctly', () => {
        logger.info('test info');
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringContaining('[INFO]'),
        });
      });

      it('should format warning message type correctly', () => {
        logger.warn('test warning');
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'warning',
          message: expect.stringContaining('[WARNING]'),
        });
      });

      it('should format error message type correctly', () => {
        logger.error('test error');
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'error',
          message: expect.stringContaining('[ERROR]'),
        });
      });

      it('should handle unknown message types with fallback', () => {
        logger.log('unknown' as LogMessageType, 'test unknown');
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'unknown',
          message: expect.stringContaining('[UNKNOWN]'),
        });
      });
    });

    describe('log method', () => {
      it('should not log when shouldLog returns false', () => {
        (shouldLog as jest.Mock).mockReturnValue(false);

        logger.log('info', 'test message');

        expect(mockHandler.sendLogMessage).not.toHaveBeenCalled();
      });

      it('should log when shouldLog returns true', () => {
        (shouldLog as jest.Mock).mockReturnValue(true);

        logger.log('info', 'test message');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringContaining('test message'),
        });
      });

      it('should handle string messages correctly', () => {
        logger.log('info', 'string message');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringContaining('string message'),
        });
      });

      it('should handle function message providers correctly', () => {
        const messageProvider = jest.fn().mockReturnValue('function message');

        logger.log('info', messageProvider);

        expect(messageProvider).toHaveBeenCalled();
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringContaining('function message'),
        });
      });

      it('should not call message provider function when shouldLog returns false', () => {
        (shouldLog as jest.Mock).mockReturnValue(false);
        const messageProvider = jest.fn().mockReturnValue('expensive message');

        logger.log('info', messageProvider);

        expect(messageProvider).not.toHaveBeenCalled();
        expect(mockHandler.sendLogMessage).not.toHaveBeenCalled();
      });

      it('should map debug to log for backward compatibility', () => {
        logger.log('debug', 'debug message');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'log', // debug maps to log
          message: expect.stringContaining('debug message'),
        });
      });

      it('should not map non-debug types', () => {
        logger.log('info', 'info message');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info', // info stays as info
          message: expect.stringContaining('info message'),
        });
      });

      it('should include both timestamp and message type in formatted message', () => {
        logger.log('info', 'test message');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringMatching(
            /^\[\d{1,2}:\d{2}:\d{2} [AP]M\] \[INFO\] test message$/,
          ),
        });
      });
    });

    describe('convenience methods', () => {
      it('should call log with debug type for debug method', () => {
        const logSpy = jest.spyOn(logger, 'log');

        logger.debug('debug message');

        expect(logSpy).toHaveBeenCalledWith('debug', 'debug message');
      });

      it('should call log with info type for info method', () => {
        const logSpy = jest.spyOn(logger, 'log');

        logger.info('info message');

        expect(logSpy).toHaveBeenCalledWith('info', 'info message');
      });

      it('should call log with warning type for warn method', () => {
        const logSpy = jest.spyOn(logger, 'log');

        logger.warn('warning message');

        expect(logSpy).toHaveBeenCalledWith('warning', 'warning message');
      });

      it('should call log with error type for error method', () => {
        const logSpy = jest.spyOn(logger, 'log');

        logger.error('error message');

        expect(logSpy).toHaveBeenCalledWith('error', 'error message');
      });

      it('should support function providers in convenience methods', () => {
        const messageProvider = jest.fn().mockReturnValue('function message');

        logger.debug(messageProvider);

        expect(messageProvider).toHaveBeenCalled();
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'log', // debug maps to log
          message: expect.stringContaining('function message'),
        });
      });
    });

    describe('error handling', () => {
      it('should handle missing LogNotificationHandler gracefully', () => {
        (getLogNotificationHandler as jest.Mock).mockReturnValue(null);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        logger.log('info', 'test message');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            '[LSPLogger] LogNotificationHandler not available or invalid',
          ),
        );

        consoleSpy.mockRestore();
      });

      it('should handle invalid LogNotificationHandler gracefully', () => {
        (getLogNotificationHandler as jest.Mock).mockReturnValue({
          // Missing sendLogMessage function
        });
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        logger.log('info', 'test message');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            '[LSPLogger] LogNotificationHandler not available or invalid',
          ),
        );

        consoleSpy.mockRestore();
      });

      it('should include message type and content in fallback warning', () => {
        (getLogNotificationHandler as jest.Mock).mockReturnValue(null);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        logger.log('error', 'test error message');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Fallback log \(error\):.*test error message/),
        );

        consoleSpy.mockRestore();
      });

      it('should handle function message providers in fallback scenario', () => {
        (getLogNotificationHandler as jest.Mock).mockReturnValue(null);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const messageProvider = jest.fn().mockReturnValue('function message');

        logger.log('info', messageProvider);

        expect(messageProvider).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('function message'),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('integration tests', () => {
      it('should work end-to-end with valid handler', () => {
        const fixedDate = new Date('2025-01-20T17:46:20.000Z');
        jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

        logger.info('Integration test message');

        expect(shouldLog).toHaveBeenCalledWith('info');
        expect(getLogNotificationHandler).toHaveBeenCalled();
        expect(mockHandler.sendLogMessage).toHaveBeenCalledWith({
          type: 'info',
          message: expect.stringMatching(
            /^\[\d{1,2}:\d{2}:\d{2} [AP]M\] \[INFO\] Integration test message$/,
          ),
        });

        jest.restoreAllMocks();
      });

      it('should respect log level filtering', () => {
        (shouldLog as jest.Mock).mockReturnValue(false);

        logger.debug('This should not be logged');

        expect(mockHandler.sendLogMessage).not.toHaveBeenCalled();
      });

      it('should handle multiple logger instances from same factory', () => {
        const logger1 = factory.getLogger();
        const logger2 = factory.getLogger();

        logger1.info('Message from logger1');
        logger2.warn('Message from logger2');

        expect(mockHandler.sendLogMessage).toHaveBeenCalledTimes(2);
        expect(mockHandler.sendLogMessage).toHaveBeenNthCalledWith(1, {
          type: 'info',
          message: expect.stringContaining('Message from logger1'),
        });
        expect(mockHandler.sendLogMessage).toHaveBeenNthCalledWith(2, {
          type: 'warning',
          message: expect.stringContaining('Message from logger2'),
        });
      });
    });
  });
});
