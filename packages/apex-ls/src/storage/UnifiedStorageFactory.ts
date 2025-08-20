/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexStorageInterface } from '@salesforce/apex-lsp-compliant-services';
import type { EnvironmentType } from '../types';
import { WebWorkerStorage } from './WebWorkerStorage';
import { BrowserIndexedDBApexStorage } from './BrowserIndexedDBApexStorage';

/**
 * Configuration options for storage
 */
export interface UnifiedStorageConfig {
  environment?: EnvironmentType;
  useMemoryStorage?: boolean;
  storageOptions?: Record<string, unknown>;
}

/**
 * Storage factory that provides appropriate storage implementations
 * based on the runtime environment
 */
export class UnifiedStorageFactory {
  /**
   * Creates a storage instance appropriate for the current environment
   */
  static async createStorage(
    config: UnifiedStorageConfig = {},
  ): Promise<ApexStorageInterface> {
    const environment = config.environment || this.detectEnvironment();
    const { useMemoryStorage = false, storageOptions = {} } = config;

    let storage: ApexStorageInterface;

    switch (environment) {
      case 'webworker':
        // Web workers use in-memory storage
        storage = WebWorkerStorage.getInstance();
        break;

      case 'browser':
        if (useMemoryStorage) {
          // Use memory storage for testing or when IndexedDB is unavailable
          storage = WebWorkerStorage.getInstance();
        } else {
          // Use IndexedDB storage for persistent browser storage
          storage = new BrowserIndexedDBApexStorage();
        }
        break;

      case 'node':
      default:
        // For Node.js environments, fall back to memory storage
        // A real Node.js storage implementation would use filesystem
        storage = WebWorkerStorage.getInstance();
        break;
    }

    // Initialize the storage
    await storage.initialize(storageOptions);

    return storage;
  }

  /**
   * Creates a memory-only storage instance (for testing or web workers)
   */
  static async createMemoryStorage(
    config: Omit<UnifiedStorageConfig, 'useMemoryStorage'> = {},
  ): Promise<ApexStorageInterface> {
    return this.createStorage({
      ...config,
      useMemoryStorage: true,
    });
  }

  /**
   * Creates a persistent storage instance (browser IndexedDB or Node.js filesystem)
   */
  static async createPersistentStorage(
    config: Omit<UnifiedStorageConfig, 'useMemoryStorage'> = {},
  ): Promise<ApexStorageInterface> {
    return this.createStorage({
      ...config,
      useMemoryStorage: false,
    });
  }

  /**
   * Detects the current runtime environment
   */
  private static detectEnvironment(): EnvironmentType {
    // Check for web worker environment (both classic and ES module workers)
    // ES module workers don't have importScripts, so we check for self and lack of window
    if (
      typeof self !== 'undefined' &&
      typeof window === 'undefined' &&
      typeof document === 'undefined'
    ) {
      return 'webworker';
    }

    // Check for browser environment
    if (typeof window !== 'undefined') {
      return 'browser';
    }

    // Default to Node.js
    return 'node';
  }

  /**
   * Checks if persistent storage is available in the current environment
   */
  static isPersistentStorageAvailable(): boolean {
    const environment = this.detectEnvironment();

    switch (environment) {
      case 'browser':
        // Check for IndexedDB availability
        return typeof indexedDB !== 'undefined';

      case 'node':
        // Node.js can use filesystem storage
        return true;

      case 'webworker':
      default:
        // Web workers don't have access to persistent storage directly
        return false;
    }
  }

  /**
   * Gets storage capabilities for the current environment
   */
  static getStorageCapabilities(): {
    persistent: boolean;
    memory: boolean;
    sync: boolean;
    environment: EnvironmentType;
  } {
    const environment = this.detectEnvironment();

    return {
      persistent: this.isPersistentStorageAvailable(),
      memory: true, // All environments support memory storage
      sync: environment === 'node', // Only Node.js supports synchronous operations
      environment,
    };
  }
}

/**
 * Storage adapter that provides a unified interface across different storage backends
 */
export class UnifiedStorageAdapter implements ApexStorageInterface {
  private storage!: ApexStorageInterface;
  private initialized = false;

  constructor(private config: UnifiedStorageConfig = {}) {}

  /**
   * Lazy initialization of the underlying storage
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.storage = await UnifiedStorageFactory.createStorage(this.config);
      this.initialized = true;
    }
  }

  async initialize(options?: Record<string, unknown>): Promise<void> {
    this.config.storageOptions = { ...this.config.storageOptions, ...options };
    await this.ensureInitialized();
  }

  async shutdown(): Promise<void> {
    await this.ensureInitialized();
    return this.storage.shutdown();
  }

  async storeAst(filePath: string, ast: any): Promise<boolean> {
    await this.ensureInitialized();
    return this.storage.storeAst(filePath, ast);
  }

  async retrieveAst(filePath: string): Promise<any> {
    await this.ensureInitialized();
    return this.storage.retrieveAst(filePath);
  }

  async storeTypeInfo(typeName: string, typeInfo: any): Promise<boolean> {
    await this.ensureInitialized();
    return this.storage.storeTypeInfo(typeName, typeInfo);
  }

  async retrieveTypeInfo(typeName: string): Promise<any> {
    await this.ensureInitialized();
    return this.storage.retrieveTypeInfo(typeName);
  }

  async storeReference(reference: any): Promise<boolean> {
    await this.ensureInitialized();
    return this.storage.storeReference(reference);
  }

  async findReferencesTo(targetSymbol: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.storage.findReferencesTo(targetSymbol);
  }

  async findReferencesFrom(sourceFile: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.storage.findReferencesFrom(sourceFile);
  }

  async clearFile(filePath: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.storage.clearFile(filePath);
  }

  async persist(): Promise<void> {
    await this.ensureInitialized();
    return this.storage.persist();
  }

  // Additional methods from WebWorkerStorage interface
  async getDocument(uri: string): Promise<any> {
    await this.ensureInitialized();
    if ('getDocument' in this.storage) {
      return (this.storage as any).getDocument(uri);
    }
    return null;
  }

  async setDocument(uri: string, document: any): Promise<boolean> {
    await this.ensureInitialized();
    if ('setDocument' in this.storage) {
      return (this.storage as any).setDocument(uri, document);
    }
    return false;
  }

  async setDefinition(symbolName: string, definition: any): Promise<boolean> {
    await this.ensureInitialized();
    if ('setDefinition' in this.storage) {
      return (this.storage as any).setDefinition(symbolName, definition);
    }
    return false;
  }

  async setReferences(symbolName: string, references: any[]): Promise<boolean> {
    await this.ensureInitialized();
    if ('setReferences' in this.storage) {
      return (this.storage as any).setReferences(symbolName, references);
    }
    return false;
  }

  async getReferences(symbolName: string): Promise<any[]> {
    await this.ensureInitialized();
    if ('getReferences' in this.storage) {
      return (this.storage as any).getReferences(symbolName);
    }
    return [];
  }
}
