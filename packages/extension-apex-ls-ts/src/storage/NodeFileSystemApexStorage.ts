/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClassInfo } from '@salesforce/apex-lsp-parser-ast/dist/parser/listeners/ApexStructureListener.js';
import type { TypeInfo } from '@salesforce/apex-lsp-parser-ast/dist/types/typeInfo.js';
import type {
  ApexReference,
  ApexStorageInterface,
} from '@salesforce/apex-lsp-compliant-services/dist/storage/ApexStorageInterface.js';

/**
 * Implementation of ApexStorageInterface for Node.js environments (VSCode extension).
 * This is a no-op implementation that doesn't actually store anything persistently.
 * In a real implementation, this would use Node.js filesystem APIs or a database.
 */
export class NodeFileSystemApexStorage implements ApexStorageInterface {
  // In-memory storage
  private astMap: Map<string, ApexClassInfo[]> = new Map();
  private typeInfoMap: Map<string, TypeInfo> = new Map();
  private references: ApexReference[] = [];
  private initialized = false;

  /**
   * Initialize the storage system
   * @param options Configuration options for storage
   */
  async initialize(options?: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would:
    // - Create or open storage directory
    // - Initialize database connections
    // - Load existing data into memory

    console.log('Initializing Node.js storage with options:', options);
    this.initialized = true;
  }

  /**
   * Close and clean up the storage system
   */
  async shutdown(): Promise<void> {
    // In a real implementation, this would:
    // - Close file handles
    // - Save any pending data
    // - Close database connections

    console.log('Shutting down Node.js storage');
    this.initialized = false;
  }

  /**
   * Store AST for a specified Apex file
   */
  async storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // In a real implementation, this would serialize and store
    // the AST to disk or database
    this.astMap.set(filePath, ast);
    return true;
  }

  /**
   * Retrieve AST for a specified Apex file
   */
  async retrieveAst(filePath: string): Promise<ApexClassInfo[] | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.astMap.get(filePath) || null;
  }

  /**
   * Store type information for a specific type
   */
  async storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.typeInfoMap.set(typeName, typeInfo);
    return true;
  }

  /**
   * Retrieve type information for a specific type
   */
  async retrieveTypeInfo(typeName: string): Promise<TypeInfo | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.typeInfoMap.get(typeName) || null;
  }

  /**
   * Store a reference between symbols
   */
  async storeReference(reference: ApexReference): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.references.push(reference);
    return true;
  }

  /**
   * Retrieve all references to a specific symbol
   */
  async findReferencesTo(targetSymbol: string): Promise<ApexReference[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.references.filter((ref) => ref.targetSymbol === targetSymbol);
  }

  /**
   * Retrieve all references from a specific file
   */
  async findReferencesFrom(sourceFile: string): Promise<ApexReference[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.references.filter((ref) => ref.sourceFile === sourceFile);
  }

  /**
   * Delete all stored data for a specific file
   */
  async clearFile(filePath: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.astMap.delete(filePath);
    this.references = this.references.filter(
      (ref) => ref.sourceFile !== filePath,
    );
    return true;
  }

  /**
   * Persist all in-memory changes to storage
   */
  async persist(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // In a real implementation, this would flush all in-memory
    // data to disk or database
    console.log('Persisting data to Node.js storage');
  }
}
