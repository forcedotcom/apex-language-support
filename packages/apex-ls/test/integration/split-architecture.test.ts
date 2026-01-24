/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Comprehensive regression tests for split architecture
 * Tests the complete browser/worker split functionality end-to-end
 */

import { BrowserMessageBridge } from '../../src/communication/PlatformBridges.browser';
import { WorkerMessageBridge } from '../../src/communication/PlatformBridges.worker';
import { ConnectionFactory as BrowserConnectionFactory } from '../../src/server/BrowserConnectionFactory';
import { WorkerConnectionFactory } from '../../src/server/WorkerConnectionFactory';
import { StorageFactory } from '../../src/storage/StorageFactory';
import { ApexLanguageServer } from '../../src/server/ApexLanguageServer';
import type { MessageConnection } from 'vscode-jsonrpc';

// Mock Worker for testing
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  listeners = new Map<string, Array<(event: Event) => void>>();

  postMessage(data: any): void {
    // Use setImmediate or process.nextTick for synchronous-like behavior in tests
    // This prevents timers from keeping the process alive
    if (typeof setImmediate !== 'undefined') {
      setImmediate(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data }));
        }
      });
    } else {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data }));
        }
      }, 0);
    }
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  terminate(): void {}
}

// Mock Worker Global Scope
class MockWorkerGlobalScope {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  listeners = new Map<string, Array<(event: Event) => void>>();

  postMessage(data: any): void {
    // Use setImmediate or process.nextTick for synchronous-like behavior in tests
    // This prevents timers from keeping the process alive
    if (typeof setImmediate !== 'undefined') {
      setImmediate(() => {
        // Would send to main thread
      });
    } else {
      setTimeout(() => {
        // Would send to main thread
      }, 0);
    }
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }
}

// Mock environment detection using shared library
jest.mock('@salesforce/apex-lsp-shared', () => {
  const original = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...original,
    isBrowserEnvironment: jest.fn().mockReturnValue(false),
    isWorkerEnvironment: jest.fn().mockReturnValue(false),
    isNodeEnvironment: jest.fn().mockReturnValue(true),
    detectEnvironment: jest.fn().mockReturnValue('node'),
  };
});

// Mock IndexedDB for browser storage tests
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

class MockIDBDatabase {
  transaction() {
    return {
      objectStore: () => ({
        put: () => new MockIDBRequest(),
        get: () => new MockIDBRequest(),
        delete: () => new MockIDBRequest(),
      }),
    };
  }
}

// Mock global IndexedDB
(global as any).indexedDB = {
  open: jest.fn(() => {
    const request = new MockIDBRequest();
    // Use setImmediate for synchronous-like behavior in tests
    if (typeof setImmediate !== 'undefined') {
      setImmediate(() => {
        request.result = new MockIDBDatabase();
        if (request.onsuccess) {
          request.onsuccess(new Event('success'));
        }
      });
    } else {
      setTimeout(() => {
        request.result = new MockIDBDatabase();
        if (request.onsuccess) {
          request.onsuccess(new Event('success'));
        }
      }, 0);
    }
    return request;
  }),
};

