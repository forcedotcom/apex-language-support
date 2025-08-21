/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UnifiedStorageFactory } from '../../src/storage/UnifiedStorageFactory';
import { BrowserStorageFactory } from '../../src/storage/BrowserStorageFactory';
import { WorkerStorageFactory } from '../../src/storage/WorkerStorageFactory';
import type { IStorage, StorageConfig } from '../../src/storage/StorageInterface';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Mock IndexedDB for browser storage tests
class MockIDBDatabase {
  objectStoreNames = {
    contains: jest.fn(() => false),
  };
  createObjectStore = jest.fn();
  transaction = jest.fn();
}

class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(private mockResult?: any, private shouldError = false) {
    setTimeout(() => {
      if (this.shouldError && this.onerror) {
        this.onerror(new Event('error'));
      } else if (this.onsuccess) {
        this.result = mockResult;
        this.onsuccess(new Event('success'));
      }
    }, 0);
  }
}

class MockIDBObjectStore {
  get = jest.fn((key: string) => new MockIDBRequest());
  put = jest.fn((value: any, key: string) => new MockIDBRequest(undefined));
  delete = jest.fn((key: string) => new MockIDBRequest(undefined));
  clear = jest.fn(() => new MockIDBRequest(undefined));
}

class MockIDBTransaction {
  objectStore = jest.fn(() => new MockIDBObjectStore());
}

// Mock environment detection
jest.mock('../../src/utils/EnvironmentDetector', () => ({
  isWorkerEnvironment: jest.fn(),
  isBrowserEnvironment: jest.fn(),
  isNodeEnvironment: jest.fn(),
}));

