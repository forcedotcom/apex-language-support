/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared cleanup utility for integration tests.
 *
 * This utility provides consistent cleanup of Effect scheduler resources,
 * LSPQueueManager, and other services that may leave open handles.
 *
 * Use this in afterAll hooks to ensure proper cleanup and prevent Jest
 * from hanging due to open handles.
 */

import {
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import { LSPQueueManager } from '../../src/queue/LSPQueueManager';

/**
 * Clean up all test resources that may leave open handles.
 *
 * This function performs cleanup in the correct order:
 * 1. Shut down LSPQueueManager (stops scheduler background loop)
 * 2. Clean up BackgroundProcessingInitializationService
 * 3. Clean up ApexSymbolProcessingManager (stops intervals)
 * 4. Reset SchedulerInitializationService singleton
 * 5. Wait for Effect-TS resources to complete cleanup
 *
 * All cleanup operations are wrapped in try-catch to prevent
 * cleanup errors from masking test failures.
 */
export async function cleanupTestResources(): Promise<void> {
  // 1. Clean up LSPQueueManager to shut down the scheduler
  // This is important because LSPQueueManager initializes a scheduler
  // that runs a background loop which must be explicitly shut down
  // to prevent Jest from hanging
  try {
    const queueManager = LSPQueueManager.getInstance();
    if (queueManager && !queueManager.isShutdownState()) {
      await queueManager.shutdown();
    } else {
      // If already shutdown, just reset the singleton to clear it
      LSPQueueManager.reset();
    }
  } catch (_error) {
    // Module might not be available or other error - try reset anyway
    try {
      LSPQueueManager.reset();
    } catch (_resetError) {
      // Ignore reset errors - module might not be loaded
    }
  }

  // 2. Clean up BackgroundProcessingInitializationService
  // This shuts down background processing and clears any setTimeout-based monitoring
  try {
    const {
      BackgroundProcessingInitializationService,
    } = require('../../src/services/BackgroundProcessingInitializationService');
    if (
      BackgroundProcessingInitializationService &&
      typeof BackgroundProcessingInitializationService.reset === 'function'
    ) {
      await BackgroundProcessingInitializationService.reset();
    }
  } catch (_error) {
    // Ignore errors - module might not be available
  }

  // 3. Clean up ApexSymbolProcessingManager to stop any running intervals
  try {
    ApexSymbolProcessingManager.reset();
  } catch (_error) {
    // Ignore errors during cleanup
  }

  // 4. Reset SchedulerInitializationService singleton
  // Important: This must be done AFTER shutting down the scheduler,
  // as resetting the singleton alone does NOT shut down the scheduler
  try {
    SchedulerInitializationService.resetInstance();
  } catch (_error) {
    // Ignore errors - service might not be initialized
  }

  // 5. Give Effect-TS resources time to clean up
  // This allows fibers to complete their cleanup and queues to fully shutdown
  // Also allows any setTimeout-based monitoring tasks to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
}
