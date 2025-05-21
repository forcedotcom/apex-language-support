/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LogLevel,
  Logger,
  LogNotificationHandler,
  LogMessageType,
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
} from '../src';

describe('apex-lsp-logging', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockLogNotificationHandler: jest.Mocked<LogNotificationHandler>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

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
    let logger: Logger;

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
