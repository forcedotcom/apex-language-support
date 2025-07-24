/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// HashMap replaced with native Map
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol, SymbolTable } from '../types/symbol';

/**
 * Context for symbol resolution
 */
export interface ResolutionContext {
  sourceFile?: string;
  expectedNamespace?: string;
  currentScope?: string;
  isStatic?: boolean;
}

/**
 * Entry in the global symbol registry
 */
export interface GlobalSymbolEntry {
  symbol: ApexSymbol;
  filePath: string;
  symbolTable: SymbolTable;
  lastUpdated: number;
}

/**
 * Result of a symbol lookup
 */
export interface SymbolLookupResult {
  symbol: ApexSymbol;
  filePath: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: GlobalSymbolEntry[];
}

/**
 * Global symbol registry that provides unified access to all symbols across all files
 */
export class GlobalSymbolRegistry {
  private readonly logger = getLogger();

  // Primary storage: symbol name -> symbol entries
  private symbolMap: Map<string, GlobalSymbolEntry[]> = new Map();

  // File mapping: file path -> symbol table
  private fileToSymbolTable: Map<string, SymbolTable> = new Map();

  // Symbol to file mapping: symbol key -> file paths
  private symbolToFiles: Map<string, string[]> = new Map();

  // File to symbols mapping: file path -> symbol names
  private fileToSymbols: Map<string, string[]> = new Map();

  /**
   * Register a symbol from a specific file
   */
  registerSymbol(
    symbol: ApexSymbol,
    filePath: string,
    symbolTable: SymbolTable,
  ): void {
    const symbolName = symbol.name;

    // Create the entry
    const entry: GlobalSymbolEntry = {
      symbol,
      filePath,
      symbolTable,
      lastUpdated: Date.now(),
    };

    // Add to symbol map
    const existingEntries = this.symbolMap.get(symbolName) || [];
    existingEntries.push(entry);
    this.symbolMap.set(symbolName, existingEntries);

    // Add to file mappings
    this.fileToSymbolTable.set(filePath, symbolTable);

    // Update symbol to files mapping
    const symbolKey = this.getSymbolKey(symbol);
    const existingFiles = this.symbolToFiles.get(symbolKey) || [];
    if (!existingFiles.includes(filePath)) {
      existingFiles.push(filePath);
      this.symbolToFiles.set(symbolKey, existingFiles);
    }

    // Update file to symbols mapping
    const fileSymbols = this.fileToSymbols.get(filePath) || [];
    if (!fileSymbols.includes(symbolName)) {
      fileSymbols.push(symbolName);
      this.fileToSymbols.set(filePath, fileSymbols);
    }

    this.logger.debug(
      () => `Registered symbol: ${symbolName} from ${filePath}`,
    );
  }

  /**
   * Register all symbols from a symbol table
   */
  registerSymbolTable(symbolTable: SymbolTable, filePath: string): void {
    const collectSymbols = (scope: any): ApexSymbol[] => {
      const symbols: ApexSymbol[] = [];

      // Get symbols from current scope
      symbols.push(...scope.getAllSymbols());

      // Recursively collect from child scopes
      scope.getChildren().forEach((childScope: any) => {
        symbols.push(...collectSymbols(childScope));
      });

      return symbols;
    };

    const allSymbols = collectSymbols(symbolTable.getCurrentScope());

    allSymbols.forEach((symbol) => {
      this.registerSymbol(symbol, filePath, symbolTable);
    });

    this.logger.debug(
      () => `Registered ${allSymbols.length} symbols from ${filePath}`,
    );
  }

