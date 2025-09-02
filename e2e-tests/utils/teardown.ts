/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { FullConfig } from '@playwright/test';

/**
 * Global teardown for e2e tests.
 *
 * Cleans up test environment and temporary files following
 * TypeScript best practices from .cursor guidelines.
 *
 * @param config - Playwright configuration
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('🧹 Cleaning up e2e test environment...');

  // Clean up any temporary files if needed
  // For now, we'll keep the test workspace for debugging
  // Future: Add cleanup logic for CI environments

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
