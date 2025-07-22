/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-logging';
import {
  GlobalSymbolRegistry,
  GlobalSymbolEntry,
  SymbolLookupResult,
  ResolutionContext,
} from './GlobalSymbolRegistry';
import { SymbolTable } from '../types/symbol';

/**
 * Manager for accessing all symbols across all files
 * This class works with pre-compiled symbol data provided by the LSP services
 */
export class CrossFileSymbolManager {
  private readonly logger = getLogger();
  private globalRegistry: GlobalSymbolRegistry;
  private initialized = false;

  constructor() {
    this.globalRegistry = new GlobalSymbolRegistry();
  }

  /**
   * Initialize the manager with pre-compiled symbol data
   * @param symbolTables Map of file paths to their compiled symbol tables
   */
  async initialize(symbolTables?: Map<string, SymbolTable>): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.debug(() => 'Initializing CrossFileSymbolManager...');

    // If symbol tables are provided, register them
    if (symbolTables) {
      for (const [filePath, symbolTable] of symbolTables) {
        this.globalRegistry.registerSymbolTable(symbolTable, filePath);
      }
    }

    this.initialized = true;
    this.logger.debug(() => 'CrossFileSymbolManager initialized');
  }

  /**
   * Get all symbols across all files
   */
  getAllSymbols(): Map<string, GlobalSymbolEntry[]> {
    this.ensureInitialized();
    return this.globalRegistry.getAllSymbols();
  }

  /**
   * Get all symbols with a specific name
   */
  getSymbolsByName(symbolName: string): GlobalSymbolEntry[] {
    this.ensureInitialized();
    return this.globalRegistry.getAllSymbolsWithName(symbolName);
  }

  /**
   * Look up a symbol by name with context
   */
  lookupSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): SymbolLookupResult | null {
    this.ensureInitialized();
    return this.globalRegistry.lookupSymbol(symbolName, context);
  }

  /**
   * Get all files containing a specific symbol
   */
  getFilesForSymbol(symbolName: string): string[] {
    this.ensureInitialized();
    return this.globalRegistry.getFilesForSymbol(symbolName);
  }

  /**
   * Get all symbols in a specific file
   */
  getSymbolsInFile(filePath: string): string[] {
    this.ensureInitialized();
    return this.globalRegistry.getSymbolsInFile(filePath);
  }

  /**
   * Get the symbol table for a specific file
   */
  getSymbolTableForFile(filePath: string): SymbolTable | undefined {
    this.ensureInitialized();
    return this.globalRegistry.getSymbolTableForFile(filePath);
  }

  /**
   * Get all registered files
   */
  getAllFiles(): string[] {
    this.ensureInitialized();
    return this.globalRegistry.getAllFiles();
  }

  /**
   * Get statistics about the symbol registry
   */
  getStats() {
    this.ensureInitialized();
    return this.globalRegistry.getStats();
  }

  /**
   * Find all symbols matching a pattern (simple string contains)
   */
  findSymbolsByPattern(pattern: string): Map<string, GlobalSymbolEntry[]> {
    this.ensureInitialized();
    const allSymbols = this.globalRegistry.getAllSymbols();
    const result = new Map<string, GlobalSymbolEntry[]>();

    for (const [symbolName, entries] of allSymbols) {
      if (symbolName.toLowerCase().includes(pattern.toLowerCase())) {
        result.set(symbolName, entries);
      }
    }

    return result;
  }

  /**
   * Find all symbols of a specific kind
   */
  findSymbolsByKind(kind: string): Map<string, GlobalSymbolEntry[]> {
    this.ensureInitialized();
    const allSymbols = this.globalRegistry.getAllSymbols();
    const result = new Map<string, GlobalSymbolEntry[]>();

    for (const [symbolName, entries] of allSymbols) {
      const matchingEntries = entries.filter(
        (entry) => entry.symbol.kind === kind,
      );
      if (matchingEntries.length > 0) {
        result.set(symbolName, matchingEntries);
      }
    }

    return result;
  }

  /**
   * Get all classes across all files
   */
  getAllClasses(): Map<string, GlobalSymbolEntry[]> {
    return this.findSymbolsByKind('class');
  }

  /**
   * Get all methods across all files
   */
  getAllMethods(): Map<string, GlobalSymbolEntry[]> {
    return this.findSymbolsByKind('method');
  }

  /**
   * Get all fields across all files
   */
  getAllFields(): Map<string, GlobalSymbolEntry[]> {
    return this.findSymbolsByKind('field');
  }

  /**
   * Get all variables across all files
   */
  getAllVariables(): Map<string, GlobalSymbolEntry[]> {
    return this.findSymbolsByKind('variable');
  }

  /**
   * Refresh the global registry with new symbol data
   * @param symbolTables Map of file paths to their compiled symbol tables
   */
  async refresh(symbolTables?: Map<string, SymbolTable>): Promise<void> {
    this.logger.debug(() => 'Refreshing CrossFileSymbolManager...');

    // Clear the current registry
    this.globalRegistry.clear();

    // If new symbol tables are provided, register them
    if (symbolTables) {
      for (const [filePath, symbolTable] of symbolTables) {
        this.globalRegistry.registerSymbolTable(symbolTable, filePath);
      }
    }

    this.logger.debug(() => 'CrossFileSymbolManager refreshed');
  }

  /**
   * Add a single symbol table to the registry
   * @param filePath The file path
   * @param symbolTable The compiled symbol table
   */
  addSymbolTable(filePath: string, symbolTable: SymbolTable): void {
    this.ensureInitialized();
    this.globalRegistry.registerSymbolTable(symbolTable, filePath);
  }

  /**
   * Remove a file's symbols from the registry
   * @param filePath The file path to remove
   */
  removeFile(filePath: string): void {
    this.ensureInitialized();
    this.globalRegistry.removeFile(filePath);
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    }
  }
}
