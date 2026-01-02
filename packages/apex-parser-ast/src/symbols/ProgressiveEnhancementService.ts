/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  CompilationOptions,
} from '../parser/compilerService';
import { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';
import {
  SymbolTable,
  ApexSymbol,
  SymbolKind,
} from '../types/symbol';
import { ApexSymbolManager } from './ApexSymbolManager';
import { ApexSymbolGraph } from './ApexSymbolGraph';

/**
 * Result of an enhancement operation
 */
export interface EnhancementResult {
  success: boolean;
  symbolTable: SymbolTable | null;
  detailLevel: DetailLevel;
  symbolFound?: ApexSymbol | null;
  message?: string;
}

/**
 * Service for progressively enhancing symbol tables on demand.
 * Implements a cost-ordered strategy from least to most expensive operations.
 *
 * Enhancement Steps (Least to Most Expensive):
 * 1. Check if symbol exists in current detail level (O(1) lookup)
 * 2. Enrich current file with next detail level (single file parse tree walk)
 * 3. Check cross-file references (graph lookup)
 * 4. Parse target file with minimum detail level (parse + single listener)
 * 5. Enrich target file progressively (multiple parse tree walks)
 * 6. Full parse and enrichment (complete recompilation)
 */
export class ProgressiveEnhancementService {
  private readonly logger = getLogger();
  private readonly compilerService: CompilerService;
  private readonly symbolManager: ApexSymbolManager;
  private readonly symbolGraph: ApexSymbolGraph;

  /**
   * Detail level ordering for comparison
   */
  private readonly detailLevelOrder: Record<DetailLevel, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };

  constructor(
    compilerService: CompilerService,
    symbolManager: ApexSymbolManager,
    symbolGraph: ApexSymbolGraph,
  ) {
    this.compilerService = compilerService;
    this.symbolManager = symbolManager;
    this.symbolGraph = symbolGraph;
  }

  /**
   * Check if a detail level is higher than another
   */
  private isDetailLevelHigher(
    level1: DetailLevel,
    level2: DetailLevel,
  ): boolean {
    return (
      (this.detailLevelOrder[level1] || 0) >
      (this.detailLevelOrder[level2] || 0)
    );
  }

  /**
   * Get the next detail level to apply
   */
  private getNextDetailLevel(currentLevel: DetailLevel): DetailLevel | null {
    switch (currentLevel) {
      case 'public-api':
        return 'protected';
      case 'protected':
        return 'private';
      case 'private':
        return 'full';
      case 'full':
        return null; // Already at maximum
      default:
        return 'public-api'; // Start from beginning
    }
  }

  /**
   * Get listeners needed to reach target detail level from current level
   */
  private getListenersNeeded(
    currentLevel: DetailLevel | undefined,
    targetLevel: DetailLevel,
  ): DetailLevel[] {
    const listeners: DetailLevel[] = [];

    // If no current level, start from public-api
    const startLevel = currentLevel || 'public-api';

    // If target is lower or equal to current, no listeners needed
    if (
      currentLevel &&
      !this.isDetailLevelHigher(targetLevel, currentLevel)
    ) {
      return [];
    }

    // Build list of listeners needed
    let level: DetailLevel | null = startLevel;
    while (level && this.isDetailLevelHigher(targetLevel, level)) {
      const next = this.getNextDetailLevel(level);
      if (next) {
        listeners.push(next);
        level = next;
      } else {
        break;
      }
    }

    return listeners;
  }

  /**
   * Enhance symbol table for a file up to target detail level.
   * Reuses parse tree if available via DocumentStateCache, otherwise parses fresh.
   *
   * @param fileUri The file URI to enhance
   * @param fileContent The file content (required)
   * @param currentSymbolTable The current symbol table (optional, will be created if not provided)
   * @param currentDetailLevel The current detail level (optional)
   * @param targetDetailLevel The target detail level to reach
   * @param options Compilation options
   * @returns Enhancement result with updated symbol table and detail level
   */
  enhanceSymbolTableForFile(
    fileUri: string,
    fileContent: string,
    currentSymbolTable: SymbolTable | null,
    currentDetailLevel: DetailLevel | undefined,
    targetDetailLevel: DetailLevel,
    options: CompilationOptions = {},
  ): EnhancementResult {
    this.logger.debug(
      () =>
        `Enhancing ${fileUri} from ${currentDetailLevel || 'none'} to ${targetDetailLevel}`,
    );

    // Check if already at or beyond target level
    if (
      currentDetailLevel &&
      !this.isDetailLevelHigher(targetDetailLevel, currentDetailLevel)
    ) {
      return {
        success: true,
        symbolTable: currentSymbolTable,
        detailLevel: currentDetailLevel,
        message: `Already at or beyond target detail level ${targetDetailLevel}`,
      };
    }

    // Get listeners needed
    const listenersNeeded = this.getListenersNeeded(
      currentDetailLevel,
      targetDetailLevel,
    );

    if (listenersNeeded.length === 0) {
      // If no listeners needed but we don't have a symbol table, create one with public-api
      if (!currentSymbolTable && targetDetailLevel === 'public-api') {
        // Need to create initial symbol table with public-api listener
        const symbolTable = new SymbolTable();
        symbolTable.setFileUri(fileUri);
        const result = this.compilerService.compileLayered(
          fileContent,
          fileUri,
          ['public-api'],
          symbolTable,
          {
            ...options,
            collectReferences: options.collectReferences !== false,
            resolveReferences: options.resolveReferences !== false,
          },
        );
        return {
          success: true,
          symbolTable: result.result,
          detailLevel: 'public-api',
          message: 'Enhanced to public-api using listeners: public-api',
        };
      }
      return {
        success: true,
        symbolTable: currentSymbolTable,
        detailLevel: currentDetailLevel || 'public-api',
        message: 'No additional listeners needed',
      };
    }

    // Create or reuse symbol table
    const symbolTable = currentSymbolTable || new SymbolTable();
    symbolTable.setFileUri(fileUri);

    try {
      // Use compileLayered to apply listeners incrementally
      // Note: parse tree reuse will be added in a future enhancement
      const result = this.compilerService.compileLayered(
        fileContent,
        fileUri,
        listenersNeeded,
        symbolTable,
        {
          ...options,
          collectReferences: options.collectReferences !== false,
          resolveReferences: options.resolveReferences !== false,
        },
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          () =>
            `Errors during enhancement of ${fileUri}: ${result.errors.length} errors`,
        );
      }

      return {
        success: true,
        symbolTable: result.result,
        detailLevel: targetDetailLevel,
        message: `Enhanced to ${targetDetailLevel} using listeners: ${listenersNeeded.join(', ')}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        () => `Failed to enhance ${fileUri}: ${errorMessage}`,
      );
      return {
        success: false,
        symbolTable: currentSymbolTable,
        detailLevel: currentDetailLevel || 'public-api',
        message: `Enhancement failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Enhance symbol table until a symbol is found or all layers exhausted.
   * Applies enhancement steps progressively from least to most expensive.
   *
   * @param fileUri The file URI to search in
   * @param symbolName The symbol name to find
   * @param fileContent The file content (required)
   * @param currentSymbolTable Optional current symbol table
   * @param currentDetailLevel Optional current detail level
   * @param options Compilation options
   * @returns The symbol if found, null otherwise
   */
  enhanceUntilFound(
    fileUri: string,
    symbolName: string,
    fileContent: string,
    currentSymbolTable: SymbolTable | null,
    currentDetailLevel: DetailLevel | undefined,
    options: CompilationOptions = {},
  ): ApexSymbol | null {
    this.logger.debug(
      () =>
        `Enhancing until symbol "${symbolName}" found in ${fileUri} (current level: ${currentDetailLevel || 'none'})`,
    );

    // Step 1: Check if symbol exists in current detail level (O(1) lookup)
    if (currentSymbolTable) {
      const existingSymbol = currentSymbolTable
        .getAllSymbols()
        .find((s) => s.name === symbolName);

      if (existingSymbol) {
        this.logger.debug(
          () =>
            `Symbol "${symbolName}" found in current detail level ${currentDetailLevel || 'none'}`,
        );
        return existingSymbol;
      }
    }

    // Step 2: Enrich current file progressively
    let symbolTable = currentSymbolTable;
    let detailLevel = currentDetailLevel;

    // Try each detail level until symbol is found or all exhausted
    const levelsToTry: DetailLevel[] = ['public-api', 'protected', 'private', 'full'];
    const startIndex = detailLevel
      ? levelsToTry.indexOf(detailLevel) + 1
      : 0;

    for (let i = startIndex; i < levelsToTry.length; i++) {
      const targetLevel = levelsToTry[i];

      this.logger.debug(
        () =>
          `Trying to enhance ${fileUri} to ${targetLevel} to find "${symbolName}"`,
      );

      const result = this.enhanceSymbolTableForFile(
        fileUri,
        fileContent,
        symbolTable,
        detailLevel,
        targetLevel,
        options,
      );

      if (!result.success) {
        this.logger.warn(
          () =>
            `Failed to enhance ${fileUri} to ${targetLevel}: ${result.message}`,
        );
        continue;
      }

      symbolTable = result.symbolTable;
      detailLevel = result.detailLevel;

      // Check if symbol is now found
      if (symbolTable) {
        const foundSymbol = symbolTable
          .getAllSymbols()
          .find((s) => s.name === symbolName);

        if (foundSymbol) {
          this.logger.debug(
            () =>
              `Symbol "${symbolName}" found after enhancing to ${detailLevel}`,
          );
          return foundSymbol;
        }
      }
    }

    // Step 3: Check cross-file references (if symbol manager/graph available)
    if (this.symbolManager) {
      this.logger.debug(
        () =>
          `Symbol "${symbolName}" not found in ${fileUri}, checking cross-file references`,
      );

      // Try to find symbol in other files (may have public API from other files)
      const crossFileSymbols = this.symbolManager.findSymbolByName(symbolName);
      if (crossFileSymbols.length > 0) {
        this.logger.debug(
          () =>
            `Found ${crossFileSymbols.length} cross-file references for "${symbolName}"`,
        );
        // Return the first match (could be enhanced to return best match)
        return crossFileSymbols[0];
      }
    }

    // Symbol not found after all enhancement steps
    this.logger.debug(
      () =>
        `Symbol "${symbolName}" not found in ${fileUri} after all enhancement steps`,
    );
    return null;
  }

  /**
   * Determine what detail level is needed to find a symbol.
   * Returns the minimum detail level required, or null if not determinable.
   *
   * @param fileUri The file URI
   * @param symbolName The symbol name
   * @param currentDetailLevel The current detail level
   * @returns The minimum detail level needed, or null if not determinable
   */
  determineRequiredDetailLevel(
    fileUri: string,
    symbolName: string,
    currentDetailLevel: DetailLevel | undefined,
  ): DetailLevel | null {
    // This is a heuristic - in practice, we'd need to parse and check visibility
    // For now, return the next level if we have a current level
    if (currentDetailLevel) {
      const next = this.getNextDetailLevel(currentDetailLevel);
      return next || 'full';
    }

    // Start from public-api if no current level
    return 'public-api';
  }

  /**
   * Get the cost estimate for enhancing to a target detail level
   * @param currentLevel Current detail level
   * @param targetLevel Target detail level
   * @returns Cost estimate (1 = cheapest, 6 = most expensive)
   */
  getEnhancementCost(
    currentLevel: DetailLevel | undefined,
    targetLevel: DetailLevel,
  ): number {
    if (
      currentLevel &&
      !this.isDetailLevelHigher(targetLevel, currentLevel)
    ) {
      return 1; // Already at or beyond target
    }

    const listenersNeeded = this.getListenersNeeded(currentLevel, targetLevel);
    // If no current level and target is public-api, we need to apply public-api listener (cost 2)
    // Otherwise, cost is number of listeners needed + 1 for base
    if (!currentLevel && targetLevel === 'public-api') {
      return 2; // Need to apply public-api listener
    }
    return listenersNeeded.length + 1; // +1 for base cost
  }
}

