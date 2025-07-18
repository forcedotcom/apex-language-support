/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, MessageType } from 'vscode-languageserver/node';
import { LogMessageParams, type LogMessageType, setLogLevel } from '@salesforce/apex-lsp-logging';

import { NodeLogNotificationHandler } from '../../src/utils/NodeLogNotificationHandler';

describe('NodeLogNotificationHandler', () => {
  let mockConnection: jest.Mocked<Connection>;
  let handler: NodeLogNotificationHandler;

  beforeEach(() => {
    // Set log level to debug to allow all messages during testing
    setLogLevel('debug');

    mockConnection = {
      sendNotification: jest.fn(),
    } as any;

    handler = NodeLogNotificationHandler.getInstance(mockConnection);
  });

  afterEach(() => {
    NodeLogNotificationHandler.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = NodeLogNotificationHandler.getInstance(mockConnection);
      const instance2 = NodeLogNotificationHandler.getInstance(mockConnection);
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

      expect(mockConnection.sendNotification).toHaveBeenCalledWith('window/logMessage', {
        type: MessageType.Error,
        message: 'Test error message',
      });
    });

    it('should send warning message to connection only', () => {
      const params: LogMessageParams = {
        type: 'warning',
        message: 'Test warning message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith('window/logMessage', {
        type: MessageType.Warning,
        message: 'Test warning message',
      });
    });

    it('should send info message to connection only', () => {
      const params: LogMessageParams = {
        type: 'info',
        message: 'Test info message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith('window/logMessage', {
        type: MessageType.Info,
        message: 'Test info message',
      });
    });

    it('should send debug message to connection only', () => {
      const params: LogMessageParams = {
        type: 'debug',
        message: 'Test debug message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith('window/logMessage', {
        type: MessageType.Log, // Debug maps to Log for backward compatibility
        message: 'Test debug message',
      });
    });

    it('should handle unknown message type', () => {
      const params: LogMessageParams = {
        type: 'unknown' as LogMessageType, // Unknown type
        message: 'Test unknown message',
      };

      handler.sendLogMessage(params);

      expect(mockConnection.sendNotification).toHaveBeenCalledWith('window/logMessage', {
        type: MessageType.Log, // Unknown types map to Log
        message: 'Test unknown message',
      });
    });
  });
});
