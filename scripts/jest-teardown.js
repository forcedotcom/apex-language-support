/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Global teardown for Jest tests
 * This ensures that the priority scheduler is properly shut down after all tests
 *
 * The scheduler runs a background controller loop that must be explicitly shut down
 * to prevent Jest from hanging. This teardown:
 * 1. Shuts down the scheduler (stops the background loop)
 * 2. Resets the scheduler state
 * 3. Cleans up ApexSymbolProcessingManager singleton
 * 4. Allows time for cleanup to complete
 */
module.exports = async () => {
  // Set a timeout for teardown to prevent hanging
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Teardown timeout')), 30000),
  );

  try {
    await Promise.race([
      (async () => {
        // Import scheduler utilities from parser-ast
        const {
          shutdown: schedulerShutdown,
          reset: schedulerReset,
        } = require('@salesforce/apex-lsp-parser-ast');
        const { Effect } = require('effect');

        // Shutdown the scheduler first to stop the background loop
        try {
          await Promise.race([
            Effect.runPromise(schedulerShutdown()),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Shutdown timeout')), 5000),
            ),
          ]);
        } catch (_error) {
          // Ignore errors - scheduler might not be initialized or timed out
        }

        // Reset scheduler state
        try {
          await Promise.race([
            Effect.runPromise(schedulerReset()),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Reset timeout')), 5000),
            ),
          ]);
        } catch (_error) {
          // Ignore errors
        }

    // Clean up ApexSymbolProcessingManager singleton
    try {
      const {
        ApexSymbolProcessingManager,
      } = require('@salesforce/apex-lsp-parser-ast');
      if (
        ApexSymbolProcessingManager &&
        typeof ApexSymbolProcessingManager.reset === 'function'
      ) {
        ApexSymbolProcessingManager.reset();
      }
    } catch (_error) {
      // Ignore errors - module might not be available
    }

    // Clean up BackgroundProcessingInitializationService singleton
    // This shuts down background processing and clears any setTimeout-based monitoring
    try {
      const {
        BackgroundProcessingInitializationService,
      } = require('@salesforce/apex-lsp-compliant-services');
      if (
        BackgroundProcessingInitializationService &&
        typeof BackgroundProcessingInitializationService.reset === 'function'
      ) {
        await BackgroundProcessingInitializationService.reset();
      }
    } catch (_error) {
      // Ignore errors - module might not be available
    }

        // Give Effect-TS resources time to clean up
        // This allows fibers to complete their cleanup and queues to fully shutdown
        // Also allows any setTimeout-based monitoring tasks to complete
        // Note: Some recursive setTimeout calls in DocumentProcessingService may still be active,
        // but they will complete naturally and don't prevent Jest from exiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      })(),
      timeout,
    ]);
  } catch (error) {
    // Ignore errors during teardown - modules might not be available or timeout occurred
    if (error.message !== 'Teardown timeout') {
      console.warn('Warning: Error during test teardown:', error.message);
    }
  }
};

