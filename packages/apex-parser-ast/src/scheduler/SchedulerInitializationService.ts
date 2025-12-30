/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import { initialize as schedulerInitialize } from '../queue/priority-scheduler-utils';

/**
 * Centralized scheduler initialization service.
 * Ensures the priority scheduler is initialized only once using settings from ApexSettingsManager.
 * This service is shared between lsp-compliant-services and parser-ast packages.
 */
export class SchedulerInitializationService {
  private static instance: SchedulerInitializationService | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly logger = getLogger();

  private constructor() {
    this.logger.debug(() => 'SchedulerInitializationService created');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SchedulerInitializationService {
    if (!SchedulerInitializationService.instance) {
      SchedulerInitializationService.instance =
        new SchedulerInitializationService();
    }
    return SchedulerInitializationService.instance;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    SchedulerInitializationService.instance = null;
  }

  /**
   * Ensure the scheduler is initialized.
   * This method is idempotent - it will only initialize once.
   * Subsequent calls will return the same promise if initialization is in progress,
   * or resolve immediately if already initialized.
   *
   * @returns Promise that resolves when initialization is complete
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      // Initialization already in progress, wait for it
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.doInitialize();
    try {
      await this.initializationPromise;
      this.initialized = true;
      this.logger.debug(() => 'Priority scheduler initialized successfully');
    } catch (error) {
      // Reset promise on error so retry is possible
      this.initializationPromise = null;
      this.logger.error(
        () => `Failed to initialize priority scheduler: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Perform the actual initialization
   */
  private async doInitialize(): Promise<void> {
    try {
      // Get settings from ApexSettingsManager (source of truth)
      const settingsManager = ApexSettingsManager.getInstance();
      const settings = settingsManager.getSettings();
      const schedulerConfig = settings.apex.scheduler;
      const queueCapacity = schedulerConfig.queueCapacity;

      this.logger.debug(
        () =>
          `Initializing scheduler with config: ${JSON.stringify(schedulerConfig)}`,
      );

      // Initialize the scheduler with settings
      await Effect.runPromise(
        schedulerInitialize({
          queueCapacity,
          maxHighPriorityStreak: schedulerConfig.maxHighPriorityStreak,
          idleSleepMs: schedulerConfig.idleSleepMs,
          maxConcurrency: settings.apex.queueProcessing.maxConcurrency,
          maxTotalConcurrency:
            settings.apex.queueProcessing.maxTotalConcurrency,
        }),
      );
    } catch (error) {
      // If initialization fails, log and rethrow
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('already initialized') ||
        errorMessage.includes('Scheduler already initialized')
      ) {
        // Another instance already initialized - this is okay
        this.logger.debug(
          () =>
            'Scheduler already initialized by another instance (this is expected in some scenarios)',
        );
        this.initialized = true;
        return;
      }
      throw error;
    }
  }

  /**
   * Check if the scheduler is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reinitialize the scheduler with updated settings.
   * This should be called when scheduler settings change after initial initialization.
   */
  public async reinitialize(): Promise<void> {
    if (!this.initialized) {
      // Not initialized yet, just initialize normally
      return this.ensureInitialized();
    }

    this.logger.debug('Reinitializing scheduler with updated settings');

    try {
      // Reset the scheduler first
      const { reset, shutdown } = await import(
        '../queue/priority-scheduler-utils'
      );
      await Effect.runPromise(shutdown());
      await Effect.runPromise(reset());

      // Reset our state
      this.initialized = false;
      this.initializationPromise = null;

      // Reinitialize with new settings
      await this.ensureInitialized();
      this.logger.debug(
        'Scheduler reinitialized successfully with new settings',
      );
    } catch (error) {
      this.logger.error(
        () => `Failed to reinitialize priority scheduler: ${error}`,
      );
      throw error;
    }
  }
}
