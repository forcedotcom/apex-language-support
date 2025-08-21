/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BrowserConnectionFactory } from '../../src/server/BrowserConnectionFactory';
import { WorkerConnectionFactory } from '../../src/server/WorkerConnectionFactory';
import { ConnectionFactory } from '../../src/server/ConnectionFactory.browser';
import type { ConnectionConfig } from '../../src/server/ConnectionFactoryInterface';

// Mock the message bridge modules
jest.mock('../../src/communication/BrowserMessageBridgeFactory', () => ({
  createBrowserMessageBridge: jest.fn().mockResolvedValue({
    sendRequest: jest.fn(),
    sendNotification: jest.fn(),
    onRequest: jest.fn(),
    onNotification: jest.fn(),
    listen: jest.fn(),
    dispose: jest.fn(),
  }),
}));

jest.mock('../../src/communication/WorkerMessageBridgeFactory', () => ({
  createWorkerMessageBridge: jest.fn().mockResolvedValue({
    sendRequest: jest.fn(),
    sendNotification: jest.fn(),
    onRequest: jest.fn(),
    onNotification: jest.fn(),
    listen: jest.fn(),
    dispose: jest.fn(),
  }),
}));

// Mock environment detection
jest.mock('../../src/utils/EnvironmentDetector', () => ({
  isWorkerEnvironment: jest.fn(),
  isBrowserEnvironment: jest.fn(),
  isNodeEnvironment: jest.fn(),
}));

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(data: any): void {
    // Mock implementation
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    // Mock implementation
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    // Mock implementation
  }

  terminate(): void {
    // Mock implementation
  }
}

describe('Connection Factory Architecture', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorker = new MockWorker();
  });

  describe('BrowserConnectionFactory', () => {
    it('should create a browser connection factory', () => {
      const factory = new BrowserConnectionFactory();
      expect(factory).toBeDefined();
      expect(typeof factory.createConnection).toBe('function');
    });

    it('should create connection with worker', async () => {
      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      const connection = await factory.createConnection(config);
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should throw error without worker', async () => {
      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {};

      await expect(factory.createConnection(config)).rejects.toThrow(
        'Browser connection requires a worker instance'
      );
    });

    it('should use createBrowserMessageBridge', async () => {
      const { createBrowserMessageBridge } = require('../../src/communication/BrowserMessageBridgeFactory');
      
      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      await factory.createConnection(config);
      expect(createBrowserMessageBridge).toHaveBeenCalledWith({
        worker: mockWorker,
      });
    });
  });

  describe('WorkerConnectionFactory', () => {
    it('should create a worker connection factory', () => {
      const factory = new WorkerConnectionFactory();
      expect(factory).toBeDefined();
      expect(typeof factory.createConnection).toBe('function');
    });

    it('should create connection without requiring worker', async () => {
      const factory = new WorkerConnectionFactory();
      const config: ConnectionConfig = {};

      const connection = await factory.createConnection(config);
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should pass logger to message bridge', async () => {
      const { createWorkerMessageBridge } = require('../../src/communication/WorkerMessageBridgeFactory');
      
      const factory = new WorkerConnectionFactory();
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      const config: ConnectionConfig = {
        logger: mockLogger as any,
      };

      await factory.createConnection(config);
      expect(createWorkerMessageBridge).toHaveBeenCalledWith({
        logger: mockLogger,
      });
    });

    it('should use createWorkerMessageBridge', async () => {
      const { createWorkerMessageBridge } = require('../../src/communication/WorkerMessageBridgeFactory');
      
      const factory = new WorkerConnectionFactory();
      await factory.createConnection();
      
      expect(createWorkerMessageBridge).toHaveBeenCalled();
    });
  });

  describe('ConnectionFactory (Browser)', () => {
    const { isWorkerEnvironment, isBrowserEnvironment } = require('../../src/utils/EnvironmentDetector');

    it('should throw error for worker environment in browser build', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      await expect(ConnectionFactory.createConnection()).rejects.toThrow(
        'Worker implementation not available in browser build'
      );
    });

    it('should create browser connection in browser environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(true);

      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      const connection = await ConnectionFactory.createConnection(config);
      expect(connection).toBeDefined();
    });

    it('should throw error without worker in browser environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(true);

      await expect(ConnectionFactory.createConnection()).rejects.toThrow(
        'Browser environment requires a worker instance'
      );
    });

    it('should throw error for unsupported environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(false);

      await expect(ConnectionFactory.createConnection()).rejects.toThrow(
        'Unsupported environment'
      );
    });

    it('should create browser connection using convenience method', async () => {
      const connection = await ConnectionFactory.createBrowserConnection(mockWorker as any);
      expect(connection).toBeDefined();
    });
  });

  describe('Connection Interface Compliance', () => {
    it('should create connections that implement MessageConnection interface', async () => {
      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      const connection = await factory.createConnection(config);
      
      // Verify MessageConnection interface
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
      expect(typeof connection.onRequest).toBe('function');
      expect(typeof connection.onNotification).toBe('function');
      expect(typeof connection.listen).toBe('function');
      expect(typeof connection.dispose).toBe('function');
    });

    it('should handle connection lifecycle correctly', async () => {
      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      const connection = await factory.createConnection(config);
      
      // Should be able to listen and dispose
      expect(() => connection.listen()).not.toThrow();
      expect(() => connection.dispose()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle factory creation errors gracefully', async () => {
      // Mock the import to throw an error
      jest.doMock('../../src/communication/BrowserMessageBridgeFactory', () => {
        throw new Error('Module import failed');
      });

      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      await expect(factory.createConnection(config)).rejects.toThrow();
    });

    it('should handle message bridge creation errors', async () => {
      const { createBrowserMessageBridge } = require('../../src/communication/BrowserMessageBridgeFactory');
      createBrowserMessageBridge.mockRejectedValueOnce(new Error('Bridge creation failed'));

      const factory = new BrowserConnectionFactory();
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      await expect(factory.createConnection(config)).rejects.toThrow('Bridge creation failed');
    });
  });
});