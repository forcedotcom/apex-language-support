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
      log: jest.fn((messageType: LogMessageType, message: string | (() => string)) => {
        if (typeof message === 'function') {
          message();
        }
      }),
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

      logger.log('error', message);

      expect(mockLogger.log).toHaveBeenCalledWith('error', message);
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';

      logger.log('warning', message);

      expect(mockLogger.log).toHaveBeenCalledWith('warning', message);
    });

    it('should log info messages', () => {
      const message = 'Test info message';

      logger.log('info', message);

      expect(mockLogger.log).toHaveBeenCalledWith('info', message);
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';

      logger.log('debug', message);

      expect(mockLogger.log).toHaveBeenCalledWith('debug', message);
    });

    it('should log log messages', () => {
      const message = 'Test log message';

      logger.log('log', message);

      expect(mockLogger.log).toHaveBeenCalledWith('log', message);
    });

    describe('lazy evaluation', () => {
      it('should evaluate message provider for error messages', () => {
        const messageProvider = jest.fn(() => 'Test error message');

        logger.log('error', messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('error', messageProvider);
      });

      it('should evaluate message provider for warning messages', () => {
        const messageProvider = jest.fn(() => 'Test warning message');

        logger.log('warning', messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('warning', messageProvider);
      });

      it('should evaluate message provider for info messages', () => {
        const messageProvider = jest.fn(() => 'Test info message');

        logger.log('info', messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('info', messageProvider);
      });

      it('should evaluate message provider for debug messages', () => {
        const messageProvider = jest.fn(() => 'Test debug message');

        logger.log('debug', messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('debug', messageProvider);
      });

      it('should evaluate message provider for log messages', () => {
        const messageProvider = jest.fn(() => 'Test log message');

        logger.log('log', messageProvider);

        expect(messageProvider).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('log', messageProvider);
      });
    });
  });

  describe('LogMessageType union', () => {
    it('should have correct string values', () => {
      expect('error').toBe('error');
      expect('warning').toBe('warning');
      expect('info').toBe('info');
      expect('log').toBe('log');
      expect('debug').toBe('debug');
    });
  });

  describe('LogNotificationHandler', () => {
    it('should send log messages', () => {
      const params = {
        type: 'error' as LogMessageType,
        message: 'Test error message',
      };

      mockLogNotificationHandler.sendLogMessage(params);

      expect(mockLogNotificationHandler.sendLogMessage).toHaveBeenCalledWith(params);
    });
  });
});
