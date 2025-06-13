/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LogLevel,
  LoggerInterface,
  LogNotificationHandler,
  LogMessageType,
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
} from '../src';

describe('apex-lsp-logging', () => {
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockLogNotificationHandler: jest.Mocked<LogNotificationHandler>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(
        (
          message: string | (() => string),
          error?: unknown,
          ...args: unknown[]
        ) => {
          if (typeof message === 'function') {
            message();
          }
        },
      ),
      warn: jest.fn((message: string | (() => string), ...args: unknown[]) => {
        if (typeof message === 'function') {
          message();
        }
      }),
      info: jest.fn((message: string | (() => string), ...args: unknown[]) => {
        if (typeof message === 'function') {
          message();
        }
      }),
      debug: jest.fn((message: string | (() => string), ...args: unknown[]) => {
        if (typeof message === 'function') {
          message();
        }
      }),
      log: jest.fn(
        (
          level: LogLevel,
          message: string | (() => string),
          error?: unknown,
          ...args: unknown[]
        ) => {
          if (typeof message === 'function') {
            message();
          }
        },
      ),
    } as unknown as jest.Mocked<LoggerInterface>;

    mockLogNotificationHandler = {
      sendLogMessage: jest.fn(),
    } as unknown as jest.Mocked<LogNotificationHandler>;

    // Reset the global state
    setLogNotificationHandler(mockLogNotificationHandler);
    setLoggerFactory({
      getLogger: () => mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLogger', () => {
    it('should return the configured logger', () => {
      const logger = getLogger();
      expect(logger).toBe(mockLogger);
    });
  });

  describe('Logger interface', () => {
    let logger: LoggerInterface;

    beforeEach(() => {
      logger = getLogger();
    });

    it('should log error messages', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      logger.error(message, error);

      expect(mockLogger.error).toHaveBeenCalledWith(message, error);
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';

      logger.warn(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(message);
    });

    it('should log info messages', () => {
      const message = 'Test info message';

      logger.info(message);

      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';

      logger.debug(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(message);
    });

    it('should log messages with specified level', () => {
      const message = 'Test message';
      const error = new Error('Test error');

      logger.log(LogLevel.Error, message, error);
      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.Error,
        message,
        error,
      );

      logger.log(LogLevel.Warn, message);
      expect(mockLogger.log).toHaveBeenCalledWith(LogLevel.Warn, message);

      logger.log(LogLevel.Info, message);
      expect(mockLogger.log).toHaveBeenCalledWith(LogLevel.Info, message);

      logger.log(LogLevel.Debug, message);
      expect(mockLogger.log).toHaveBeenCalledWith(LogLevel.Debug, message);
    });

    describe('lazy evaluation', () => {
      it('should evaluate message provider for error messages', () => {
        const messageProvider = jest.fn(() => 'Test error message');
        const error = new Error('Test error');

        logger.error(messageProvider, error);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(messageProvider, error);
      });

      it('should evaluate message provider for warning messages', () => {
        const messageProvider = jest.fn(() => 'Test warning message');

        logger.warn(messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(messageProvider);
      });

      it('should evaluate message provider for info messages', () => {
        const messageProvider = jest.fn(() => 'Test info message');

        logger.info(messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith(messageProvider);
      });

      it('should evaluate message provider for debug messages', () => {
        const messageProvider = jest.fn(() => 'Test debug message');

        logger.debug(messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.debug).toHaveBeenCalledWith(messageProvider);
      });

      it('should evaluate message provider for log with specified level', () => {
        const messageProvider = jest.fn(() => 'Test message');
        const error = new Error('Test error');

        logger.log(LogLevel.Error, messageProvider, error);
        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogLevel.Error,
          messageProvider,
          error,
        );

        // Clear both the message provider and the mock logger
        messageProvider.mockClear();
        mockLogger.log.mockClear();

        // Create a new message provider for the second test
        const messageProvider2 = jest.fn(() => 'Test message');
        logger.log(LogLevel.Warn, messageProvider2);
        expect(messageProvider2).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogLevel.Warn,
          messageProvider2,
        );
      });
    });
  });

  describe('LogNotificationHandler', () => {
    it('should send log messages through the notification handler', () => {
      const message = 'Test message';
      const error = new Error('Test error');

      // Test error level
      mockLogNotificationHandler.sendLogMessage({
        type: LogMessageType.Error,
        message: `${message}: ${error}`,
      });
      expect(mockLogNotificationHandler.sendLogMessage).toHaveBeenCalledWith({
        type: LogMessageType.Error,
        message: `${message}: ${error}`,
      });

      // Test warning level
      mockLogNotificationHandler.sendLogMessage({
        type: LogMessageType.Warning,
        message,
      });
      expect(mockLogNotificationHandler.sendLogMessage).toHaveBeenCalledWith({
        type: LogMessageType.Warning,
        message,
      });

      // Test info level
      mockLogNotificationHandler.sendLogMessage({
        type: LogMessageType.Info,
        message,
      });
      expect(mockLogNotificationHandler.sendLogMessage).toHaveBeenCalledWith({
        type: LogMessageType.Info,
        message,
      });

      // Test debug level
      mockLogNotificationHandler.sendLogMessage({
        type: LogMessageType.Log,
        message,
      });
      expect(mockLogNotificationHandler.sendLogMessage).toHaveBeenCalledWith({
        type: LogMessageType.Log,
        message,
      });
    });
  });
});
