/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { SELECTORS, APEX_CLASS_EXAMPLE_CONTENT } from './constants';
import {
  waitForVSCodeWorkbench,
  closeWelcomeTabs,
} from '../shared/utils/helpers';
import { waitForCommandToBeAvailable } from '../shared/pages/commands';

import type { ConsoleError, NetworkError } from './constants';

/**
 * Test sample file type definition.
 */
export interface SampleFile {
  readonly filename: string;
  readonly content: string;
}

/**
 * Result object for full test session setup.
 */
export interface TestSessionResult {
  readonly consoleErrors: ConsoleError[];
  readonly networkErrors: NetworkError[];
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
 * Starts VS Code Web and waits for it to load.
 * Uses shared waitForVSCodeWorkbench and closeWelcomeTabs (monorepo parity).
 *
 * @param page - Playwright page instance
 */
export const startVSCodeWeb = async (page: Page): Promise<void> => {
  await waitForVSCodeWorkbench(page, true);
  await closeWelcomeTabs(page);
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

  // Wait for the file system to stabilize in CI environments
  if (process.env.CI) {
    // Wait for explorer content to be fully loaded instead of using timeout
    await page
      .waitForFunction(
        () => {
          const explorer = document.querySelector(
            '[id="workbench.view.explorer"]',
          );
          return explorer && explorer.children.length > 0;
        },
        { timeout: 5000 },
      )
      .catch(() => {
        // If the function-based wait fails, use a short fallback
      });
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
  // Desktop mode requires longer timeouts
  const isDesktopMode = process.env.TEST_MODE === 'desktop';
  const shortTimeout = isDesktopMode ? 30_000 : 15_000;
  const longTimeout = isDesktopMode ? 60_000 : 30_000;
  const contentTimeout = isDesktopMode ? 15_000 : 5_000;

  const clsFile = page.locator(SELECTORS.CLS_FILE_ICON).first();

  await clsFile.waitFor({
    state: 'visible',
    timeout: shortTimeout,
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
  await page.waitForSelector(SELECTORS.EDITOR_PART, { timeout: shortTimeout });
  const editorPart = page.locator(SELECTORS.EDITOR_PART);
  await editorPart.waitFor({ state: 'visible' });

  // Verify Monaco editor is present
  const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR);
  await monacoEditor.waitFor({ state: 'visible', timeout: longTimeout });

  // Verify that file content is actually loaded in the editor
  const editorText = page.locator('.monaco-editor .view-lines');
  await editorText.waitFor({ state: 'visible', timeout: contentTimeout });

  // Check if the editor contains some text content
  const hasContent = await editorText.locator('.view-line').first().isVisible();
  if (!hasContent) {
    throw new Error(
      'Extension activated but file content may not be loaded yet',
    );
  }

  // Wait for extension command to be available (extension fully loaded + when context ready)
  await waitForCommandToBeAvailable(
    page,
    'SFDX: Restart Apex-LS-TS Language Server',
    30_000,
  );
};

/**
 * Waits for LSP server to initialize.
 * Waits for Monaco editor to be ready and for view lines (content) to be visible.
 *
 * @param page - Playwright page instance
 */
export const waitForLSPInitialization = async (page: Page): Promise<void> => {
  const isDesktopMode = process.env.TEST_MODE === 'desktop';
  const selectorTimeout = isDesktopMode ? 60_000 : 30_000;

  await page.waitForSelector(
    SELECTORS.MONACO_EDITOR + ' .monaco-editor-background',
    { timeout: selectorTimeout },
  );

  // Wait for editor content (view lines) to be visible - indicates LSP has processed the file
  const viewLines = page.locator('.monaco-editor .view-lines .view-line');
  await viewLines
    .first()
    .waitFor({ state: 'visible', timeout: selectorTimeout });
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
