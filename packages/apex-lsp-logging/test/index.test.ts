/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
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
      log: jest.fn(
        (messageType: LogMessageType, message: string | (() => string)) => {
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

      logger.log(LogMessageType.Error, message);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Error,
        message,
      );
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';

      logger.log(LogMessageType.Warning, message);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Warning,
        message,
      );
    });

    it('should log info messages', () => {
      const message = 'Test info message';

      logger.log(LogMessageType.Info, message);

      expect(mockLogger.log).toHaveBeenCalledWith(LogMessageType.Info, message);
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';

      logger.log(LogMessageType.Debug, message);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Debug,
        message,
      );
    });

    it('should log log messages', () => {
      const message = 'Test log message';

      logger.log(LogMessageType.Log, message);

      expect(mockLogger.log).toHaveBeenCalledWith(LogMessageType.Log, message);
    });

    describe('lazy evaluation', () => {
      it('should evaluate message provider for error messages', () => {
        const messageProvider = jest.fn(() => 'Test error message');

        logger.log(LogMessageType.Error, messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogMessageType.Error,
          messageProvider,
        );
      });

      it('should evaluate message provider for warning messages', () => {
        const messageProvider = jest.fn(() => 'Test warning message');

        logger.log(LogMessageType.Warning, messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogMessageType.Warning,
          messageProvider,
        );
      });

      it('should evaluate message provider for info messages', () => {
        const messageProvider = jest.fn(() => 'Test info message');

        logger.log(LogMessageType.Info, messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogMessageType.Info,
          messageProvider,
        );
      });

      it('should evaluate message provider for debug messages', () => {
        const messageProvider = jest.fn(() => 'Test debug message');

        logger.log(LogMessageType.Debug, messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogMessageType.Debug,
          messageProvider,
        );
      });

      it('should evaluate message provider for log messages', () => {
        const messageProvider = jest.fn(() => 'Test log message');

        logger.log(LogMessageType.Log, messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          LogMessageType.Log,
          messageProvider,
        );
      });
    });
  });

  describe('LogMessageType enum', () => {
    it('should have correct values', () => {
      expect(LogMessageType.Error).toBe(1);
      expect(LogMessageType.Warning).toBe(2);
      expect(LogMessageType.Info).toBe(3);
      expect(LogMessageType.Log).toBe(4);
      expect(LogMessageType.Debug).toBe(5);
    });
  });

  describe('LogNotificationHandler', () => {
    it('should send log messages', () => {
      const params = {
        type: LogMessageType.Error,
        message: 'Test error message',
      };

      mockLogNotificationHandler.sendLogMessage(params);

      expect(mockLogNotificationHandler.sendLogMessage).toHaveBeenCalledWith(
        params,
      );
    });
  });
});
