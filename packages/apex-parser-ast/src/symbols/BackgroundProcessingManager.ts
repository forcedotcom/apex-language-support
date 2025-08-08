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
  EffectBackgroundProcessingIntegration,
  BackgroundProcessingOptions,
  TaskStatus,
  QueueStats,
} from './EffectBackgroundProcessingService';

/**
 * Singleton manager for coordinating background symbol processing
 * across LSP services. Provides a centralized interface for queuing
 * symbol processing tasks with appropriate prioritization.
 */
export class BackgroundProcessingManager {
  private static instance: BackgroundProcessingManager | null = null;
  private readonly logger = getLogger();
  private readonly symbolManager: ApexSymbolManager;
  private readonly backgroundProcessor: EffectBackgroundProcessingIntegration;
  private isInitialized = false;

  private constructor() {
    this.symbolManager = new ApexSymbolManager();
    this.backgroundProcessor = new EffectBackgroundProcessingIntegration(
      this.symbolManager,
    );
    this.logger.debug(() => 'BackgroundProcessingManager initialized');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): BackgroundProcessingManager {
    if (!this.instance) {
      this.instance = new BackgroundProcessingManager();
    }
    return this.instance;
  }

  /**
   * Initialize the background processing system
   */
  initialize(): void {
    if (this.isInitialized) {
      this.logger.warn(() => 'BackgroundProcessingManager already initialized');
      return;
    }

    this.isInitialized = true;
    this.logger.debug(
      () => 'BackgroundProcessingManager initialization complete',
    );
  }

  /**
   * Get the symbol manager instance
   */
  getSymbolManager(): ApexSymbolManager {
    return this.symbolManager;
  }

  /**
   * Queue a symbol table for background processing
   * @param symbolTable The symbol table to process
   * @param filePath The file path associated with the symbol table
   * @param options Processing options
   * @returns Task ID for tracking
   */
  processSymbolTable(
    symbolTable: SymbolTable,
    filePath: string,
    options: BackgroundProcessingOptions = {},
  ): string {
    if (!this.isInitialized) {
      this.logger.warn(
        () =>
          'BackgroundProcessingManager not initialized, processing synchronously',
      );
      // Fallback to synchronous processing
      this.symbolManager.addSymbolTable(symbolTable, filePath);
      return 'sync_fallback';
    }

    const taskId = this.backgroundProcessor.processSymbolTable(
      symbolTable,
      filePath,
      options,
    );
    this.logger.debug(
      () => `Symbol processing queued: ${taskId} for ${filePath}`,
    );
    return taskId;
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
    return this.backgroundProcessor.getTaskStatus(taskId);
  }

  /**
   * Get queue statistics
   * @returns Current queue statistics
   */
  getQueueStats(): QueueStats {
    return this.backgroundProcessor.getQueueStats();
  }

  /**
   * Check if background processing is available
   * @returns True if background processing is initialized and ready
   */
  isBackgroundProcessingAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown the background processing system
   */
  shutdown(): void {
    if (this.backgroundProcessor) {
      this.backgroundProcessor.shutdown();
    }
    this.isInitialized = false;
    this.logger.debug(() => 'BackgroundProcessingManager shutdown complete');
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
