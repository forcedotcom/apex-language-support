/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { setupTestWorkspace } from './setup';
import {
  startVSCodeWeb,
  verifyWorkspaceFiles,
  activateExtension,
  waitForLSPInitialization,
  verifyApexFileContentLoaded,
  type TestSessionResult,
} from './vscode-interaction';
import {
  setupConsoleMonitoring,
  setupNetworkMonitoring,
} from './error-handling';
import {
  setupWorkerResponseHook,
  detectLCSIntegration,
  type LCSDetectionResult,
} from './worker-detection';
import { waitForLCSReady } from './lsp-testing';

/**
 * Extended test session result with LCS detection.
 */
export interface ExtendedTestSessionResult extends TestSessionResult {
  readonly lcsDetection?: LCSDetectionResult;
}

/**
 * Options for test session setup.
 */
export interface TestSessionOptions {
  readonly includeLCSDetection?: boolean;
  readonly expectedContent?: string;
  readonly skipLCSReady?: boolean;
}

/**
 * Sets up a complete test session with monitoring, workspace, and extension activation.
 * This consolidates the common setup pattern used across all tests.
 *
 * @param page - Playwright page instance
 * @returns Object containing error monitoring arrays
 */
export const setupFullTestSession = async (
  page: Page,
): Promise<TestSessionResult> => {
  // Setup test workspace
  await setupTestWorkspace();

  // Set up monitoring
  const consoleErrors = setupConsoleMonitoring(page);
  const networkErrors = setupNetworkMonitoring(page);

  // Install early worker detection before any navigation
  setupWorkerResponseHook(page);

  // Execute core test steps
  await startVSCodeWeb(page);
  await verifyWorkspaceFiles(page);
  await activateExtension(page);
  await waitForLSPInitialization(page);

  return { consoleErrors, networkErrors };
};

/**
 * Sets up a complete Apex test environment with all common initialization steps.
 * Consolidates the repeated setup pattern from all test cases.
 *
 * @param page - Playwright page instance
 * @param options - Setup options
 * @returns Extended test session result with optional LCS detection
 */
export const setupApexTestEnvironment = async (
  page: Page,
  options: TestSessionOptions = {},
): Promise<ExtendedTestSessionResult> => {
  const {
    includeLCSDetection = false,
    expectedContent = 'ApexClassExample',
    skipLCSReady = false,
  } = options;

  // Setup complete test session
  const sessionResult = await setupFullTestSession(page);

  // Verify Apex file content is loaded
  await verifyApexFileContentLoaded(page, expectedContent);

  // Wait for LCS services to be ready (unless skipped)
  if (!skipLCSReady) {
    await waitForLCSReady(page);
  }

  // Optionally detect LCS integration (expensive operation)
  let lcsDetection: LCSDetectionResult | undefined;
  if (includeLCSDetection) {
    lcsDetection = await detectLCSIntegration(page);
  }

  return {
    ...sessionResult,
    lcsDetection,
  };
};
