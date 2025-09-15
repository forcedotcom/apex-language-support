/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { findAndActivateOutlineView } from './outline-helpers';
import type { ConsoleError, NetworkError } from './constants';
import {
  NON_CRITICAL_ERROR_PATTERNS,
  NON_CRITICAL_NETWORK_PATTERNS,
  SELECTORS,
  APEX_CLASS_EXAMPLE_CONTENT,
} from './constants';
import { setupTestWorkspace } from './setup';

/**
 * Early worker detection store keyed by Playwright Page.
 */
interface WorkerDetectionState {
  workerDetected: boolean;
  bundleSize?: number;
}

const workerDetectionStore: WeakMap<Page, WorkerDetectionState> = new WeakMap();

/**
 * Install an early response hook to capture worker bundle fetch before navigation.
 */
export const setupWorkerResponseHook = (page: Page): void => {
  const initial: WorkerDetectionState = { workerDetected: false };
  workerDetectionStore.set(page, initial);

  const isWorkerUrl = (url: string): boolean =>
    (url.includes('worker.js') || url.includes('worker-web.js')) &&
    url.includes('devextensions');

  page.on('response', async (response) => {
    const url = response.url();
    if (!isWorkerUrl(url)) return;
    try {
      const buffer = await response.body();
      const state = workerDetectionStore.get(page) || { workerDetected: false };
      state.workerDetected = true;
      state.bundleSize = buffer.length;
      workerDetectionStore.set(page, state);
    } catch (_error) {
      // Ignore size measurement errors
      const state = workerDetectionStore.get(page) || { workerDetected: false };
      state.workerDetected = true;
      workerDetectionStore.set(page, state);
    }
  });
};

/**
 * Filters console errors to exclude non-critical patterns.
 *
 * @param errors - Array of console errors to filter
 * @returns Filtered array of critical errors only
 */
export const filterCriticalErrors = (errors: ConsoleError[]): ConsoleError[] =>
  errors.filter((error) => {
    const text = error.text.toLowerCase();
    const url = (error.url || '').toLowerCase();

    return !NON_CRITICAL_ERROR_PATTERNS.some(
      (pattern) =>
        text.includes(pattern.toLowerCase()) ||
        url.includes(pattern.toLowerCase()) ||
        text.includes('warning'),
    );
  });

/**
 * Validates that all console errors are in the allowList.
 * Returns detailed information about any errors that are NOT allowed.
 *
 * @param errors - Array of console errors to validate
 * @returns Object with validation results and details about non-allowed errors
 */
export const validateAllErrorsInAllowList = (
  errors: ConsoleError[],
): {
  allErrorsAllowed: boolean;
  nonAllowedErrors: ConsoleError[];
  totalErrors: number;
  allowedErrors: number;
} => {
  const nonAllowedErrors: ConsoleError[] = [];
  let allowedErrors = 0;

  errors.forEach((error) => {
    const text = error.text.toLowerCase();
    const url = (error.url || '').toLowerCase();

    const isAllowed = NON_CRITICAL_ERROR_PATTERNS.some(
      (pattern) =>
        text.includes(pattern.toLowerCase()) ||
        url.includes(pattern.toLowerCase()) ||
        text.includes('warning'),
    );

    if (isAllowed) {
      allowedErrors++;
    } else {
      nonAllowedErrors.push(error);
    }
  });

  return {
    allErrorsAllowed: nonAllowedErrors.length === 0,
    nonAllowedErrors,
    totalErrors: errors.length,
    allowedErrors,
  };
};

/**
 * Validates that all network errors are in the allowList.
 * Returns detailed information about any errors that are NOT allowed.
 *
 * @param errors - Array of network errors to validate
 * @returns Object with validation results and details about non-allowed errors
 */
