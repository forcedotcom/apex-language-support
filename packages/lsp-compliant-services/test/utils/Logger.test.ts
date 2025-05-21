/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Logger } from '../../src/utils/Logger';
import { LogLevel } from '@salesforce/apex-lsp-logging';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    log: jest.SpyInstance;
  };

  beforeEach(() => {
    logger = Logger.getInstance();
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('error', () => {
    it('should log error message without error object', () => {
      const message = 'Test error message';
      logger.error(message);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(message);
    });

    it('should log error message with error object', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      logger.error(message, error);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(`${message}: ${error}`);
    });

    it('should evaluate message provider function', () => {
      const messageProvider = () => 'Test error message';
      logger.error(messageProvider);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith('Test error message');
    });

    it('should evaluate message provider function with error object', () => {
      const messageProvider = () => 'Test error message';
      const error = new Error('Test error');
      logger.error(messageProvider, error);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        `Test error message: ${error}`,
      );
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      const message = 'Test warning message';
      logger.warn(message);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(message);
    });

    it('should evaluate message provider function', () => {
      const messageProvider = () => 'Test warning message';
      logger.warn(messageProvider);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith('Test warning message');
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      const message = 'Test info message';
      logger.info(message);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(message);
    });

    it('should evaluate message provider function', () => {
      const messageProvider = () => 'Test info message';
      logger.info(messageProvider);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith('Test info message');
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      const message = 'Test debug message';
      logger.debug(message);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(message);
    });

    it('should evaluate message provider function', () => {
      const messageProvider = () => 'Test debug message';
      logger.debug(messageProvider);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('Test debug message');
    });
  });

  describe('log', () => {
    it('should log error level message', () => {
      const message = 'Test error message';
      logger.log(LogLevel.Error, message);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(message);
    });

    it('should log warning level message', () => {
      const message = 'Test warning message';
      logger.log(LogLevel.Warn, message);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(message);
    });

    it('should log info level message', () => {
      const message = 'Test info message';
      logger.log(LogLevel.Info, message);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(message);
    });

    it('should log debug level message', () => {
      const message = 'Test debug message';
      logger.log(LogLevel.Debug, message);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(message);
    });

    it('should log error level message with error object', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      logger.log(LogLevel.Error, message, error);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(`${message}: ${error}`);
    });

    it('should evaluate message provider function for error level', () => {
      const messageProvider = () => 'Test error message';
      logger.log(LogLevel.Error, messageProvider);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith('Test error message');
    });

    it('should evaluate message provider function for warning level', () => {
      const messageProvider = () => 'Test warning message';
      logger.log(LogLevel.Warn, messageProvider);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should evaluate message provider function for info level', () => {
      const messageProvider = () => 'Test info message';
      logger.log(LogLevel.Info, messageProvider);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith('Test info message');
    });

    it('should evaluate message provider function for debug level', () => {
      const messageProvider = () => 'Test debug message';
      logger.log(LogLevel.Debug, messageProvider);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('Test debug message');
    });

    it('should evaluate message provider function with error object', () => {
      const messageProvider = () => 'Test error message';
      const error = new Error('Test error');
      logger.log(LogLevel.Error, messageProvider, error);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        `Test error message: ${error}`,
      );
    });
  });
});
