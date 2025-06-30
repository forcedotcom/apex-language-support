/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, MessageType } from 'vscode-languageserver/browser';
import {
  LogMessageParams,
  LogMessageType,
  setLogLevel,
} from '@salesforce/apex-lsp-logging';

import { BrowserLogNotificationHandler } from '../../src/utils/BrowserLogNotificationHandler';

describe('BrowserLogNotificationHandler', () => {
  let mockConnection: jest.Mocked<Connection>;
  let handler: BrowserLogNotificationHandler;

  beforeEach(() => {
    setLogLevel(LogMessageType.Debug);

    mockConnection = {
      sendNotification: jest.fn(),
    } as any;

    handler = BrowserLogNotificationHandler.getInstance(mockConnection);
  });

  afterEach(() => {
    BrowserLogNotificationHandler.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance for the same connection', () => {
      const instance1 =
        BrowserLogNotificationHandler.getInstance(mockConnection);
      const instance2 =
        BrowserLogNotificationHandler.getInstance(mockConnection);
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance for a different connection', () => {
      const mockConnection2 = {
        sendNotification: jest.fn(),
      } as any;
      const instance1 =
        BrowserLogNotificationHandler.getInstance(mockConnection);
      const instance2 =
        BrowserLogNotificationHandler.getInstance(mockConnection2);
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendLogMessage', () => {
    it('should send error message to connection only', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Error,
        message: 'Test error message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Error,
          message: 'Test error message',
        },
      );
    });

    it('should send warning message to connection only', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Warning,
        message: 'Test warning message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Warning,
          message: 'Test warning message',
        },
      );
    });

    it('should send info message to connection only', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Info,
        message: 'Test info message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Info,
          message: 'Test info message',
        },
      );
    });

    it('should send debug message to connection only', () => {
      const params: LogMessageParams = {
        type: LogMessageType.Debug,
        message: 'Test debug message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Log, // Debug maps to Log for backward compatibility
          message: 'Test debug message',
        },
      );
    });

    it('should handle unknown message type', () => {
      const params: LogMessageParams = {
        type: 999 as LogMessageType, // Unknown type
        message: 'Test unknown message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'window/logMessage',
        {
          type: MessageType.Log, // Unknown types map to Log
          message: 'Test unknown message',
        },
      );
    });
  });
});
