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
        // Try multiple times to ensure it shuts down (in case of race conditions)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await Promise.race([
              Effect.runPromise(schedulerShutdown()),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Shutdown timeout')), 5000),
              ),
            ]);
            // If shutdown succeeded, break out of retry loop
            break;
          } catch (_error) {
            // If this is the last attempt, ignore the error
            if (attempt === 2) {
              // Ignore errors - scheduler might not be initialized or timed out
            } else {
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }

        // Reset scheduler state
        // Try multiple times to ensure it resets
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await Promise.race([
              Effect.runPromise(schedulerReset()),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Reset timeout')), 5000),
              ),
            ]);
            // If reset succeeded, break out of retry loop
            break;
          } catch (_error) {
            // If this is the last attempt, ignore the error
            if (attempt === 2) {
              // Ignore errors
            } else {
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
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

        // Clean up ResourceLoader singleton
        // ResourceLoader may have background compilation tasks that need to be interrupted
        try {
          const { ResourceLoader } = require('@salesforce/apex-lsp-parser-ast');
          if (
            ResourceLoader &&
            typeof ResourceLoader.resetInstance === 'function'
          ) {
            ResourceLoader.resetInstance();
          }
        } catch (_error) {
          // Ignore errors - module might not be available
        }

        // Clean up ApexSymbolGraph singleton
        // ApexSymbolGraph may have background workers (daemon fibers) that need to be shut down
        // Daemon fibers created with Effect.forkDaemon don't get cleaned up automatically
        // when scopes close, so we must explicitly call clear() which interrupts them
        try {
          const { ApexSymbolGraph } = require('@salesforce/apex-lsp-parser-ast');
          if (ApexSymbolGraph) {
            // Get the current instance and clear it (which shuts down workers and interrupts daemon fibers)
            const instance = ApexSymbolGraph.getInstance();
            if (instance && typeof instance.clear === 'function') {
              instance.clear();
              // Give daemon fiber interruptions time to complete
              // Daemon fibers are interrupted synchronously, but the actual cleanup may take a moment
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            // Reset the singleton instance
            if (typeof ApexSymbolGraph.setInstance === 'function') {
              ApexSymbolGraph.setInstance(null);
            }
          }
        } catch (_error) {
          // Ignore errors - module might not be available
        }

        // Clean up LSPQueueManager to shut down the scheduler
        // This is important because LSPQueueManager initializes a scheduler
        // that runs a background loop which must be explicitly shut down
        try {
          const { LSPQueueManager } = require('@salesforce/apex-lsp-compliant-services');
          const queueManager = LSPQueueManager.getInstance();
          if (queueManager && !queueManager.isShutdownState()) {
            await Promise.race([
              queueManager.shutdown(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LSPQueueManager shutdown timeout')), 5000),
              ),
            ]);
          } else {
            // If already shutdown, just reset the singleton to clear it
            LSPQueueManager.reset();
          }
        } catch (_error) {
          // Module might not be available or other error - try reset anyway
          try {
            const { LSPQueueManager } = require('@salesforce/apex-lsp-compliant-services');
            LSPQueueManager.reset();
          } catch (_resetError) {
            // Ignore reset errors - module might not be loaded
          }
        }

        // Reset SchedulerInitializationService singleton
        // Important: This must be done AFTER shutting down the scheduler,
        // as resetting the singleton alone does NOT shut down the scheduler
        try {
          const { SchedulerInitializationService } = require('@salesforce/apex-lsp-parser-ast');
          if (
            SchedulerInitializationService &&
            typeof SchedulerInitializationService.resetInstance === 'function'
          ) {
            SchedulerInitializationService.resetInstance();
          }
        } catch (_error) {
          // Ignore errors - service might not be initialized
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

        // Clear WorkspaceBatchHandler cleanup interval if it exists
        // This prevents the interval from keeping the process alive
        try {
          const {
            clearCleanupInterval,
          } = require('@salesforce/apex-language-server/src/server/WorkspaceBatchHandler');
          if (clearCleanupInterval && typeof clearCleanupInterval === 'function') {
            clearCleanupInterval();
          }
        } catch (_error) {
          // Ignore errors - module might not be available or function might not exist
        }

        // Give Effect-TS resources time to clean up
        // This allows fibers to complete their cleanup and queues to fully shutdown
        // Also allows any setTimeout-based monitoring tasks to complete
        // Note: Some recursive setTimeout calls in DocumentProcessingService may still be active,
        // but they will complete naturally and don't prevent Jest from exiting
        // Increased delay to ensure all cleanup completes, especially for apex-parser-ast tests
        // The scheduler's scope may keep fibers alive, so we need extra time for them to complete
        await new Promise((resolve) => setTimeout(resolve, 3000));
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

