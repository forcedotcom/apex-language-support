/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for type references between Apex symbols
 */
export interface ApexReference {
  /** Source file where the reference originates */
  sourceFile: string;

  /** Target type or symbol being referenced */
  targetSymbol: string;

  /** Line number in source file */
  line: number;

  /** Column number in source file */
  column: number;

  /** Reference type (e.g., 'method-call', 'field-access', 'type-reference') */
  referenceType: string;

  /** Any additional context for the reference */
  context?: Record<string, unknown>;
}

/**
 * Interface for persistent storage of Apex language artifacts
 * This supports storing and retrieving AST, symbol tables, and references
 * between symbols.
 */
export interface ApexStorageInterface {
  /**
   * Initialize the storage system
   * @param options Configuration options for the storage
   * @returns Promise that resolves when initialization is complete
   */
  initialize(options?: Record<string, unknown>): Promise<void>;

  /**
   * Close and clean up the storage system
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;

  /**
   * Store AST for a specified Apex file
   * @param filePath Path to the Apex file
   * @param ast AST structure to store
   * @returns Promise resolving to success boolean
   */
  storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean>;

  /**
   * Retrieve AST for a specified Apex file
   * @param filePath Path to the Apex file
   * @returns Promise resolving to the AST or null if not found
   */
  retrieveAst(filePath: string): Promise<ApexClassInfo[] | null>;

  /**
   * Store type information for a specific type
   * @param typeName Fully qualified name of the type
   * @param typeInfo Type information to store
   * @returns Promise resolving to success boolean
   */
  storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean>;

  /**
   * Retrieve type information for a specific type
   * @param typeName Fully qualified name of the type
   * @returns Promise resolving to type info or null if not found
   */
  retrieveTypeInfo(typeName: string): Promise<TypeInfo | null>;

  /**
   * Store a reference between symbols
   * @param reference Reference information to store
   * @returns Promise resolving to success boolean
   */
  storeReference(reference: ApexReference): Promise<boolean>;

  /**
   * Retrieve all references to a specific symbol
   * @param targetSymbol Symbol to find references for
   * @returns Promise resolving to array of references
   */
  findReferencesTo(targetSymbol: string): Promise<ApexReference[]>;

  /**
   * Retrieve all references from a specific file
   * @param sourceFile Source file to find references from
   * @returns Promise resolving to array of references
   */
  findReferencesFrom(sourceFile: string): Promise<ApexReference[]>;

  /**
   * Delete all stored data for a specific file
   * @param filePath Path to the file to clear data for
   * @returns Promise resolving to success boolean
   */
  clearFile(filePath: string): Promise<boolean>;

  /**
   * Persist all in-memory changes to storage
   * @returns Promise resolving when persistence is complete
   */
  persist(): Promise<void>;
}