export const validateAllNetworkErrorsInAllowList = (
  errors: NetworkError[],
): {
  allErrorsAllowed: boolean;
  nonAllowedErrors: NetworkError[];
  totalErrors: number;
  allowedErrors: number;
} => {
  const nonAllowedErrors: NetworkError[] = [];
  let allowedErrors = 0;

  errors.forEach((error) => {
    const url = error.url.toLowerCase();
    const description = error.description.toLowerCase();

    const isAllowed = NON_CRITICAL_NETWORK_PATTERNS.some(
      (pattern) =>
        url.includes(pattern.toLowerCase()) ||
        description.includes(pattern.toLowerCase()),
    );

    if (isAllowed) {
      allowedErrors++;
    } else {
      nonAllowedErrors.push(error);
    }
  });

  return {
    allErrorsAllowed: nonAllowedErrors.length === 0,
    nonAllowedErrors,
    totalErrors: errors.length,
    allowedErrors,
  };
};

/**
 * Sets up console error monitoring for a page.
 *
 * @param page - Playwright page instance
 * @returns Array to collect console errors
 */
export const setupConsoleMonitoring = (page: Page): ConsoleError[] => {
  const consoleErrors: ConsoleError[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        url: msg.location()?.url || '',
      });
    }
  });

  return consoleErrors;
};

/**
 * Sets up network error monitoring for all failed requests.
 *
 * @param page - Playwright page instance
 * @returns Array to collect network errors
 */
export const setupNetworkMonitoring = (page: Page): NetworkError[] => {
  const networkErrors: NetworkError[] = [];

  page.on('response', (response) => {
    if (!response.ok()) {
      networkErrors.push({
        status: response.status(),
        url: response.url(),
        description: `HTTP ${response.status()} ${response.statusText()}`,
      });
    }
  });

  return networkErrors;
};

/**
 * Starts VS Code Web and waits for it to load.
 *
 * @param page - Playwright page instance
 */
export const startVSCodeWeb = async (page: Page): Promise<void> => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for VS Code workbench to be fully loaded and interactive
  await page.waitForSelector(SELECTORS.STATUSBAR, {
    timeout: 60_000, // VS Code startup timeout
  });

  // Verify VS Code workbench loaded
  await page.waitForSelector(SELECTORS.WORKBENCH, {
    timeout: 30_000, // Selector wait timeout
  });
  const workbench = page.locator(SELECTORS.WORKBENCH);
  await workbench.waitFor({ state: 'visible' });
};

/**
 * Verifies workspace files are loaded.
 *
 * @param page - Playwright page instance
 * @returns Number of Apex files found
 */
export const verifyWorkspaceFiles = async (page: Page): Promise<number> => {
  const explorer = page.locator(SELECTORS.EXPLORER);
  await explorer.waitFor({ state: 'visible', timeout: 30_000 });

  // Wait a bit for the file system to stabilize in CI environments
  if (process.env.CI) {
    await page.waitForTimeout(2000);
  }

  // Check if our test files are visible (Apex files)
  const apexFiles = page.locator(SELECTORS.APEX_FILE_ICON);
  const fileCount = await apexFiles.count();

  return fileCount;
};

/**
 * Opens an Apex file to activate the extension.
 *
 * @param page - Playwright page instance
 */
export const activateExtension = async (page: Page): Promise<void> => {
  const clsFile = page.locator(SELECTORS.CLS_FILE_ICON).first();

  await clsFile.waitFor({
    state: 'visible',
    timeout: 15_000,
  });

  if (await clsFile.isVisible()) {
    // Hover to show file selection in debug mode
    if (process.env.DEBUG_MODE) {
      await clsFile.hover();
      await page
        .waitForSelector(SELECTORS.CLS_FILE_ICON + ':hover', { timeout: 1000 })
        .catch(() => {
          // Ignore hover selector timeout - it's just for debug visibility
        });
    }

    await clsFile.click();
  } else {
    throw new Error('No .cls file found to activate extension');
  }

  // Wait for editor to load
  await page.waitForSelector(SELECTORS.EDITOR_PART, { timeout: 15_000 });
  const editorPart = page.locator(SELECTORS.EDITOR_PART);
  await editorPart.waitFor({ state: 'visible' });

  // Verify Monaco editor is present
  const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR);
  await monacoEditor.waitFor({ state: 'visible', timeout: 30_000 });

  // Verify that file content is actually loaded in the editor
  const editorText = page.locator('.monaco-editor .view-lines');
  await editorText.waitFor({ state: 'visible', timeout: 5_000 });

  // Check if the editor contains some text content
  const hasContent = await editorText.locator('.view-line').first().isVisible();
  if (!hasContent) {
    throw new Error(
      'Extension activated but file content may not be loaded yet',
    );
  }
};

