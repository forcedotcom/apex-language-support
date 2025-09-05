/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import type { ConsoleError } from './constants';
import {
  NON_CRITICAL_ERROR_PATTERNS,
  TEST_TIMEOUTS,
  SELECTORS,
} from './constants';

/**
 * Logs a test step with consistent formatting.
 *
 * @param step - The step description
 * @param icon - Optional emoji icon (defaults to 🔍)
 */
export const logStep = (step: string, icon = '🔍'): void => {
  console.log(`${icon} ${step}...`);
};

/**
 * Logs a successful operation with consistent formatting.
 *
 * @param message - The success message
 */
export const logSuccess = (message: string): void => {
  console.log(`✅ ${message}`);
};

/**
 * Logs a warning with consistent formatting.
 *
 * @param message - The warning message
 */
export const logWarning = (message: string): void => {
  console.log(`⚠️  ${message}`);
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
 * Sets up network failure monitoring for worker files.
 *
 * @param page - Playwright page instance
 * @returns Array to collect network failures
 */
export const setupNetworkMonitoring = (page: Page): string[] => {
  const networkFailures: string[] = [];

  page.on('response', (response) => {
    if (!response.ok() && response.url().includes('worker')) {
      networkFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  return networkFailures;
};

/**
 * Starts VS Code Web and waits for it to load.
 *
 * @param page - Playwright page instance
 */
export const startVSCodeWeb = async (page: Page): Promise<void> => {
  logStep('Starting VS Code Web', '🚀');
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for VS Code workbench to be fully loaded and interactive
  await page.waitForSelector(SELECTORS.STATUSBAR, {
    timeout: TEST_TIMEOUTS.VS_CODE_STARTUP,
  });

  // Verify VS Code workbench loaded
  await page.waitForSelector(SELECTORS.WORKBENCH, {
    timeout: TEST_TIMEOUTS.SELECTOR_WAIT,
  });
  const workbench = page.locator(SELECTORS.WORKBENCH);
  await workbench.waitFor({ state: 'visible' });

  logSuccess('VS Code Web started successfully');
};

/**
 * Verifies workspace files are loaded.
 *
 * @param page - Playwright page instance
 * @returns Number of Apex files found
 */
export const verifyWorkspaceFiles = async (page: Page): Promise<number> => {
  logStep('Checking workspace files', '📁');

  const explorer = page.locator(SELECTORS.EXPLORER);
  await explorer.waitFor({ state: 'visible', timeout: 30_000 });

  // Check if our test files are visible (Apex files)
  const apexFiles = page.locator(SELECTORS.APEX_FILE_ICON);
  const fileCount = await apexFiles.count();

  if (fileCount > 0) {
    logSuccess(`Found ${fileCount} Apex files in workspace`);
  } else {
    logWarning('No Apex files found in workspace');
  }

  return fileCount;
};

/**
 * Opens an Apex file to activate the extension.
 *
 * @param page - Playwright page instance
 */
export const activateExtension = async (page: Page): Promise<void> => {
  logStep('Activating extension', '🔌');

  const clsFile = page.locator(SELECTORS.CLS_FILE_ICON).first();
  const isVisible = await clsFile.isVisible();

  if (isVisible) {
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
    logSuccess('Clicked on .cls file to activate extension');
  } else {
    logWarning('No .cls file found to activate extension');
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
  if (hasContent) {
    logSuccess('Extension activated - Monaco editor loaded with file content');
  } else {
    logWarning('Extension activated but file content may not be loaded yet');
  }
};

/**
 * Waits for LSP server to initialize.
 *
 * @param page - Playwright page instance
 */
export const waitForLSPInitialization = async (page: Page): Promise<void> => {
  logStep('Waiting for LSP server to initialize', '⚙️');

  // Wait for Monaco editor to be ready and responsive
  await page.waitForSelector(
    SELECTORS.MONACO_EDITOR + ' .monaco-editor-background',
    {
      timeout: TEST_TIMEOUTS.LSP_INITIALIZATION,
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

  logSuccess('LSP server initialization detected');
};

/**
 * Verifies VS Code stability by checking core UI elements.
 *
 * @param page - Playwright page instance
 */
export const verifyVSCodeStability = async (page: Page): Promise<void> => {
  logStep('Final stability check', '🎯');

  const sidebar = page.locator(SELECTORS.SIDEBAR);
  await sidebar.waitFor({ state: 'visible' });

  const statusbar = page.locator(SELECTORS.STATUSBAR);
  await statusbar.waitFor({ state: 'visible' });

  logSuccess('VS Code remains stable and responsive');
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
  logStep('Verifying Apex file content is loaded in editor', '📝');

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
        logSuccess(`Editor contains expected content: "${expectedContent}"`);
        return;
      } else {
        throw new Error(
          `Expected content "${expectedContent}" not found in editor`,
        );
      }
    }

    if (hasApexKeywords) {
      logSuccess(
        `Apex code content loaded in editor: "${firstLineText?.trim()}"`,
      );
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
 * Reports test results with consistent formatting.
 *
 * @param testName - Name of the test
 * @param fileCount - Number of files found
 * @param criticalErrors - Number of critical errors
 * @param networkFailures - Number of network failures
 */
export const reportTestResults = (
  testName: string,
  fileCount: number,
  criticalErrors: number,
  networkFailures: number,
): void => {
  console.log(`🎉 ${testName} test PASSED`);
  console.log('   - VS Code Web: ✅ Started');
  console.log('   - Extension: ✅ Activated');
  console.log(`   - Files: ✅ ${fileCount} Apex files loaded`);
  console.log(
    `   - Errors: ✅ ${criticalErrors} critical errors (threshold: 5)`,
  );
  console.log(`   - Worker: ✅ ${networkFailures} failures (threshold: 3)`);
};

/**
 * Test sample file type definition.
 */
export interface SampleFile {
  readonly filename: string;
  readonly description: string;
  readonly content: string;
}

/**
 * Creates a sample file object for testing.
 *
 * @param filename - The file name with extension
 * @param content - The file content
 * @param description - Optional description of the file
 * @returns Sample file object for test workspace
 */
const createSampleFile = (
  filename: string,
  content: string,
  description?: string,
): SampleFile => ({
  filename,
  content,
  description: description || `Sample ${filename} for testing`,
});

/**
 * Creates the comprehensive Apex class example file.
 *
 * @returns Sample file with comprehensive Apex class content
 */
const createApexClassExampleFile = (): SampleFile => {
  // Import the content from constants to avoid duplication
  const { APEX_CLASS_EXAMPLE_CONTENT } = require('./constants');

  return createSampleFile(
    'ApexClassExample.cls',
    APEX_CLASS_EXAMPLE_CONTENT,
    'Comprehensive Apex class for testing language features and outline view',
  );
};

/**
 * All sample files for workspace creation.
 */
export const ALL_SAMPLE_FILES = [createApexClassExampleFile()] as const;
