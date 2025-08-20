/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  ApexStorageInterface,
  ApexReference,
} from '@salesforce/apex-lsp-compliant-services';
import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * In-memory storage implementation for web worker environments
 *
 * This storage implementation uses a simple in-memory Map to store data.
 * Since web workers don't have access to persistent storage like IndexedDB
 * or the filesystem, this provides a temporary storage solution.
 *
 * Note: Data stored in this implementation will be lost when the worker
 * is terminated. For persistent storage, the client should implement
 * storage synchronization with the main thread.
 */
export class WebWorkerStorage implements ApexStorageInterface {
  private static instance: WebWorkerStorage;
  private storage: Map<string, any> = new Map();

  private constructor() {}

  /**
   * Gets the singleton instance of the web worker storage
   */
  static getInstance(): WebWorkerStorage {
    if (!WebWorkerStorage.instance) {
      WebWorkerStorage.instance = new WebWorkerStorage();
    }
    return WebWorkerStorage.instance;
  }

  /**
   * Gets a value from storage
   *
   * @param key The storage key
   * @returns The stored value or undefined if not found
   */
  async get(key: string): Promise<any> {
    return this.storage.get(key);
  }

  /**
   * Sets a value in storage
   *
   * @param key The storage key
   * @param value The value to store
   */
  async set(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  /**
   * Deletes a value from storage
   *
   * @param key The storage key to delete
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Clears all storage
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }

  /**
   * Checks if a key exists in storage
   *
   * @param key The storage key to check
   * @returns True if the key exists
   */
  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  /**
   * Gets all keys in storage
   *
   * @returns Array of all storage keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  /**
   * Gets the number of items in storage
   *
   * @returns The number of stored items
   */
  async size(): Promise<number> {
    return this.storage.size;
  }

  /**
   * Gets all values in storage
   *
   * @returns Array of all stored values
   */
  async values(): Promise<any[]> {
    return Array.from(this.storage.values());
  }

  /**
   * Gets all key-value pairs in storage
   *
   * @returns Array of [key, value] pairs
   */
  async entries(): Promise<[string, any][]> {
    return Array.from(this.storage.entries());
  }

  // ApexStorageInterface implementation
  async initialize(options?: Record<string, unknown>): Promise<void> {
    // No initialization needed for in-memory storage
  }

  async shutdown(): Promise<void> {
    this.storage.clear();
  }

  async storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean> {
    this.storage.set(`ast:${filePath}`, ast);
    return true;
  }

  async retrieveAst(filePath: string): Promise<ApexClassInfo[] | null> {
    return this.storage.get(`ast:${filePath}`) || null;
  }

  async storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean> {
    this.storage.set(`type:${typeName}`, typeInfo);
    return true;
  }

  async retrieveTypeInfo(typeName: string): Promise<TypeInfo | null> {
    return this.storage.get(`type:${typeName}`) || null;
  }

  async storeReference(reference: ApexReference): Promise<boolean> {
    const key = `ref:${reference.targetSymbol}:${reference.sourceFile}:${reference.line}:${reference.column}`;
    this.storage.set(key, reference);
    return true;
  }

  async findReferencesTo(targetSymbol: string): Promise<ApexReference[]> {
    const references: ApexReference[] = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(`ref:${targetSymbol}:`)) {
        references.push(value as ApexReference);
      }
    }
    return references;
  }

  async findReferencesFrom(sourceFile: string): Promise<ApexReference[]> {
    const references: ApexReference[] = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.includes(`:${sourceFile}:`)) {
        references.push(value as ApexReference);
      }
    }
    return references;
  }

  async clearFile(filePath: string): Promise<boolean> {
    const keysToDelete = Array.from(this.storage.keys()).filter((key) =>
      key.includes(filePath),
    );
    keysToDelete.forEach((key) => this.storage.delete(key));
    return true;
  }

  async persist(): Promise<void> {
    // No persistence needed for in-memory storage
  }

  async getDocument(uri: string): Promise<TextDocument | null> {
    return this.storage.get(`doc:${uri}`) || null;
  }

  async setDocument(uri: string, document: TextDocument): Promise<boolean> {
    this.storage.set(`doc:${uri}`, document);
    return true;
  }

  async setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean> {
    this.storage.set(`def:${symbolName}`, definition);
    return true;
  }

  async setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean> {
    this.storage.set(`refs:${symbolName}`, references);
    return true;
  }

  async getReferences(symbolName: string): Promise<ApexReference[]> {
    return this.storage.get(`refs:${symbolName}`) || [];
  }

  /**
   * Synchronizes storage with the main thread
   *
   * Note: Direct postMessage is blocked in VS Code web worker environment,
   * so this method is disabled for now. Storage remains in-memory only.
   *
   * @param data Optional data to sync (if not provided, sends current storage)
   */
  async syncWithMainThread(data?: Record<string, any>): Promise<void> {
    // Skip direct postMessage in VS Code web worker environment
    // Storage will remain in-memory only for now
    return;
  }

  /**
   * Loads storage data from the main thread
   *
   * @param data The storage data to load
   */
  async loadFromMainThread(data: Record<string, any>): Promise<void> {
    this.storage.clear();
    Object.entries(data).forEach(([key, value]) => {
      this.storage.set(key, value);
    });
  }
}
