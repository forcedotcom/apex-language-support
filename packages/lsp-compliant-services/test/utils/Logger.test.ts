/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { Logger } from '../../src/utils/Logger';

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

  describe('log', () => {
    it('should log error level message', () => {
      const message = 'Test error message';
      logger.log(LogMessageType.Error, message);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(message);
    });

    it('should log warning level message', () => {
      const message = 'Test warning message';
      logger.log(LogMessageType.Warning, message);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(message);
    });

    it('should log info level message', () => {
      const message = 'Test info message';
      logger.log(LogMessageType.Info, message);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(message);
    });

    it('should log debug level message', () => {
      const message = 'Test debug message';
      logger.log(LogMessageType.Debug, message);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(message);
    });

    it('should log log level message', () => {
      const message = 'Test log message';
      logger.log(LogMessageType.Log, message);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(message);
    });

    it('should evaluate message provider function for error level', () => {
      const messageProvider = () => 'Test error message';
      logger.log(LogMessageType.Error, messageProvider);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith('Test error message');
    });

    it('should evaluate message provider function for warning level', () => {
      const messageProvider = () => 'Test warning message';
      logger.log(LogMessageType.Warning, messageProvider);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should evaluate message provider function for info level', () => {
      const messageProvider = () => 'Test info message';
      logger.log(LogMessageType.Info, messageProvider);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith('Test info message');
    });

    it('should evaluate message provider function for debug level', () => {
      const messageProvider = () => 'Test debug message';
      logger.log(LogMessageType.Debug, messageProvider);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('Test debug message');
    });

    it('should evaluate message provider function for log level', () => {
      const messageProvider = () => 'Test log message';
      logger.log(LogMessageType.Log, messageProvider);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('Test log message');
    });
  });
});
