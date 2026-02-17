/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test as base, expect } from '@playwright/test';
import { ApexEditorPage } from '../pages/ApexEditorPage';
import { OutlineViewPage } from '../pages/OutlineViewPage';
import { HoverPage } from '../pages/HoverPage';
import {
  setupApexTestEnvironment,
  type ExtendedTestSessionResult,
} from '../utils/test-orchestration';
import type { ConsoleError, NetworkError } from '../utils/constants';

/**
 * Custom fixtures for Apex e2e tests.
 * These fixtures provide:
 * - Pre-configured page objects (apexEditor, outlineView, hoverHelper)
 * - Automatic Apex test environment setup
 * - Error monitoring and validation
 * - LCS detection results
 */

/**
 * Extended test fixtures for Apex testing.
 */
export interface ApexTestFixtures {
  /**
   * Apex editor page object for file and editor interactions.
   */
  apexEditor: ApexEditorPage;

  /**
   * Outline view page object for symbol navigation.
   */
  outlineView: OutlineViewPage;

  /**
   * Hover page object for hover functionality testing.
   */
  hoverHelper: HoverPage;

  /**
   * Apex test environment with pre-configured workspace and monitoring.
   * Automatically sets up:
   * - VS Code Web environment
   * - Apex workspace with sample files
   * - Console and network error monitoring
   * - LCS detection
   */
  apexTestEnvironment: ExtendedTestSessionResult;

  /**
   * Console errors captured during the test.
   * Available after test environment setup.
   */
  consoleErrors: ConsoleError[];

  /**
   * Network errors captured during the test.
   * Available after test environment setup.
   */
  networkErrors: NetworkError[];
}

/**
 * Extend Playwright's test with Apex-specific fixtures.
 */
export const test = base.extend<ApexTestFixtures>({
  /**
   * Apex test environment fixture.
   * Automatically sets up VS Code Web with Apex workspace before each test.
   * Includes error monitoring and LCS detection.
   * This runs first so other fixtures have the environment ready.
   */
  apexTestEnvironment: async ({ page }, use) => {
    // Set up complete Apex test environment
    const testEnvironment = await setupApexTestEnvironment(page, {
      includeLCSDetection: true,
    });

    // Provide the environment to the test
    await use(testEnvironment);

    // Cleanup is handled automatically by Playwright
  },

  /**
   * Apex editor fixture - provides ApexEditorPage instance.
   * Depends on apexTestEnvironment to ensure VS Code is set up first.
   */
  apexEditor: async ({ page, apexTestEnvironment }, use) => {
    // apexTestEnvironment dependency ensures environment is set up
    void apexTestEnvironment; // Use to avoid unused variable warning
    const editor = new ApexEditorPage(page);
    await use(editor);
  },

  /**
   * Outline view fixture - provides OutlineViewPage instance.
   * Depends on apexTestEnvironment to ensure VS Code is set up first.
   */
  outlineView: async ({ page, apexTestEnvironment }, use) => {
    void apexTestEnvironment;
    const outline = new OutlineViewPage(page);
    await use(outline);
  },

  /**
   * Hover helper fixture - provides HoverPage instance.
   * Depends on apexTestEnvironment to ensure VS Code is set up first.
   */
  hoverHelper: async ({ page, apexTestEnvironment }, use) => {
    void apexTestEnvironment;
    const hover = new HoverPage(page);
    await use(hover);
  },

  /**
   * Console errors fixture - provides access to captured console errors.
   */
  consoleErrors: async ({ apexTestEnvironment }, use) => {
    await use(apexTestEnvironment.consoleErrors);
  },

  /**
   * Network errors fixture - provides access to captured network errors.
   */
  networkErrors: async ({ apexTestEnvironment }, use) => {
    await use(apexTestEnvironment.networkErrors);
  },
});

/**
 * Re-export expect for convenience.
 * This allows tests to import both test and expect from this file.
 */
export { expect };

/**
 * Example usage:
 *
 * ```typescript
 * import { test, expect } from '../fixtures/apexFixtures';
 *
 * test('should open Apex file', async ({ apexEditor, apexTestEnvironment }) => {
 *   await apexEditor.openFile('ApexClassExample.cls');
 *   await apexEditor.waitForLanguageServerReady();
 *   expect(await apexEditor.isApexFileOpen()).toBe(true);
 * });
 * ```
 */