/**
 * Waits for LSP server to initialize.
 *
 * @param page - Playwright page instance
 */
export const waitForLSPInitialization = async (page: Page): Promise<void> => {
  // Wait for Monaco editor to be ready and responsive
  await page.waitForSelector(
    SELECTORS.MONACO_EDITOR + ' .monaco-editor-background',
    {
      timeout: 30_000, // LSP initialization timeout
    },
  );

  // Wait for any language server activity by checking for syntax highlighting or symbols
  await page.evaluate(
    async () =>
      new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const editor = document.querySelector('.monaco-editor .view-lines');
          if (editor && editor.children.length > 0) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);

        // Timeout after 8 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(true);
        }, 8000);
      }),
  );
};

/**
 * Verifies VS Code stability by checking core UI elements.
 *
 * @param page - Playwright page instance
 */
export const verifyVSCodeStability = async (page: Page): Promise<void> => {
  const sidebar = page.locator(SELECTORS.SIDEBAR);
  await sidebar.waitFor({ state: 'visible' });

  const statusbar = page.locator(SELECTORS.STATUSBAR);
  await statusbar.waitFor({ state: 'visible' });
};

/**
 * Verifies that Apex code content is loaded and visible in the editor.
 * Throws an error if content is not loaded or doesn't match expectations.
 *
 * @param page - Playwright page instance
 * @param expectedContent - Optional specific content to look for
 * @throws Error if content is not visible or doesn't match expectations
 */
export const verifyApexFileContentLoaded = async (
  page: Page,
  expectedContent?: string,
): Promise<void> => {
  try {
    // Wait for editor content to load
    const editorContent = page.locator('.monaco-editor .view-lines .view-line');
    await editorContent.first().waitFor({ state: 'visible', timeout: 5_000 });

    // Get the visible text content
    const firstLineText = await editorContent.first().textContent();
    const hasApexKeywords =
      firstLineText &&
      (firstLineText.includes('public') ||
        firstLineText.includes('class') ||
        firstLineText.includes('private') ||
        firstLineText.includes('static'));

    if (expectedContent) {
      const allText = await editorContent.allTextContents();
      const fullText = allText.join(' ');
      const hasExpectedContent = fullText.includes(expectedContent);

      if (hasExpectedContent) {
        return;
      } else {
        throw new Error(
          `Expected content "${expectedContent}" not found in editor`,
        );
      }
    }

    if (hasApexKeywords) {
      return;
    } else {
      throw new Error('Editor content does not contain recognizable Apex code');
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Expected content') ||
        error.message.includes('Editor content does not contain'))
    ) {
      throw error; // Re-throw our custom errors
    }
    throw new Error(`Could not verify editor content: ${error}`);
  }
};

/**
 * Test sample file type definition.
 */
export interface SampleFile {
  readonly filename: string;
  readonly content: string;
}

/**
 * Creates a sample file object for testing.
 *
 * @param filename - The file name with extension
 * @param content - The file content
 * @returns Sample file object for test workspace
 */
const createSampleFile = (filename: string, content: string): SampleFile => ({
  filename,
  content,
});

/**
 * Creates the comprehensive Apex class example file.
 *
 * @returns Sample file with comprehensive Apex class content
 */
const createApexClassExampleFile = (): SampleFile =>
  createSampleFile('ApexClassExample.cls', APEX_CLASS_EXAMPLE_CONTENT);

/**
 * All sample files for workspace creation.
 */
export const ALL_SAMPLE_FILES = [createApexClassExampleFile()] as const;

/**
 * Result object for full test session setup.
 */
export interface TestSessionResult {
  readonly consoleErrors: ConsoleError[];
  readonly networkErrors: NetworkError[];
}

/**
 * Result object for test session validation.
 */