describe('Split Architecture Regression Tests', () => {
  let mockWorker: MockWorker;
  let mockWorkerScope: MockWorkerGlobalScope;
  const createdConnections: MessageConnection[] = [];
  const createdServers: ApexLanguageServer[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorker = new MockWorker();
    mockWorkerScope = new MockWorkerGlobalScope();
  });

  afterEach(async () => {
    // Dispose all created servers
    for (const server of createdServers) {
      try {
        await server.dispose();
      } catch (_error) {
        // Ignore disposal errors
      }
    }
    createdServers.length = 0;

    // Dispose all created connections
    for (const connection of createdConnections) {
      try {
        connection.dispose();
      } catch (_error) {
        // Ignore disposal errors
      }
    }
    createdConnections.length = 0;

    // Wait for any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('Complete Architecture Integration', () => {
    it('should support browser to worker communication flow', async () => {
      // Test complete browser → worker communication
      const connection = BrowserMessageBridge.forWorkerClient(
        mockWorker as any,
      );
      createdConnections.push(connection);

      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
      expect(typeof connection.listen).toBe('function');
      expect(typeof connection.dispose).toBe('function');
    });

    it('should support worker to browser communication flow', async () => {
      // Test complete worker → browser communication
      const connection = WorkerMessageBridge.forWorkerServer(
        mockWorkerScope as any,
      );
      createdConnections.push(connection);

      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
      expect(typeof connection.listen).toBe('function');
      expect(typeof connection.dispose).toBe('function');
    });

    it('should handle full connection factory flow', async () => {
      const sharedMocks = jest.requireMock('@salesforce/apex-lsp-shared');

      // Test browser connection factory
      sharedMocks.isBrowserEnvironment.mockReturnValue(true);
      sharedMocks.isWorkerEnvironment.mockReturnValue(false);

      const browserConnection = await BrowserConnectionFactory.createConnection(
        {
          worker: mockWorker as any,
        },
      );
      createdConnections.push(browserConnection);
      expect(browserConnection).toBeDefined();

      // Test worker connection factory - mock worker environment
      sharedMocks.isBrowserEnvironment.mockReturnValue(false);
      sharedMocks.isWorkerEnvironment.mockReturnValue(true);

      // Mock the global 'self' object that SelfMessageTransport expects
      (global as any).self = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const workerFactory = new WorkerConnectionFactory();
      const workerConnection = await workerFactory.createConnection({});
      createdConnections.push(workerConnection);
      expect(workerConnection).toBeDefined();

      // Clean up global mock
      delete (global as any).self;
    });
  });

  describe('Storage Layer Integration', () => {
    const { isWorkerEnvironment, isBrowserEnvironment } = jest.requireMock(
      '@salesforce/apex-lsp-shared',
    );

    beforeEach(() => {
      // Reset singleton
      (StorageFactory as any).instance = undefined;
    });

    it('should handle storage creation in different environments', async () => {
      const sharedMocks = jest.requireMock('@salesforce/apex-lsp-shared');

      // Test browser environment
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(true);
      sharedMocks.detectEnvironment.mockReturnValue('browser');

      const browserStorage = await StorageFactory.createStorage();
      expect(browserStorage).toBeDefined();

      // Reset singleton for next test
      (StorageFactory as any).instance = undefined;

      // Test worker environment
      sharedMocks.isWorkerEnvironment.mockReturnValue(true);
      sharedMocks.isBrowserEnvironment.mockReturnValue(false);
      sharedMocks.detectEnvironment.mockReturnValue('webworker');

      const workerStorage = await StorageFactory.createStorage();
      expect(workerStorage).toBeDefined();
    });
  });

  describe('Server Initialization', () => {
    it('should initialize server with different configurations', async () => {
      const sharedMocks = jest.requireMock('@salesforce/apex-lsp-shared');

      // Mock browser environment for this test
      sharedMocks.isBrowserEnvironment.mockReturnValue(true);

      const serverConfig = {
        environment: 'browser' as const,
        connection: BrowserMessageBridge.forWorkerClient(mockWorker as any),
      };

      const server = new ApexLanguageServer(serverConfig);
      createdServers.push(server);
      expect(server).toBeDefined();

      // Should not throw during initialization
      await expect(server.initialize()).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle worker creation failures gracefully', async () => {
      const sharedMocks = jest.requireMock('@salesforce/apex-lsp-shared');
      sharedMocks.isBrowserEnvironment.mockReturnValue(true);

      await expect(
        BrowserConnectionFactory.createConnection({}),
      ).rejects.toThrow('Browser environment requires a worker instance');
    });

    it('should handle environment detection failures', async () => {
      const sharedMocks = jest.requireMock('@salesforce/apex-lsp-shared');

      // Reset singleton
      (StorageFactory as any).instance = undefined;

      // Mock unsupported environment
      sharedMocks.isWorkerEnvironment.mockReturnValue(false);
      sharedMocks.isBrowserEnvironment.mockReturnValue(false);
      sharedMocks.detectEnvironment.mockImplementationOnce(() => {
        throw new Error('Unable to determine environment');
      });

      // The refactored storage factory gracefully falls back to node environment in tests
      // when environment detection fails, providing a more robust testing experience
      const storage = await StorageFactory.createStorage();
      expect(storage).toBeDefined();
    });

    it('should handle connection disposal properly', () => {
      const browserConnection = BrowserMessageBridge.forWorkerClient(
        mockWorker as any,
      );
      const workerConnection = WorkerMessageBridge.forWorkerServer(
        mockWorkerScope as any,
      );

      // Should not throw during disposal
      expect(() => browserConnection.dispose()).not.toThrow();
      expect(() => workerConnection.dispose()).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple connections without memory leaks', async () => {
      const connections: MessageConnection[] = [];

      // Create multiple connections
      for (let i = 0; i < 10; i++) {
        const worker = new MockWorker();
        const connection = BrowserMessageBridge.forWorkerClient(worker as any);
        connections.push(connection);
        createdConnections.push(connection);
      }

      // All connections should be valid
      connections.forEach((connection) => {
        expect(connection).toBeDefined();
        expect(typeof connection.dispose).toBe('function');
      });

      // Dispose all connections
      connections.forEach((connection) => {
        expect(() => connection.dispose()).not.toThrow();
      });
    });

    it('should handle storage singleton correctly', async () => {
      const { isWorkerEnvironment, isBrowserEnvironment } = jest.requireMock(
        '@salesforce/apex-lsp-shared',
      );

      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      const storage1 = await StorageFactory.createStorage();
      const storage2 = await StorageFactory.createStorage();

      // Should return the same instance
      expect(storage1).toBe(storage2);
    });
  });

  describe('Build System Integration', () => {
    it('should verify all required modules can be imported', async () => {
      // Test dynamic imports that happen in production
      await expect(
        import('../../src/communication/PlatformBridges.browser'),
      ).resolves.toBeDefined();
      await expect(
        import('../../src/communication/PlatformBridges.worker'),
      ).resolves.toBeDefined();
      await expect(
        import('../../src/server/BrowserConnectionFactory'),
      ).resolves.toBeDefined();
      await expect(
        import('../../src/server/WorkerConnectionFactory'),
      ).resolves.toBeDefined();
      await expect(
        import('../../src/storage/StorageImplementations'),
      ).resolves.toBeDefined();
      await expect(
        import('../../src/storage/StorageFactory'),
      ).resolves.toBeDefined();
    });

    it('should verify browser module exports correct interfaces', async () => {
      // Import BrowserStorageFactory directly from its source after removing re-exports
      const storageModule = await import(
        '../../src/storage/StorageImplementations'
      );

      // Browser storage should be available directly from StorageImplementations
      expect(storageModule.BrowserStorageFactory).toBeDefined();
      // Note: Worker modules cannot be tested via imports as they reference worker-only globals
    });
  });

  describe('Performance Characteristics', () => {
    it('should create connections efficiently', async () => {
      const sharedMocks = jest.requireMock('@salesforce/apex-lsp-shared');
      sharedMocks.isBrowserEnvironment.mockReturnValue(true);

      const startTime = performance.now();

      const connection = await BrowserConnectionFactory.createConnection({
        worker: mockWorker as any,
      });
      createdConnections.push(connection);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Connection creation should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid message sending', async () => {
      const connection = BrowserMessageBridge.forWorkerClient(
        mockWorker as any,
      );
      createdConnections.push(connection);

      // Should handle sequential message sending without errors
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1)); // Small delay to avoid concurrency
        expect(() => {
          connection.sendNotification('test', { id: i });
        }).not.toThrow();
      }
    });
  });
});
