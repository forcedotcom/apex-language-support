/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import type { ConsoleError, NetworkError } from './constants';
import {
  NON_CRITICAL_ERROR_PATTERNS,
  NON_CRITICAL_NETWORK_PATTERNS,
  SELECTORS,
  APEX_CLASS_EXAMPLE_CONTENT,
} from './constants';

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