  /**
   * Look up a symbol by name
   */
  lookupSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): SymbolLookupResult | null {
    const entries = this.symbolMap.get(symbolName);

    if (!entries || entries.length === 0) {
      return null;
    }

    if (entries.length === 1) {
      // Unambiguous symbol
      const entry = entries[0];
      return {
        symbol: entry.symbol,
        filePath: entry.filePath,
        confidence: 1.0,
        isAmbiguous: false,
      };
    }

    // Ambiguous symbol - need to resolve
    const resolved = this.resolveAmbiguousSymbol(symbolName, entries, context);
    return {
      symbol: resolved.symbol,
      filePath: resolved.filePath,
      confidence: resolved.confidence,
      isAmbiguous: true,
      candidates: entries,
    };
  }

  /**
   * Get all symbols with a given name
   */
  getAllSymbolsWithName(symbolName: string): GlobalSymbolEntry[] {
    return this.symbolMap.get(symbolName) || [];
  }

  /**
   * Get all files containing a symbol
   */
  getFilesForSymbol(symbolName: string): string[] {
    const entries = this.symbolMap.get(symbolName);
    return entries ? entries.map((entry) => entry.filePath) : [];
  }

  /**
   * Get all symbols in a file
   */
  getSymbolsInFile(filePath: string): string[] {
    return this.fileToSymbols.get(filePath) || [];
  }

  /**
   * Get the symbol table for a file
   */
  getSymbolTableForFile(filePath: string): SymbolTable | undefined {
    return this.fileToSymbolTable.get(filePath);
  }

  /**
   * Get all registered symbols
   */
  getAllSymbols(): Map<string, GlobalSymbolEntry[]> {
    const result = new Map<string, GlobalSymbolEntry[]>();

    // Convert HashMap to Map properly
    const entries = this.symbolMap.entries();
    for (const [symbolName, symbolEntries] of entries) {
      if (symbolEntries) {
        result.set(symbolName, symbolEntries);
      }
    }
    return result;
  }

  /**
   * Get all registered files
   */
  getAllFiles(): string[] {
    return Array.from(this.fileToSymbolTable.keys());
  }

  /**
   * Remove all symbols from a file
   */
  removeFile(filePath: string): void {
    // Remove from file mappings
    this.fileToSymbolTable.delete(filePath);

    // Remove symbols from symbol map
    const fileSymbols = this.fileToSymbols.get(filePath) || [];
    fileSymbols.forEach((symbolName) => {
      const entries = this.symbolMap.get(symbolName) || [];
      const filteredEntries = entries.filter(
        (entry) => entry.filePath !== filePath,
      );

      if (filteredEntries.length === 0) {
        this.symbolMap.delete(symbolName);
      } else {
        this.symbolMap.set(symbolName, filteredEntries);
      }
    });

    // Remove from file to symbols mapping
    this.fileToSymbols.delete(filePath);

    this.logger.debug(() => `Removed file: ${filePath}`);
  }

  /**
   * Clear all symbols
   */
  clear(): void {
    this.symbolMap.clear();
    this.fileToSymbolTable.clear();
    this.symbolToFiles.clear();
    this.fileToSymbols.clear();
    this.logger.debug(() => 'Cleared all symbols from registry');
  }

  /**
   * Get statistics about the registry
   */
  getStats(): {
    totalSymbols: number;
    totalFiles: number;
    ambiguousSymbols: number;
    uniqueSymbolNames: number;
  } {
    let totalSymbols = 0;
    let ambiguousSymbols = 0;

    // Use keys() and get() instead of entries() to avoid iteration issues
    const symbolNames = Array.from(this.symbolMap.keys());

    for (const symbolName of symbolNames) {
      const entries = this.symbolMap.get(symbolName);
      if (entries) {
        totalSymbols += entries.length;
        if (entries.length > 1) {
          ambiguousSymbols++;
        }
      }
    }

    return {
      totalSymbols,
      totalFiles: this.fileToSymbolTable.size,
      ambiguousSymbols,
      uniqueSymbolNames: this.symbolMap.size,
    };
  }

  /**
   * Resolve ambiguous symbol using context
   */
  private resolveAmbiguousSymbol(
    symbolName: string,
    entries: GlobalSymbolEntry[],
    context?: ResolutionContext,
  ): { symbol: ApexSymbol; filePath: string; confidence: number } {
    // Simple resolution strategy - can be enhanced
    // For now, return the first entry with medium confidence
    const entry = entries[0];
    return {
      symbol: entry.symbol,
      filePath: entry.filePath,
      confidence: 0.5, // Medium confidence for ambiguous symbols
    };
  }

  /**
   * Generate a unique key for a symbol
   */
  private getSymbolKey(symbol: ApexSymbol): string {
    return `${symbol.kind}:${symbol.name}`;
  }
}