describe('Storage Architecture', () => {
  let mockTextDocument: TextDocument;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a mock text document
    mockTextDocument = {
      uri: 'file:///test.apex',
      languageId: 'apex',
      version: 1,
      getText: () => 'class Test {}',
      positionAt: jest.fn(),
      offsetAt: jest.fn(),
      lineCount: 1,
    } as any;

    // Mock IndexedDB
    (global as any).indexedDB = {
      open: jest.fn((name: string, version: number) => {
        const request = new MockIDBRequest(new MockIDBDatabase());
        // Simulate upgrade needed
        setTimeout(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded({
              target: { result: new MockIDBDatabase() },
            } as any);
          }
        }, 0);
        return request;
      }),
    };
  });

  afterEach(() => {
    // Clean up globals
    delete (global as any).indexedDB;
  });

  describe('BrowserStorageFactory', () => {
    it('should create browser storage with IndexedDB', async () => {
      const factory = new BrowserStorageFactory();
      const storage = await factory.createStorage();
      
      expect(storage).toBeDefined();
      expect(typeof storage.getDocument).toBe('function');
      expect(typeof storage.setDocument).toBe('function');
      expect(typeof storage.clearFile).toBe('function');
      expect(typeof storage.clearAll).toBe('function');
    });

    it('should initialize IndexedDB correctly', async () => {
      const factory = new BrowserStorageFactory();
      const storage = await factory.createStorage({
        storagePrefix: 'test-storage',
      });
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('test-storage', 1);
    });

    it('should handle storage operations', async () => {
      const factory = new BrowserStorageFactory();
      const storage = await factory.createStorage();
      
      // Test document operations
      await storage.setDocument('test-uri', mockTextDocument);
      const retrievedDoc = await storage.getDocument('test-uri');
      
      // These should not throw
      expect(storage.setDocument).toBeDefined();
      expect(storage.getDocument).toBeDefined();
    });

    it('should handle storage errors gracefully', async () => {
      // Mock IndexedDB to return errors
      (global as any).indexedDB.open = jest.fn(() => {
        const request = new MockIDBRequest(null, true);
        return request;
      });

      const factory = new BrowserStorageFactory();
      
      await expect(factory.createStorage()).rejects.toThrow('Failed to open IndexedDB');
    });
  });

  describe('WorkerStorageFactory', () => {
    it('should create worker storage with memory storage', async () => {
      const factory = new WorkerStorageFactory();
      const storage = await factory.createStorage();
      
      expect(storage).toBeDefined();
      expect(typeof storage.getDocument).toBe('function');
      expect(typeof storage.setDocument).toBe('function');
      expect(typeof storage.clearFile).toBe('function');
      expect(typeof storage.clearAll).toBe('function');
    });

    it('should handle document operations in memory', async () => {
      const factory = new WorkerStorageFactory();
      const storage = await factory.createStorage();
      
      // Test setting and getting documents
      await storage.setDocument('test-uri', mockTextDocument);
      const retrievedDoc = await storage.getDocument('test-uri');
      
      expect(retrievedDoc).toBe(mockTextDocument);
    });

    it('should clear documents correctly', async () => {
      const factory = new WorkerStorageFactory();
      const storage = await factory.createStorage();
      
      // Set a document
      await storage.setDocument('test-uri', mockTextDocument);
      let retrievedDoc = await storage.getDocument('test-uri');
      expect(retrievedDoc).toBe(mockTextDocument);
      
      // Clear the document
      await storage.clearFile('test-uri');
      retrievedDoc = await storage.getDocument('test-uri');
      expect(retrievedDoc).toBeUndefined();
    });

    it('should clear all documents', async () => {
      const factory = new WorkerStorageFactory();
      const storage = await factory.createStorage();
      
      // Set multiple documents
      await storage.setDocument('test-uri-1', mockTextDocument);
      await storage.setDocument('test-uri-2', mockTextDocument);
      
      // Clear all
      await storage.clearAll();
      
      // Check both are cleared
      expect(await storage.getDocument('test-uri-1')).toBeUndefined();
      expect(await storage.getDocument('test-uri-2')).toBeUndefined();
    });
  });

  describe('UnifiedStorageFactory', () => {
    const { isWorkerEnvironment, isBrowserEnvironment } = require('../../src/utils/EnvironmentDetector');

    beforeEach(() => {
      // Reset the singleton instance
      (UnifiedStorageFactory as any).instance = undefined;
    });

    it('should create worker storage in worker environment', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      const storage = await UnifiedStorageFactory.createStorage();
      expect(storage).toBeDefined();
    });

    it('should create browser storage in browser environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(true);

      const storage = await UnifiedStorageFactory.createStorage();
      expect(storage).toBeDefined();
    });

    it('should throw error for unsupported environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(false);

      await expect(UnifiedStorageFactory.createStorage()).rejects.toThrow('Unsupported environment');
    });

    it('should return singleton instance on subsequent calls', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      const storage1 = await UnifiedStorageFactory.createStorage();
      const storage2 = await UnifiedStorageFactory.createStorage();
      
      expect(storage1).toBe(storage2);
    });

    it('should pass configuration to storage implementations', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      const config: StorageConfig = {
        useMemoryStorage: true,
        storagePrefix: 'test-prefix',
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        } as any,
      };

      const storage = await UnifiedStorageFactory.createStorage(config);
      expect(storage).toBeDefined();
    });
  });

  describe('Storage Interface Compliance', () => {
    const testStorageInterface = async (storage: IStorage) => {
      // Test initialize
      await storage.initialize();

      // Test document operations
      await storage.setDocument('test-uri', mockTextDocument);
      const doc = await storage.getDocument('test-uri');
      expect(doc).toBeDefined();

      // Test clear operations
      await storage.clearFile('test-uri');
      const clearedDoc = await storage.getDocument('test-uri');
      expect(clearedDoc).toBeUndefined();

      // Test clear all
      await storage.setDocument('test-uri-1', mockTextDocument);
      await storage.setDocument('test-uri-2', mockTextDocument);
      await storage.clearAll();
      
      expect(await storage.getDocument('test-uri-1')).toBeUndefined();
      expect(await storage.getDocument('test-uri-2')).toBeUndefined();
    };

    it('worker storage should implement IStorage interface correctly', async () => {
      const factory = new WorkerStorageFactory();
      const storage = await factory.createStorage();
      
      await testStorageInterface(storage);
    });

    it('browser storage should implement IStorage interface correctly', async () => {
      const factory = new BrowserStorageFactory();
      const storage = await factory.createStorage();
      
      await testStorageInterface(storage);
    });
  });
});