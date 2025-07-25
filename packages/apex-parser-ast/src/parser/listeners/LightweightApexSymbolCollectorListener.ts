/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbol,
  LightweightSymbol,
  toLightweightSymbol,
  fromLightweightSymbol,
  SymbolTable,
} from '../../types/symbol';

/**
 * Lightweight symbol collector that uses memory-optimized symbol storage
 *
 * This class provides a memory-efficient way to collect and store Apex symbols
 * using lightweight representations while maintaining full functionality through
 * lazy loading.
 */
export class LightweightApexSymbolCollectorListener {
  private readonly logger = getLogger();

  // Store lightweight symbols instead of full symbols
  private lightweightSymbols: HashMap<string, LightweightSymbol> =
    new HashMap();
  private symbolTable: SymbolTable;
  private currentFilePath: string = '';

  constructor(symbolTable?: SymbolTable) {
    this.symbolTable = symbolTable || new SymbolTable();
  }

  /**
   * Get the result as a SymbolTable with lightweight symbol storage
   */
  getResult(): SymbolTable {
    // Convert lightweight symbols back to full symbols for the result
    this.convertLightweightToFullSymbols();
    return this.symbolTable;
  }

  /**
   * Get lightweight symbols directly for memory-optimized operations
   */
  getLightweightSymbols(): HashMap<string, LightweightSymbol> {
    return this.lightweightSymbols;
  }

  /**
   * Add a symbol in lightweight format
   */
  addLightweightSymbol(symbol: ApexSymbol, filePath: string): void {
    const lightweight = toLightweightSymbol(symbol, filePath);
    this.lightweightSymbols.set(lightweight.id, lightweight);

    this.logger.debug(
      () => `Added lightweight symbol: ${symbol.name} (${lightweight.id})`,
    );
  }

  /**
   * Get a symbol by ID, converting from lightweight format if needed
   */
  getSymbol(symbolId: string): ApexSymbol | null {
    const lightweight = this.lightweightSymbols.get(symbolId);
    if (!lightweight) return null;

    return fromLightweightSymbol(lightweight, this.symbolTable);
  }

  /**
   * Find symbols by name using lightweight storage
   */
  findSymbolsByName(name: string): ApexSymbol[] {
    const results: ApexSymbol[] = [];

    for (const [, lightweight] of this.lightweightSymbols) {
      if (lightweight.name === name) {
        const symbol = this.getSymbol(lightweight.id);
        if (symbol) results.push(symbol);
      }
    }

    return results;
  }

  /**
   * Find symbols by FQN using lightweight storage
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    for (const [, lightweight] of this.lightweightSymbols) {
      if (lightweight.fqn === fqn) {
        return this.getSymbol(lightweight.id);
      }
    }
    return null;
  }

  /**
   * Find symbols in a specific file using lightweight storage
   */
  findSymbolsInFile(filePath: string): ApexSymbol[] {
    const results: ApexSymbol[] = [];

    for (const [, lightweight] of this.lightweightSymbols) {
      if (lightweight.filePath === filePath) {
        const symbol = this.getSymbol(lightweight.id);
        if (symbol) results.push(symbol);
      }
    }

    return results;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalSymbols: number;
    lightweightSize: number;
    estimatedFullSize: number;
    memoryReduction: number;
  } {
    const totalSymbols = this.lightweightSymbols.size;

    // Estimate memory usage
    const lightweightSize = JSON.stringify(
      Array.from(this.lightweightSymbols.values()),
    ).length;

    // Convert to full symbols for comparison
    const fullSymbols: ApexSymbol[] = [];
    for (const [, lightweight] of this.lightweightSymbols) {
      const symbol = this.getSymbol(lightweight.id);
      if (symbol) fullSymbols.push(symbol);
    }
    const estimatedFullSize = JSON.stringify(fullSymbols).length;

    const memoryReduction =
      ((estimatedFullSize - lightweightSize) / estimatedFullSize) * 100;

    return {
      totalSymbols,
      lightweightSize,
      estimatedFullSize,
      memoryReduction,
    };
  }

  /**
   * Convert all lightweight symbols back to full symbols for compatibility
   */
  private convertLightweightToFullSymbols(): void {
    this.logger.debug(
      () =>
        `Converting ${this.lightweightSymbols.size} lightweight symbols to full symbols`,
    );

    for (const [, lightweight] of this.lightweightSymbols) {
      const symbol = fromLightweightSymbol(lightweight, this.symbolTable);
      this.symbolTable.addSymbol(symbol);
    }

    this.logger.debug(
      () => 'Conversion complete. Symbol table now contains symbols',
    );
  }

  /**
   * Set the current file path for symbol creation
   */
  setCurrentFilePath(filePath: string): void {
    this.currentFilePath = filePath;
  }

  /**
   * Get the current file path
   */
  getCurrentFilePath(): string {
    return this.currentFilePath;
  }

  /**
   * Clear all lightweight symbols
   */
  clear(): void {
    this.lightweightSymbols.clear();
    this.symbolTable = new SymbolTable();
  }

  /**
   * Get all lightweight symbol IDs
   */
  getAllSymbolIds(): string[] {
    return Array.from(this.lightweightSymbols.keys());
  }

  /**
   * Check if a symbol exists by ID
   */
  hasSymbol(symbolId: string): boolean {
    return this.lightweightSymbols.has(symbolId);
  }

  /**
   * Remove a symbol by ID
   */
  removeSymbol(symbolId: string): boolean {
    return this.lightweightSymbols.delete(symbolId);
  }

  /**
   * Get the total number of symbols
   */
  getSymbolCount(): number {
    return this.lightweightSymbols.size;
  }
}
