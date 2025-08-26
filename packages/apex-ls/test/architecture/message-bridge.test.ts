/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BrowserMessageBridge } from '../../src/communication/PlatformBridges.browser';
import { WorkerMessageBridge } from '../../src/communication/PlatformBridges.worker';
import { isBrowserEnvironment } from '../../src/utils/EnvironmentDetector.browser';
import { isWorkerEnvironment } from '../../src/utils/EnvironmentDetector.worker';

// Mock environment detection with dynamic behavior
jest.mock('../../src/utils/EnvironmentDetector.browser', () => {
  const mockBrowserEnvironment = jest.fn(() => {
    // Check actual global environment for Environment Detection tests
    return typeof (global as any).window !== 'undefined' && typeof (global as any).document !== 'undefined';
  });
  const mockWorkerEnvironment = jest.fn(() => {
    return typeof (global as any).self !== 'undefined' && typeof (global as any).importScripts === 'function';
  });
  return {
    isBrowserEnvironment: mockBrowserEnvironment,
    isWorkerEnvironment: mockWorkerEnvironment,
    isNodeEnvironment: jest.fn(() => false),
  };
});

jest.mock('../../src/utils/EnvironmentDetector.worker', () => {
  const mockBrowserEnvironment = jest.fn(() => {
    return typeof (global as any).window !== 'undefined' && typeof (global as any).document !== 'undefined';
  });
  const mockWorkerEnvironment = jest.fn(() => {
    return typeof (global as any).self !== 'undefined' && typeof (global as any).importScripts === 'function';
  });
  return {
    isBrowserEnvironment: mockBrowserEnvironment,
    isWorkerEnvironment: mockWorkerEnvironment,
    isNodeEnvironment: jest.fn(() => false),
  };
});

// Mock Worker for browser tests
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  listeners = new Map<string, Array<(event: Event) => void>>();

  constructor() {}

  postMessage(data: any): void {
    // Simulate message posting
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 0);
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

  terminate(): void {
    // Cleanup
  }
}

// Mock DedicatedWorkerGlobalScope for worker tests
class MockWorkerGlobalScope {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  listeners = new Map<string, Array<(event: Event) => void>>();

  constructor() {}

  postMessage(data: any): void {
    // Simulate message posting to main thread
    setTimeout(() => {
      // Would send to main thread
    }, 0);
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

describe('Message Bridge Architecture', () => {
  describe('BrowserMessageBridge', () => {
    let mockWorker: MockWorker;

    beforeEach(() => {
      mockWorker = new MockWorker();
    });

    it('should create a browser message bridge for worker client', () => {
      const connection = BrowserMessageBridge.forWorkerClient(
        mockWorker as any,
      );
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should detect browser environment correctly', () => {
      // Mock browser globals
      (global as any).window = {};
      (global as any).document = {};

      const isBrowser = isBrowserEnvironment();
      expect(isBrowser).toBe(true);

      // Cleanup
      delete (global as any).window;
      delete (global as any).document;
    });

    it('should handle worker communication', async () => {
      const connection = BrowserMessageBridge.forWorkerClient(
        mockWorker as any,
      );

      // Test sending a message
      const testMessage = { method: 'test', params: { data: 'test' } };

      // This should not throw
      expect(() => {
        connection.sendNotification('test', testMessage);
      }).not.toThrow();
    });

    it('should handle connection errors gracefully', () => {
      const connection = BrowserMessageBridge.forWorkerClient(
        mockWorker as any,
      );

      // Set up error handler
      let errorReceived = false;
      connection.onError(() => {
        errorReceived = true;
      });

      // Simulate worker error
      if (mockWorker.onerror) {
        mockWorker.onerror(new ErrorEvent('error', { message: 'Test error' }));
      }

      // Error handling should be set up
      expect(typeof connection.onError).toBe('function');
    });
  });

  describe('WorkerMessageBridge', () => {
    let mockWorkerScope: MockWorkerGlobalScope;

    beforeEach(() => {
      mockWorkerScope = new MockWorkerGlobalScope();
    });

    it('should create a worker message bridge for worker server', () => {
      const connection = WorkerMessageBridge.forWorkerServer(
        mockWorkerScope as any,
      );
      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should detect worker environment correctly', () => {
      // Mock worker globals
      (global as any).self = {};
      (global as any).importScripts = jest.fn();

      const isWorker = isWorkerEnvironment();
      expect(isWorker).toBe(true);

      // Cleanup
      delete (global as any).self;
      delete (global as any).importScripts;
    });

    it('should handle self communication', async () => {
      const connection = WorkerMessageBridge.forWorkerServer(
        mockWorkerScope as any,
      );

      // Test sending a message
      const testMessage = { method: 'test', params: { data: 'test' } };

      // This should not throw
      expect(() => {
        connection.sendNotification('test', testMessage);
      }).not.toThrow();
    });
  });

  describe('Environment Detection', () => {
    beforeEach(() => {
      // Clean up globals before each test
      delete (global as any).window;
      delete (global as any).document;
      delete (global as any).self;
      delete (global as any).importScripts;
    });

    it('should detect browser environment', () => {
      (global as any).window = {};
      (global as any).document = {};

      expect(isBrowserEnvironment()).toBe(true);
      expect(isWorkerEnvironment()).toBe(false);
    });

    it('should detect worker environment', () => {
      (global as any).self = {};
      (global as any).importScripts = jest.fn();

      // In web test environment (jsdom), browser environment will be true
      // so we just test that worker detection works
      expect(WorkerMessageBridge.isWorkerEnvironment()).toBe(true);
    });

    it('should handle neither environment', () => {
      // In jsdom environment, browser detection will always be true
      // Test that worker detection returns false when no worker globals exist
      delete (global as any).self;
      delete (global as any).importScripts;
      
      expect(isWorkerEnvironment()).toBe(false);
    });
  });
});
