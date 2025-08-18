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
  type LogMessageType,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';

import { UnifiedLogNotificationHandler } from '../../src/utils/BrowserLogNotificationHandler';

describe('UnifiedLogNotificationHandler (Browser Context)', () => {
  let mockConnection: jest.Mocked<Connection>;
  let handler: UnifiedLogNotificationHandler;

  beforeEach(() => {
    setLogLevel('debug');

    mockConnection = {
      sendNotification: jest.fn(),
    } as any;

    handler = UnifiedLogNotificationHandler.getBrowserInstance(mockConnection);
  });

  afterEach(() => {
    UnifiedLogNotificationHandler.resetInstances();
  });

  describe('getBrowserInstance', () => {
    it('should return the same instance for the same connection', () => {
      const instance1 =
        UnifiedLogNotificationHandler.getBrowserInstance(mockConnection);
      const instance2 =
        UnifiedLogNotificationHandler.getBrowserInstance(mockConnection);
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance for a different connection', () => {
      const mockConnection2 = {
        sendNotification: jest.fn(),
      } as any;
      const instance1 =
        UnifiedLogNotificationHandler.getBrowserInstance(mockConnection);
      const instance2 =
        UnifiedLogNotificationHandler.getBrowserInstance(mockConnection2);
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendLogMessage', () => {
    it('should send error message to connection only', () => {
      const params: LogMessageParams = {
        type: 'error',
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
        type: 'warning',
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
        type: 'info',
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
        type: 'debug',
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
        type: 'unknown' as LogMessageType, // Unknown type
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
