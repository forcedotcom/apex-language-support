/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, MessageType } from 'vscode-languageserver/node';
import {
  LogMessageParams,
  LogMessageType,
  setLogLevel,
} from '@salesforce/apex-lsp-logging';

import { NodeLogNotificationHandler } from '../../src/utils/NodeLogNotificationHandler';

describe('NodeLogNotificationHandler', () => {
  let mockConnection: jest.Mocked<Connection>;
  let handler: NodeLogNotificationHandler;
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    log: jest.SpyInstance;
  };

  beforeEach(() => {
    // Set log level to debug to allow all messages during testing
    setLogLevel(LogMessageType.Debug);

    NodeLogNotificationHandler.resetInstance();
    mockConnection = {
      sendNotification: jest.fn(),
    } as unknown as jest.Mocked<Connection>;

    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
    };

    handler = NodeLogNotificationHandler.getInstance(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = NodeLogNotificationHandler.getInstance(mockConnection);
      const instance2 = NodeLogNotificationHandler.getInstance(mockConnection);
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendLogMessage', () => {
    it('should send error message to both console and connection', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Error,
        message: 'Test error message',
      };

      handler.sendLogMessage(params);

      expect(consoleSpy.error).toHaveBeenCalledWith('Test error message');
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Error,
          message: 'Test error message',
        },
      );
    });

    it('should send warning message to both console and connection', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Warning,
        message: 'Test warning message',
      };

      handler.sendLogMessage(params);

      expect(consoleSpy.warn).toHaveBeenCalledWith('Test warning message');
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Warning,
          message: 'Test warning message',
        },
      );
    });

    it('should send info message to both console and connection', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Info,
        message: 'Test info message',
      };

      handler.sendLogMessage(params);

      expect(consoleSpy.info).toHaveBeenCalledWith('Test info message');
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Info,
          message: 'Test info message',
        },
      );
    });

    it('should send debug message to both console and connection', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Debug,
        message: 'Test debug message',
      };

      handler.sendLogMessage(params);

      expect(consoleSpy.log).toHaveBeenCalledWith('Test debug message');
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Log,
          message: 'Test debug message',
        },
      );
    });

    it('should handle unknown message type', () => {
      const params: LogMessageParams = {
        type: 'unknown' as unknown as LogMessageType,
        message: 'Test unknown message',
      };

      handler.sendLogMessage(params);

      expect(consoleSpy.log).toHaveBeenCalledWith('Test unknown message');
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Log,
          message: 'Test unknown message',
        },
      );
    });
  });
});
