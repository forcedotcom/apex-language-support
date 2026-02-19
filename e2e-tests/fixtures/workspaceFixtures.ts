/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test as base } from '@playwright/test';
import { setupTestWorkspace } from '../utils/setup';
import type { SampleFile } from '../utils/vscode-interaction';

/**
 * Workspace fixture options for customizing test workspaces.
 */
export interface WorkspaceFixtures {
  /**
   * Path to the test workspace directory.
   * Automatically created and populated with sample files.
   */
  workspacePath: string;

  /**
   * Custom sample files for the workspace.
   * Allows tests to specify their own Apex files.
   */
  customSampleFiles?: readonly SampleFile[];
}

/**
 * Extend Playwright's test with workspace-specific fixtures.
 * Use this when you need fine-grained control over workspace setup.
 */
export const test = base.extend<WorkspaceFixtures>({
  /**
   * Workspace path fixture.
   * Creates a test workspace with default or custom sample files.
   */
  workspacePath: async ({ customSampleFiles }, use) => {
    const workspace = await setupTestWorkspace({
      sampleFiles: customSampleFiles,
      verbose: process.env.DEBUG_MODE === '1',
    });

    await use(workspace);

    // Cleanup handled by test environment
  },

  /**
   * Custom sample files fixture.
   * Defaults to undefined (uses default sample files).
   * Override this in tests that need specific Apex files.
   */
  customSampleFiles: undefined,
});

/**
 * Example usage with custom workspace:
 *
 * ```typescript
 * import { test } from '../fixtures/workspaceFixtures';
 *
 * test('should handle large Apex class', async ({ page, workspacePath, customSampleFiles }) => {
 *   // This test can override customSampleFiles to provide specific test files
 * });
 * ```
 */