export interface ValidationResult {
  readonly consoleValidation: {
    allErrorsAllowed: boolean;
    nonAllowedErrors: ConsoleError[];
    totalErrors: number;
    allowedErrors: number;
  };
  readonly networkValidation: {
    allErrorsAllowed: boolean;
    nonAllowedErrors: NetworkError[];
    totalErrors: number;
    allowedErrors: number;
  };
  readonly summary: string;
}

/**
 * LCS integration detection result.
 */
export interface LCSDetectionResult {
  readonly lcsIntegrationActive: boolean;
  readonly workerDetected: boolean;
  readonly bundleSize?: number;
  readonly hasLCSMessages: boolean;
  readonly hasStubFallback: boolean;
  readonly hasErrorIndicators: boolean;
  readonly summary: string;
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
 * Performs comprehensive validation of test session results.
 * Consolidates error validation and reporting logic.
 *
 * @param consoleErrors - Console errors collected during test
 * @param networkErrors - Network errors collected during test
 * @returns Validation results with summary
 */
export const performStrictValidation = (
  consoleErrors: ConsoleError[],
  networkErrors: NetworkError[],
): ValidationResult => {
  const consoleValidation = validateAllErrorsInAllowList(consoleErrors);
  const networkValidation = validateAllNetworkErrorsInAllowList(networkErrors);

  let summary = '📊 Validation Results:\n';
  summary += `   - Console errors: ${consoleValidation.totalErrors} (${consoleValidation.allowedErrors} allowed, `;
  summary += `${consoleValidation.nonAllowedErrors.length} blocked)\n`;
  summary += `   - Network errors: ${networkValidation.totalErrors} (${networkValidation.allowedErrors} allowed, `;
  summary += `${networkValidation.nonAllowedErrors.length} blocked)\n`;
  const passed =
    consoleValidation.allErrorsAllowed && networkValidation.allErrorsAllowed;
  summary += `   - Overall status: ${passed ? '✅ PASSED' : '❌ FAILED'}`;

  if (consoleValidation.nonAllowedErrors.length > 0) {
    summary += '\n❌ Non-allowed console errors:';
    consoleValidation.nonAllowedErrors.forEach((error, index) => {
      summary += `\n  ${index + 1}. "${error.text}" (URL: ${error.url || 'no URL'})`;
    });
  }

  if (networkValidation.nonAllowedErrors.length > 0) {
    summary += '\n❌ Non-allowed network errors:';
    networkValidation.nonAllowedErrors.forEach((error, index) => {
      summary += `\n  ${index + 1}. HTTP ${error.status} ${error.url} (${error.description})`;
    });
  }

  return { consoleValidation, networkValidation, summary };
};

/**
 * Detects LCS integration status by analyzing console messages and worker behavior.
 * Consolidates LCS detection logic from multiple test files.
 *
 * @param page - Playwright page instance
 * @returns LCS detection results
 */
export const detectLCSIntegration = async (
  page: Page,
): Promise<LCSDetectionResult> => {
  const consoleMessages: string[] = [];
  const lcsMessages: string[] = [];
  const workerMessages: string[] = [];

  // Enhanced console monitoring for LCS detection
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);

    if (text.includes('LCS') || text.includes('LSP-Compliant-Services')) {
      lcsMessages.push(text);
    }

