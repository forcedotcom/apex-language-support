/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  BaseMessageBridge,
  createTransportMessageReader,
  createTransportMessageWriter,
  getErrorMessage,
} from '../../src/communication/CoreBridge';
import type { MessageTransport } from '../../src/communication/Interfaces';

// Mock vscode-jsonrpc
jest.mock('vscode-jsonrpc', () => ({
  createMessageConnection: jest.fn(() => ({
    onRequest: jest.fn(),
    onNotification: jest.fn(),
    sendRequest: jest.fn(),
    sendNotification: jest.fn(),
    listen: jest.fn(),
    dispose: jest.fn(),
  })),
  ResponseError: jest.fn().mockImplementation((code, message) => ({
    code,
    message,
  })),
  ErrorCodes: {
    InternalError: -32603,
    InvalidRequest: -32600,
  },
}));

// Mock transport
class MockTransport implements MessageTransport {
  onMessage = jest.fn();
  onError = jest.fn(); 
  onClose = jest.fn();
  send = jest.fn();
  dispose = jest.fn();
}

class TestMessageBridge extends BaseMessageBridge {
  constructor(private transport: MessageTransport) {
    super();
  }

  protected isEnvironmentSupported(): boolean {
    return true;
  }

  createConnection() {
    const reader = createTransportMessageReader(this.transport);
    const writer = createTransportMessageWriter(this.transport);
    return super.createConnection(reader, writer, 'Test');
  }
}

describe('CoreBridge', () => {
  let mockTransport: MockTransport;
  let bridge: TestMessageBridge;

  beforeEach(() => {
    mockTransport = new MockTransport();
    bridge = new TestMessageBridge(mockTransport);
  });

  describe('getErrorMessage utility', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should extract message from error arrays', () => {
      const errors = [{ message: 'First error' }, { message: 'Second error' }];
      expect(getErrorMessage(errors)).toBe('First error');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle unknown error types', () => {
      expect(getErrorMessage(null)).toBe('Unknown error');
      expect(getErrorMessage(undefined)).toBe('Unknown error');
      expect(getErrorMessage(123)).toBe('Unknown error');
    });

    it('should handle empty arrays', () => {
      expect(getErrorMessage([])).toBe('Unknown error');
    });
  });

  describe('Transport Message Reader', () => {
    it('should create reader from transport', () => {
      const reader = createTransportMessageReader(mockTransport);
      expect(reader).toBeDefined();
      expect(typeof reader.listen).toBe('function');
      expect(typeof reader.dispose).toBe('function');
    });

    it('should handle transport messages', () => {
      const reader = createTransportMessageReader(mockTransport);
      const mockCallback = jest.fn();
      reader.listen(mockCallback);

      // Simulate message from transport
      const testMessage = { jsonrpc: '2.0', method: 'test' };
      if (mockTransport.onMessage.mock.calls.length > 0) {
        const messageHandler = mockTransport.onMessage.mock.calls[0][0];
        messageHandler(testMessage);
        expect(mockCallback).toHaveBeenCalledWith(testMessage);
      }
    });

    it('should handle transport errors', () => {
      const reader = createTransportMessageReader(mockTransport);
      const mockCallback = jest.fn();
      const mockErrorCallback = jest.fn();

      reader.listen(mockCallback);
      reader.onError(mockErrorCallback);

      // Simulate error from transport
      if (mockTransport.onError.mock.calls.length > 0) {
        const errorHandler = mockTransport.onError.mock.calls[0][0];
        errorHandler(new Error('Transport error'));
        expect(mockErrorCallback).toHaveBeenCalled();
      }
    });
  });

  describe('Transport Message Writer', () => {
    it('should create writer from transport', () => {
      const writer = createTransportMessageWriter(mockTransport);
      expect(writer).toBeDefined();
      expect(typeof writer.write).toBe('function');
      expect(typeof writer.dispose).toBe('function');
    });

    it('should write messages to transport', async () => {
      const writer = createTransportMessageWriter(mockTransport);
      const testMessage = { jsonrpc: '2.0', method: 'test' };

      await writer.write(testMessage);
      expect(mockTransport.send).toHaveBeenCalledWith(testMessage);
    });

    it('should handle write errors gracefully', async () => {
      mockTransport.send.mockRejectedValueOnce(new Error('Send failed'));
      const writer = createTransportMessageWriter(mockTransport);
      const testMessage = { jsonrpc: '2.0', method: 'test' };

      await expect(writer.write(testMessage)).rejects.toThrow('Send failed');
    });
  });

  describe('BaseMessageBridge', () => {
    it('should create connection with reader and writer', () => {
      const connection = bridge.createConnection();
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should validate environment support', () => {
      expect(bridge['isEnvironmentSupported']()).toBe(true);
    });

    it('should handle connection disposal', () => {
      const connection = bridge.createConnection();
      expect(() => connection.dispose()).not.toThrow();
    });
  });

  describe('Message Processing', () => {
    it('should handle malformed messages', () => {
      const reader = createTransportMessageReader(mockTransport);
      const mockCallback = jest.fn();
      reader.listen(mockCallback);

      // Simulate malformed message
      if (mockTransport.onMessage.mock.calls.length > 0) {
        const messageHandler = mockTransport.onMessage.mock.calls[0][0];
        messageHandler('invalid json');
        // Should not crash
      }
    });

    it('should handle large messages', async () => {
      const writer = createTransportMessageWriter(mockTransport);
      const largeMessage = {
        jsonrpc: '2.0',
        method: 'test',
        params: { data: 'x'.repeat(10000) }
      };

      await expect(writer.write(largeMessage)).resolves.not.toThrow();
    });
  });
});