/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { StorageFactory } from '../../src/storage/StorageFactory';
import {
  BrowserStorageFactory,
  WorkerStorageFactory,
} from '../../src/storage/StorageImplementations';
import type {
  IStorage,
  StorageConfig,
} from '../../src/storage/StorageInterface';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Mock IndexedDB for browser storage tests
class MockIDBDatabase {
  private objectStore = new MockIDBObjectStore();

  objectStoreNames = {
    contains: jest.fn(() => false),
  };
  createObjectStore = jest.fn();
  transaction = jest.fn(() => new MockIDBTransaction(this.objectStore));
}

class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;

  constructor(
    private mockResult?: any,
    private shouldError = false,
  ) {
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
  private storage = new Map<string, any>();

  get = jest.fn((key: string) => {
    const value = this.storage.get(key);
    return new MockIDBRequest(value);
  });

  put = jest.fn((value: any, key: string) => {
    this.storage.set(key, value);
    return new MockIDBRequest(undefined);
  });

  delete = jest.fn((key: string) => {
    this.storage.delete(key);
    return new MockIDBRequest(undefined);
  });

  clear = jest.fn(() => {
    this.storage.clear();
    return new MockIDBRequest(undefined);
  });
}

class MockIDBTransaction {
  objectStore = jest.fn();

  constructor(objectStore: MockIDBObjectStore) {
    this.objectStore = jest.fn(() => objectStore);
  }
}

// Mock environment detection using consolidated shared library
jest.mock('@salesforce/apex-lsp-shared', () => {
  const original = jest.requireActual('@salesforce/apex-lsp-shared');
  const mockEnv = {
    isBrowserEnvironment: jest.fn(() => true),
    isWorkerEnvironment: jest.fn(() => false),
    isNodeEnvironment: jest.fn(() => false),
    detectEnvironment: jest.fn(() => {
      if (mockEnv.isWorkerEnvironment()) return 'webworker';
      if (mockEnv.isBrowserEnvironment()) return 'browser';
      if (mockEnv.isNodeEnvironment()) return 'node';
      throw new Error('Unable to determine environment');
    }),
  };
  return {
    ...original,
    ...mockEnv,
  };
});

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

    // Mock IndexedDB on both global and globalThis
    const mockIndexedDB = {
      open: jest.fn((name: string, version: number) => {
        const db = new MockIDBDatabase();
        const request = new MockIDBRequest(db);

        // Add upgrade needed handler
        (request as any).onupgradeneeded = null;

        // Simulate upgrade needed
        setTimeout(() => {
          if ((request as any).onupgradeneeded) {
            (request as any).onupgradeneeded({
              target: { result: db },
            } as any);
          }
        }, 0);
        return request;
      }),
    };

    (global as any).indexedDB = mockIndexedDB;
    (globalThis as any).indexedDB = mockIndexedDB;
  });

  afterEach(() => {
    // Clean up globals
    delete (global as any).indexedDB;
    delete (globalThis as any).indexedDB;
  });

  describe('BrowserStorageFactory', () => {
    it('should create browser storage with IndexedDB', async () => {
      const storage = await BrowserStorageFactory.createStorage();

      expect(storage).toBeDefined();
      expect(typeof storage.getDocument).toBe('function');
      expect(typeof storage.setDocument).toBe('function');
      expect(typeof storage.clearFile).toBe('function');
      expect(typeof storage.clearAll).toBe('function');
    });

    it('should initialize IndexedDB correctly', async () => {
      const storage = await BrowserStorageFactory.createStorage({
        storagePrefix: 'test-storage',
      });

      expect((globalThis as any).indexedDB.open).toHaveBeenCalledWith(
        'test-storage',
        1,
      );
    });

    it('should handle storage operations', async () => {
      const storage = await BrowserStorageFactory.createStorage();

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

      const factory = BrowserStorageFactory;

      await expect(factory.createStorage()).rejects.toThrow(
        'Failed to open IndexedDB',
      );
    });
  });

  describe('WorkerStorageFactory', () => {
    it('should create worker storage with memory storage', async () => {
      const storage = await WorkerStorageFactory.createStorage();

      expect(storage).toBeDefined();
      expect(typeof storage.getDocument).toBe('function');
      expect(typeof storage.setDocument).toBe('function');
      expect(typeof storage.clearFile).toBe('function');
      expect(typeof storage.clearAll).toBe('function');
    });

    it('should handle document operations in memory', async () => {
      const storage = await WorkerStorageFactory.createStorage();

      // Test setting and getting documents
      await storage.setDocument('test-uri', mockTextDocument);
      const retrievedDoc = await storage.getDocument('test-uri');

      expect(retrievedDoc).toBe(mockTextDocument);
    });

    it('should clear documents correctly', async () => {
      const storage = await WorkerStorageFactory.createStorage();

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
      const storage = await WorkerStorageFactory.createStorage();

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

  describe('StorageFactory', () => {
    const { isWorkerEnvironment, isBrowserEnvironment } = jest.requireMock(
      '@salesforce/apex-lsp-shared',
    );

    beforeEach(() => {
      // Reset the singleton instance
      (StorageFactory as any).instance = undefined;
    });

    it('should create worker storage in worker environment', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      const storage = await StorageFactory.createStorage();
      expect(storage).toBeDefined();
    });

    it('should create browser storage in browser environment', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(true);

      const storage = await StorageFactory.createStorage();
      expect(storage).toBeDefined();
    });

    it('should handle unsupported environment by using test fallback', async () => {
      isWorkerEnvironment.mockReturnValue(false);
      isBrowserEnvironment.mockReturnValue(false);

      // In test environments, detectEnvironment failures fall back to 'node' environment
      const storage = await StorageFactory.createStorage();
      expect(storage).toBeDefined();
    });

    it('should return singleton instance on subsequent calls', async () => {
      isWorkerEnvironment.mockReturnValue(true);
      isBrowserEnvironment.mockReturnValue(false);

      const storage1 = await StorageFactory.createStorage();
      const storage2 = await StorageFactory.createStorage();

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

      const storage = await StorageFactory.createStorage(config);
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
      const storage = await WorkerStorageFactory.createStorage();

      await testStorageInterface(storage);
    });

    it('browser storage should implement IStorage interface correctly', async () => {
      const storage = await BrowserStorageFactory.createStorage();

      await testStorageInterface(storage);
    });
  });
});
