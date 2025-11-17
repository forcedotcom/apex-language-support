/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbolProcessingManager } from '@salesforce/apex-lsp-parser-ast';

/**
 * Service for initializing background processing when the LSP server starts
 */
export class BackgroundProcessingInitializationService {
  private static instance: BackgroundProcessingInitializationService | null =
    null;
  private readonly logger = getLogger();
  private isInitialized = false;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): BackgroundProcessingInitializationService {
    if (!this.instance) {
      this.instance = new BackgroundProcessingInitializationService();
    }
    return this.instance;
  }

  /**
   * Initialize background processing for the LSP server
   * This should be called during server initialization
   */
  initialize(): void {
    if (this.isInitialized) {
      this.logger.warn(() => 'Background processing already initialized');
      return;
    }

    try {
      // Initialize the background processing manager
      const backgroundManager = ApexSymbolProcessingManager.getInstance();
      backgroundManager.initialize();

      this.isInitialized = true;
      this.logger.info(() => 'Background processing initialized successfully');

      // Log initial queue stats
      const stats = backgroundManager.getQueueStats();
      this.logger.debug(() => `Initial queue stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error(
        () => `Failed to initialize background processing: ${error}`,
      );
      // Don't throw - allow server to continue without background processing
    }
  }

  /**
   * Shutdown background processing
   * This should be called during server shutdown
   */
  shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      const backgroundManager = ApexSymbolProcessingManager.getInstance();
      backgroundManager.shutdown();

      this.isInitialized = false;
      this.logger.info(() => 'Background processing shutdown complete');
    } catch (error) {
      this.logger.error(
        () => `Error during background processing shutdown: ${error}`,
      );
    }
  }

  /**
   * Check if background processing is initialized
   */
  isBackgroundProcessingInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get background processing status information
   */
  getStatus(): {
    initialized: boolean;
    queueStats?: any;
  } {
    const status: {
      initialized: boolean;
      queueStats?: any;
    } = {
      initialized: this.isInitialized,
    };

    if (this.isInitialized) {
      try {
        const backgroundManager = ApexSymbolProcessingManager.getInstance();
        status.queueStats = backgroundManager.getQueueStats();
      } catch (error) {
        this.logger.error(() => `Error getting queue stats: ${error}`);
      }
    }

    return status;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static async reset(): Promise<void> {
    if (this.instance) {
      await this.instance.shutdown();
      this.instance = null;
    }
  }
}
