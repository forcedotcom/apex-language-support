/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { SymbolTable } from '../types/symbol';
import { ApexSymbolManager } from './ApexSymbolManager';
import {
  ApexSymbolIndexingIntegration,
  SymbolProcessingOptions,
  TaskStatus,
  QueueStats,
} from './ApexSymbolIndexingService';

/**
 * Singleton manager for coordinating Apex symbol processing
 * across LSP services. Provides a centralized interface for queuing
 * symbol processing tasks with appropriate prioritization.
 */
export class ApexSymbolProcessingManager {
  private static instance: ApexSymbolProcessingManager | null = null;
  private readonly logger = getLogger();
  private readonly symbolManager: ApexSymbolManager;
  private readonly symbolIndexingService: ApexSymbolIndexingIntegration;
  private isInitialized = false;

  private constructor() {
    this.symbolManager = new ApexSymbolManager();
    this.symbolIndexingService = new ApexSymbolIndexingIntegration(
      this.symbolManager,
    );
    this.logger.debug(() => 'ApexSymbolProcessingManager initialized');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ApexSymbolProcessingManager {
    if (!this.instance) {
      // console.log(
      //   '🔧 [ApexSymbolProcessingManager] Creating singleton instance',
      // );
      this.instance = new ApexSymbolProcessingManager();
    }
    return this.instance;
  }

  /**
   * Initialize the symbol processing system
   */
  initialize(): void {
    if (this.isInitialized) {
      this.logger.warn(() => 'ApexSymbolProcessingManager already initialized');
      return;
    }

    this.isInitialized = true;
    this.logger.debug(
      () => 'ApexSymbolProcessingManager initialization complete',
    );
  }

  /**
   * Get the symbol manager instance
   */
  getSymbolManager(): ApexSymbolManager {
    const _instanceId = (this.symbolManager as any)._instanceId || 'unknown';
    // console.log(
    //   `🔧 [ApexSymbolProcessingManager] Returning symbol manager instance ${instanceId}`,
    // );
    return this.symbolManager;
  }

  /**
   * Store per-file comment associations via the underlying symbol manager.
   */
  setCommentAssociations(
    fileUri: string,
    associations: import('../parser/listeners/ApexCommentCollectorListener').CommentAssociation[],
  ): void {
    this.symbolManager.setCommentAssociations(fileUri, associations);
  }

  /**
   * Queue a symbol table for background processing
   * @param symbolTable The symbol table to process
   * @param fileUri The file path associated with the symbol table
   * @param options Processing options
   * @returns Task ID for tracking
   */
  processSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    options: SymbolProcessingOptions = {},
  ): string {
    if (!this.isInitialized) {
      this.logger.warn(
        () =>
          'ApexSymbolProcessingManager not initialized, processing synchronously',
      );

      // Debug: Check symbol table contents before processing
      const symbols = symbolTable.getAllSymbols
        ? symbolTable.getAllSymbols()
        : [];
      // console.log(
      //   `🔍 [ApexSymbolProcessingManager] Fallback: Processing ${symbols.length} symbols for ${fileUri}`,
      // );

      // Fallback to synchronous processing with error handling
      try {
        this.symbolManager.addSymbolTable(symbolTable, fileUri);

        // Debug: Check if symbols were actually added
        const stats = this.symbolManager.getStats();
        // console.log(
        //   '📊 [ApexSymbolProcessingManager] After addSymbolTable: ' +
        //     `${stats.totalFiles} files, ${stats.totalSymbols} symbols`,
        // );

        // Verify symbols are actually queryable
        if (symbols.length > 0 && stats.totalSymbols === 0) {
          // console.log(
          //   '⚠️ [ApexSymbolProcessingManager] Warning: Symbols processed but not persisted!',
          // );
          // Force add symbols individually as a backup
          for (const symbol of symbols) {
            this.symbolManager.addSymbol(symbol, fileUri, symbolTable);
          }
          const _finalStats = this.symbolManager.getStats();
          // console.log(
          //   '🔄 [ApexSymbolProcessingManager] After individual add: ' +
          //     `${finalStats.totalFiles} files, ${finalStats.totalSymbols} symbols`,
          // );
        }
      } catch (error) {
        // console.log(
        //   `❌ [ApexSymbolProcessingManager] Error in synchronous processing: ${error}`,
        // );
        this.logger.error(`Error in synchronous symbol processing: ${error}`);
      }

      return 'sync_fallback';
    }

    const taskId = this.symbolIndexingService.processSymbolTable(
      symbolTable,
      fileUri,
      options,
    );
    this.logger.debug(
      () => `Symbol processing queued: ${taskId} for ${fileUri}`,
    );
    return taskId;
  }

  /**
   * Schedule persistence of comment associations for a file.
   */
  scheduleCommentAssociations(
    fileUri: string,
    associations: import('../parser/listeners/ApexCommentCollectorListener').CommentAssociation[],
  ): string {
    // Delegate to the indexing service for background persistence
    // @ts-ignore - access integration
    return this.symbolIndexingService.scheduleCommentAssociations(
      fileUri,
      associations,
      'NORMAL',
    );
  }

  /**
   * Get the status of a processing task
   * @param taskId The task ID to check
   * @returns Task status
   */
  getTaskStatus(taskId: string): TaskStatus {
    if (taskId === 'sync_fallback') {
      return 'COMPLETED';
    }
    return this.symbolIndexingService.getTaskStatus(taskId);
  }

  /**
   * Get queue statistics
   * @returns Current queue statistics
   */
  getQueueStats(): QueueStats {
    return this.symbolIndexingService.getQueueStats();
  }

  /**
   * Check if symbol processing is available
   * @returns True if symbol processing is initialized and ready
   */
  isSymbolProcessingAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown the symbol processing system
   */
  shutdown(): void {
    if (this.symbolIndexingService) {
      this.symbolIndexingService.shutdown();
    }
    this.isInitialized = false;
    this.logger.debug(() => 'ApexSymbolProcessingManager shutdown complete');
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    if (this.instance) {
      this.instance.shutdown();
      this.instance = null;
    }
  }
}
