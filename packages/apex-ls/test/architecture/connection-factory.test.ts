/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BrowserConnectionFactory } from '../../src/server/BrowserConnectionFactory';
import { ConnectionFactory as WorkerConnectionFactory } from '../../src/server/ConnectionFactory.worker';
import { ConnectionFactory } from '../../src/server/ConnectionFactory.browser';
import type { ConnectionConfig } from '../../src/server/ConnectionFactoryInterface';
import { isBrowserEnvironment } from '../../src/utils/EnvironmentDetector.browser';
import { isWorkerEnvironment } from '../../src/utils/EnvironmentDetector.worker';

// Mock environment detection
jest.mock('../../src/utils/EnvironmentDetector.browser', () => ({
  isBrowserEnvironment: jest.fn(),
}));

jest.mock('../../src/utils/EnvironmentDetector.worker', () => ({
  isWorkerEnvironment: jest.fn(),
}));

// Mock the message bridge modules
jest.mock('../../src/communication/PlatformBridges.browser', () => ({
  BrowserMessageBridge: {
    forWorkerClient: jest.fn().mockReturnValue({
      sendRequest: jest.fn(),
      sendNotification: jest.fn(),
      onRequest: jest.fn(),
      onNotification: jest.fn(),
      listen: jest.fn(),
      dispose: jest.fn(),
    }),
  },
}));

jest.mock('../../src/communication/PlatformBridges.worker', () => ({
  WorkerMessageBridge: {
    forWorkerServer: jest.fn().mockReturnValue({
      sendRequest: jest.fn(),
      sendNotification: jest.fn(),
      onRequest: jest.fn(),
      onNotification: jest.fn(),
      listen: jest.fn(),
      dispose: jest.fn(),
    }),
  },
}));

// Mock environment detection
jest.mock('../../src/utils/EnvironmentDetector.browser', () => {
  const mockBrowserEnvironment = jest.fn(() => true);
  const mockWorkerEnvironment = jest.fn(() => false);
  return {
    isBrowserEnvironment: mockBrowserEnvironment,
    isWorkerEnvironment: mockWorkerEnvironment,
    isNodeEnvironment: jest.fn(() => false),
  };
});

jest.mock('../../src/utils/EnvironmentDetector.worker', () => {
  const mockBrowserEnvironment = jest.fn(() => false);
  const mockWorkerEnvironment = jest.fn(() => true);
  return {
    isBrowserEnvironment: mockBrowserEnvironment,
    isWorkerEnvironment: mockWorkerEnvironment,
    isNodeEnvironment: jest.fn(() => false),
  };
});

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
      const factory = BrowserConnectionFactory;
      expect(factory).toBeDefined();
      expect(typeof factory.createConnection).toBe('function');
    });

    it('should create connection with worker', async () => {
      const factory = BrowserConnectionFactory;
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      const connection = await factory.createConnection(config);
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should throw error without worker', async () => {
      const factory = BrowserConnectionFactory;
      const config: ConnectionConfig = {};

      await expect(factory.createConnection(config)).rejects.toThrow(
        'Browser connection requires a worker instance',
      );
    });

    it('should use BrowserMessageBridge.forWorkerClient', async () => {
      const {
        BrowserMessageBridge,
      } = require('../../src/communication/PlatformBridges.browser');

      const factory = BrowserConnectionFactory;
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      await factory.createConnection(config);
      expect(BrowserMessageBridge.forWorkerClient).toHaveBeenCalledWith(
        mockWorker,
      );
    });
  });

  describe('WorkerConnectionFactory', () => {
    it('should create a worker connection factory', () => {
      const factory = WorkerConnectionFactory;
      expect(factory).toBeDefined();
      expect(typeof factory.createConnection).toBe('function');
    });

    it('should create connection without requiring worker', async () => {
      const factory = WorkerConnectionFactory;
      const config: ConnectionConfig = {};

      const connection = await factory.createConnection(config);
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should pass logger to message bridge', async () => {
      const {
        WorkerMessageBridge,
      } = require('../../src/communication/PlatformBridges.worker');

      const factory = WorkerConnectionFactory;
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      const config: ConnectionConfig = {
        logger: mockLogger as any,
      };

      await factory.createConnection(config);
      expect(WorkerMessageBridge.forWorkerServer).toHaveBeenCalledWith(
        undefined,
        mockLogger,
      );
    });

    it('should use WorkerMessageBridge.forWorkerServer', async () => {
      const {
        WorkerMessageBridge,
      } = require('../../src/communication/PlatformBridges.worker');

      const factory = WorkerConnectionFactory;
      await factory.createConnection();

      expect(WorkerMessageBridge.forWorkerServer).toHaveBeenCalled();
    });
  });

  describe('ConnectionFactory (Browser)', () => {
    // Environment detection is already mocked

    it('should throw error for worker environment in browser build', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      await expect(ConnectionFactory.createConnection()).rejects.toThrow(
        'Worker implementation not available in browser build',
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
        'Browser environment requires a worker instance',
      );
    });

    it('should throw error for unsupported environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(false);

      await expect(ConnectionFactory.createConnection()).rejects.toThrow(
        'Unsupported environment',
      );
    });

    it('should create browser connection using convenience method', async () => {
      const connection = await ConnectionFactory.createBrowserConnection(
        mockWorker as any,
      );
      expect(connection).toBeDefined();
    });
  });

  describe('Connection Interface Compliance', () => {
    it('should create connections that implement MessageConnection interface', async () => {
      const factory = BrowserConnectionFactory;
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
      const factory = BrowserConnectionFactory;
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
      // Modify the existing mock to throw an error
      const {
        BrowserMessageBridge,
      } = require('../../src/communication/PlatformBridges.browser');
      
      BrowserMessageBridge.forWorkerClient.mockImplementationOnce(() => {
        throw new Error('Module import failed');
      });

      const factory = BrowserConnectionFactory;
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      await expect(factory.createConnection(config)).rejects.toThrow(
        'Module import failed',
      );
    });

    it('should handle message bridge creation errors', async () => {
      const {
        BrowserMessageBridge,
      } = require('../../src/communication/PlatformBridges.browser');
      BrowserMessageBridge.forWorkerClient.mockImplementationOnce(() => {
        throw new Error('Bridge creation failed');
      });

      const factory = BrowserConnectionFactory;
      const config: ConnectionConfig = {
        worker: mockWorker as any,
      };

      await expect(factory.createConnection(config)).rejects.toThrow(
        'Bridge creation failed',
      );
    });
  });
});