    if (text.includes('Worker') || text.includes('worker')) {
      workerMessages.push(text);
    }
  });

  // Wait for LCS initialization
  await page.waitForTimeout(5000);

  // Analyze console messages for LCS indicators
  const hasStubFallback = consoleMessages.some(
    (msg) =>
      msg.includes('stub mode') ||
      msg.includes('fallback') ||
      msg.includes('Stub implementation'),
  );

  const hasLCSSuccess = consoleMessages.some(
    (msg) =>
      msg.includes('LCS Adapter') ||
      msg.includes('LCS integration') ||
      msg.includes('✅ Apex Language Server Worker with LCS ready'),
  );

  const hasErrorIndicators = consoleMessages.some(
    (msg) =>
      msg.includes('❌ Failed to start LCS') ||
      msg.includes('🔄 Falling back to stub'),
  );

  // Check for worker detection
  let workerDetected = false;
  let bundleSize: number | undefined;

  try {
    // Read from early hook store if present
    const early = workerDetectionStore.get(page);
    if (early) {
      workerDetected = workerDetected || early.workerDetected;
      bundleSize = bundleSize || early.bundleSize;
    }

    // Inspect already-loaded resources via Performance API
    const perfWorker = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as any[];
      const workerEntry = entries.find(
        (e) =>
          (e.name.includes('worker.js') || e.name.includes('worker-web.js')) &&
          e.name.includes('devextensions'),
      );
      return workerEntry
        ? { url: workerEntry.name, size: workerEntry.transferSize || 0 }
        : null;
    });
    if (perfWorker) {
      workerDetected = true;
      if (!bundleSize && perfWorker.size) bundleSize = perfWorker.size;
    }
  } catch (_error) {
    // Ignore worker detection errors
  }

  const lcsIntegrationActive =
    hasLCSSuccess || (!hasStubFallback && !hasErrorIndicators);

  const bundleSizeMB = bundleSize
    ? `${Math.round((bundleSize / 1024 / 1024) * 100) / 100} MB`
    : 'Unknown';

  let summary = '🔍 LCS Integration Analysis:\n';
  summary += `   - LCS Integration: ${lcsIntegrationActive ? '✅ ACTIVE' : '❌ INACTIVE'}\n`;
  summary += `   - Worker Detected: ${workerDetected ? '✅ YES' : '❌ NO'}\n`;
  summary += `   - Bundle Size: ${bundleSizeMB}\n`;
  summary += `   - LCS Messages: ${lcsMessages.length}\n`;
  summary += `   - Stub Fallback: ${hasStubFallback ? '⚠️ YES' : '✅ NO'}\n`;
  summary += `   - Error Indicators: ${hasErrorIndicators ? '❌ YES' : '✅ NO'}`;

  return {
    lcsIntegrationActive,
    workerDetected,
    bundleSize,
    hasLCSMessages: lcsMessages.length > 0,
    hasStubFallback,
    hasErrorIndicators,
    summary,
  };
};

/**
 * Waits for LCS services to be ready by checking for completion functionality.
 * Replaces unreliable setTimeout calls with deterministic waiting.
 *
 * @param page - Playwright page instance
 */
export const waitForLCSReady = async (page: Page): Promise<void> => {
  try {
    // Wait for editor to be ready
    const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR);
    await monacoEditor.waitFor({ state: 'visible', timeout: 15000 });

    // Try to trigger completion to test LCS services
    await monacoEditor.click();
    await positionCursorInConstructor(page);
    await page.keyboard.type('System.');

    // Wait for completion suggestion or timeout
    await page
      .waitForSelector('.suggest-widget, .monaco-list, [id*="suggest"]', {
        timeout: 5000,
      })
      .catch(() => {
        // Completion might not appear immediately, continue
      });

    // Clean up the typed text
    await page.keyboard.press('Control+Z'); // Undo the typing
  } catch (_error) {
    // If LCS readiness check fails, continue - this is informational
    console.log('ℹ️ LCS readiness check completed with minor issues');
  }
};

/**
 * Tests LSP language services functionality (completion, symbols, etc.).
 * Consolidates LSP functionality testing from multiple files.
 *
 * @param page - Playwright page instance
 * @returns Object indicating which LSP features are working
 */
