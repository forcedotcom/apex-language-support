/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Helper functions for scheduler setup and teardown in tests
 * This ensures all tests that use ApexSymbolManager or ApexSymbolGraph
 * properly initialize and shut down the scheduler.
 */

import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

/**
 * Initialize the scheduler for tests
 * Call this in beforeAll hook
 */
export async function setupScheduler(): Promise<void> {
  await Effect.runPromise(
    schedulerInitialize({
      queueCapacity: 100,
      maxHighPriorityStreak: 50,
      idleSleepMs: 1,
      maxConcurrency: {
        CRITICAL: Infinity,
        IMMEDIATE: Infinity,
        HIGH: Infinity,
        NORMAL: Infinity,
        LOW: Infinity,
        BACKGROUND: Infinity,
      },
      maxTotalConcurrency: Infinity,
    }),
  );
}

/**
 * Shutdown and reset the scheduler after tests
 * Call this in afterAll hook
 */
export async function teardownScheduler(): Promise<void> {
  // Shutdown the scheduler first to stop the background loop
  try {
    await Effect.runPromise(schedulerShutdown());
  } catch (_error) {
    // Ignore errors - scheduler might not be initialized or already shut down
  }
  // Reset scheduler state after shutdown
  try {
    await Effect.runPromise(schedulerReset());
  } catch (_error) {
    // Ignore errors - scheduler might not be initialized
  }
}
