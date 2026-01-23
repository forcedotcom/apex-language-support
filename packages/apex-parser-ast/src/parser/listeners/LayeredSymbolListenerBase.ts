/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';

import { BaseApexParserListener } from './BaseApexParserListener';
import {
  SymbolTable,
  ApexSymbol,
  SymbolVisibility,
  SymbolModifiers,
} from '../../types/symbol';

/**
 * Detail level for layered symbol collection
 */
export type DetailLevel = 'public-api' | 'protected' | 'private' | 'full';

/**
 * Abstract base class for layered symbol listeners.
 * Provides shared functionality for visibility filtering and symbol enrichment.
 * Subclasses implement specific listener methods to capture symbols at their detail level.
 */
export abstract class LayeredSymbolListenerBase extends BaseApexParserListener<SymbolTable> {
  protected readonly logger = getLogger();
  protected symbolTable: SymbolTable;
  protected currentFilePath: string = '';

  /**
   * Creates a new instance of the layered symbol listener.
   * @param symbolTable Optional existing symbol table to enrich. If not provided, a new one will be created.
   */
  constructor(symbolTable?: SymbolTable) {
    super();
    this.symbolTable = symbolTable || new SymbolTable();
  }

  /**
   * Get the detail level this listener captures
   * @returns The detail level (e.g., 'public-api', 'protected', 'private')
   */
  abstract getDetailLevel(): DetailLevel;

  /**
   * Get the collected symbol table
   */
  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Set the current file path for this compilation
   */
  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
    this.logger.debug(() => `Set current file path to: ${fileUri}`);
  }

  /**
   * Check if a symbol with the given visibility should be processed by this listener
   * @param visibility The visibility modifier of the symbol
   * @returns True if this listener should process symbols with this visibility
   */
  protected shouldProcessSymbol(visibility: SymbolVisibility): boolean {
    const detailLevel = this.getDetailLevel();
    switch (detailLevel) {
      case 'public-api':
        return (
          visibility === SymbolVisibility.Public ||
          visibility === SymbolVisibility.Global
        );
      case 'protected':
        return (
          visibility === SymbolVisibility.Protected ||
          visibility === SymbolVisibility.Default
        );
      case 'private':
        return visibility === SymbolVisibility.Private;
      case 'full':
        return true; // Process all visibility levels
      default:
        return false;
    }
  }

  /**
   * Check if modifiers indicate a symbol should be processed
   * @param modifiers The symbol modifiers
   * @returns True if this listener should process symbols with these modifiers
   */
  protected shouldProcessByModifiers(modifiers: SymbolModifiers): boolean {
    return this.shouldProcessSymbol(modifiers.visibility);
  }

  /**
   * Add a symbol to the symbol table with detail level tracking
   * @param symbol The symbol to add
   * @param currentScope The current scope (optional)
   */
  protected addSymbolWithDetailLevel(
    symbol: ApexSymbol,
    currentScope?: ApexSymbol | null,
  ): void {
    // Set detail level on symbol
    symbol._detailLevel = this.getDetailLevel();

    // Add to symbol table (which handles enrichment if symbol already exists)
    if (currentScope && 'scopeType' in currentScope) {
      this.symbolTable.addSymbol(symbol, currentScope as any);
    } else {
      this.symbolTable.addSymbol(symbol, null);
    }
  }

  /**
   * Enrich an existing symbol with additional data from a new symbol
   * This is called when a symbol with higher detail level is being added
   * @param existing The existing symbol to enrich
   * @param newData The new symbol data to merge in
   * @returns The enriched symbol (may be the existing symbol or a new one)
   */
  protected enrichSymbol(
    existing: ApexSymbol,
    newData: Partial<ApexSymbol>,
  ): ApexSymbol {
    // Merge properties from newData into existing symbol
    // Preserve existing ID, key, and parentId
    Object.assign(existing, {
      ...newData,
      id: existing.id,
      key: existing.key,
      parentId: newData.parentId ?? existing.parentId,
      _detailLevel: this.getDetailLevel(), // Update detail level
    });

    return existing;
  }

  /**
   * Create a new instance of this listener with a fresh SymbolTable
   * Subclasses should override this to return their specific type
   */
  createNewInstance(): BaseApexParserListener<SymbolTable> {
    const newTable = new SymbolTable();
    return new (this.constructor as any)(newTable);
  }

  /**
   * Get the current detail level order for comparison
   * Higher numbers indicate more detail
   */
  protected getDetailLevelOrder(): Record<DetailLevel, number> {
    return {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };
  }

  /**
   * Check if a detail level is higher than another
   * @param level1 First detail level
   * @param level2 Second detail level
   * @returns True if level1 has more detail than level2
   */
  protected isDetailLevelHigher(
    level1: DetailLevel,
    level2: DetailLevel,
  ): boolean {
    const order = this.getDetailLevelOrder();
    return (order[level1] || 0) > (order[level2] || 0);
  }
}