export const testLSPFunctionality = async (
  page: Page,
): Promise<{
  completionTested: boolean;
  symbolsTested: boolean;
  editorResponsive: boolean;
}> => {
  const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR);
  let completionTested = false;
  let symbolsTested = false;
  let editorResponsive = false;

  try {
    // Test editor responsiveness
    await monacoEditor.click();
    editorResponsive = await monacoEditor.isVisible();

    // Test completion services
    await positionCursorInConstructor(page);
    await page.keyboard.type('System.');
    const completionWidget = page.locator(
      '.suggest-widget, .monaco-list, [id*="suggest"]',
    );
    await completionWidget
      .waitFor({ state: 'visible', timeout: 3000 })
      .catch(() => {});
    completionTested = await completionWidget.isVisible().catch(() => false);

    if (completionTested) {
      await page.keyboard.press('Escape'); // Close completion
    }

    // Clean up typed text
    await page.keyboard.press('Control+Z');

    // Test document symbols
    const tryOpenSymbolPicker = async (): Promise<boolean> => {
      const symbolPicker = page.locator(
        '.quick-input-widget, [id*="quickInput"]',
      );

      // Try macOS chord first, then Windows/Linux
      await page.keyboard.press('Meta+Shift+O');
      await symbolPicker
        .waitFor({ state: 'visible', timeout: 600 })
        .catch(() => {});
      if (await symbolPicker.isVisible().catch(() => false)) {
        // Consider success only if list has items
        const itemCount = await page
          .locator('.quick-input-widget .monaco-list-row')
          .count()
          .catch(() => 0);
        if (itemCount > 0) return true;
      }

      await page.keyboard.press('Control+Shift+O');
      await symbolPicker
        .waitFor({ state: 'visible', timeout: 600 })
        .catch(() => {});
      if (await symbolPicker.isVisible().catch(() => false)) {
        const itemCount = await page
          .locator('.quick-input-widget .monaco-list-row')
          .count()
          .catch(() => 0);
        if (itemCount > 0) return true;
      }

      // Fallback: Command Palette → '@' (Go to Symbol in Editor)
      await page.keyboard.press('F1');
      const quickInput = page.locator('.quick-input-widget');
      await quickInput
        .waitFor({ state: 'visible', timeout: 1000 })
        .catch(() => {});
      await page.keyboard.type('@');
      await page.keyboard.press('Enter');
      await symbolPicker
        .waitFor({ state: 'visible', timeout: 1200 })
        .catch(() => {});
      if (await symbolPicker.isVisible().catch(() => false)) {
        const itemCount = await page
          .locator('.quick-input-widget .monaco-list-row')
          .count()
          .catch(() => 0);
        if (itemCount > 0) return true;
      }
      return false;
    };

    symbolsTested = await tryOpenSymbolPicker();
    if (symbolsTested) {
      await page.keyboard.press('Escape'); // Close symbol picker
    }

    // If picker approach failed, open Outline and accept outline as proof of symbol services
    if (!symbolsTested) {
      try {
        await findAndActivateOutlineView(page);
      } catch (_e) {
        // ignore activation failure; we'll still try to detect rows
      }
      const outlineRows = page.locator(
        '.outline-tree .monaco-list-row, .monaco-tree .monaco-list-row',
      );
      await outlineRows
        .first()
        .waitFor({ state: 'visible', timeout: 2000 })
        .catch(() => {});
      const outlineCount = await outlineRows.count().catch(() => 0);
      symbolsTested = outlineCount > 0;
    }
  } catch (_error) {
    // LSP functionality testing is informational
  }

  return { completionTested, symbolsTested, editorResponsive };
};

/**
 * Positions the cursor inside the constructor method of the ApexClassExample class.
 * This provides a proper context for testing completion services.
 *
 * @param page - Playwright page instance
 */
export const positionCursorInConstructor = async (
  page: Page,
): Promise<void> => {
  try {
    // Use Ctrl+F to find the constructor method
    await page.keyboard.press('Control+F');
    // Wait for find input to appear
    await page
      .waitForSelector('input[aria-label="Find"], .find-widget', {
        timeout: 1500,
      })
      .catch(() => {});

    // Search for the constructor method signature
    await page.keyboard.type('this.instanceId = instanceId;');
    await page.keyboard.press('Enter'); // Search
    await page.keyboard.press('Escape'); // Close search dialog

    // Position cursor at the end of the constructor method, before the closing brace
    await page.keyboard.press('End');
    await page.keyboard.press('Enter'); // Add new line
    await page.keyboard.type('        '); // Add proper indentation (8 spaces to match constructor body)
  } catch (_error) {
    console.log(
      '⚠️ Could not position cursor in constructor, using default position',
    );
    // Fallback to end of file if constructor positioning fails
    await page.keyboard.press('Control+End');
    await page.keyboard.type('\n    ');
  }
};
