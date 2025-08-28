/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createWorker,
  createWorkerUrl,
  getWorkerGlobalScope,
} from '../../src/utils/BrowserUtils';

// Mock Worker
class MockWorker {
  postMessage = jest.fn();
  terminate = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
}

describe('BrowserUtils', () => {
  // Store original globals
  const originalWorker = (global as any).Worker;
  const originalWindow = (global as any).window;
  const originalSelf = (global as any).self;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup browser-like environment
    (global as any).Worker = jest.fn().mockImplementation(() => new MockWorker());
    (global as any).window = {
      location: { origin: 'https://example.com' },
    };
  });

  afterAll(() => {
    // Restore original globals
    (global as any).Worker = originalWorker;
    (global as any).window = originalWindow;
    (global as any).self = originalSelf;
  });

  describe('createWorkerUrl', () => {
    it('should create URL for relative worker file', () => {
      const context = { extensionUri: 'https://example.com/extension/' };
      const url = createWorkerUrl('worker.js', context);
      
      expect(url).toBeInstanceOf(URL);
      expect(url.toString()).toBe('https://example.com/extension/worker.js');
    });

    it('should handle absolute URLs', () => {
      const context = { extensionUri: 'https://example.com/extension/' };
      const url = createWorkerUrl('/absolute/worker.js', context);
      
      expect(url).toBeInstanceOf(URL);
      expect(url.toString()).toBe('https://example.com/absolute/worker.js');
    });

    it('should handle HTTP URLs', () => {
      const context = { extensionUri: 'https://example.com/extension/' };
      const url = createWorkerUrl('https://cdn.example.com/worker.js', context);
      
      expect(url).toBeInstanceOf(URL);
      expect(url.toString()).toBe('https://cdn.example.com/worker.js');
    });

    it('should apply VS Code Web test environment workaround', () => {
      const context = { extensionUri: 'https://example.com/static/' };
      const url = createWorkerUrl('dist/worker.mjs', context);
      
      if (url.toString().includes('/static/dist/worker.mjs')) {
        expect(url.toString()).toBe('https://example.com/static/devextensions/dist/worker.mjs');
      }
    });
  });

  describe('createWorker', () => {
    it('should create worker with URL', () => {
      const context = { extensionUri: 'https://example.com/extension/' };
      const worker = createWorker('worker.js', context);
      
      expect(worker).toBeInstanceOf(MockWorker);
      expect((global as any).Worker).toHaveBeenCalledWith('https://example.com/extension/worker.js');
    });

    it('should handle worker creation errors', () => {
      (global as any).Worker = jest.fn().mockImplementationOnce(() => {
        throw new Error('Worker creation failed');
      });

      const context = { extensionUri: 'https://example.com/extension/' };
      expect(() => createWorker('worker.js', context)).toThrow('Worker creation failed');
    });
  });

  describe('getWorkerGlobalScope', () => {
    it('should return self in worker environment', () => {
      const mockSelf = { postMessage: jest.fn() };
      (global as any).self = mockSelf;
      delete (global as any).window;

      expect(getWorkerGlobalScope()).toBe(mockSelf);
    });

    it('should return null in browser environment', () => {
      (global as any).window = {};
      (global as any).self = { postMessage: jest.fn() };

      expect(getWorkerGlobalScope()).toBeNull();
    });

    it('should return null when self is not available', () => {
      delete (global as any).self;
      delete (global as any).window;

      expect(getWorkerGlobalScope()).toBeNull();
    });

    it('should handle errors gracefully', () => {
      // Mock self to throw error on access
      Object.defineProperty(global, 'self', {
        get() {
          throw new Error('Self access error');
        },
        configurable: true,
      });

      expect(getWorkerGlobalScope()).toBeNull();

      // Cleanup
      delete (global as any).self;
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing Worker constructor', () => {
      delete (global as any).Worker;
      const context = { extensionUri: 'https://example.com/extension/' };

      expect(() => createWorker('worker.js', context)).toThrow();
    });

    it('should handle complex extension URIs', () => {
      const context = { extensionUri: 'vscode-webview://abc123/extension/' };
      const url = createWorkerUrl('worker.js', context);
      
      expect(url).toBeInstanceOf(URL);
    });

    it('should handle URL parsing errors', () => {
      const context = { extensionUri: 'invalid-url' };
      
      expect(() => createWorkerUrl('worker.js', context)).toThrow();
    });
  });
});