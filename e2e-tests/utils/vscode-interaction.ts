/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, type Page } from '@playwright/test';
import { SELECTORS } from './constants';
import {
  waitForVSCodeWorkbench,
  closeWelcomeTabs,
  getModifierShortcut,
  isDesktop,
} from '../shared/utils/helpers';
import {
  executeCommandWithCommandPalette,
  waitForCommandToBeAvailable,
} from '../shared/pages/commands';
import { TAB_CLOSE_BUTTON } from '../shared/utils/locators';
import { expandWorkspaceFolders } from '../shared/utils/fileHelpers';

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
 * Verifies that Salesforce Services completed activation.
 *
 * Installing the extension is insufficient: VS Code can leave an extension
 * indefinitely in the "Activating..." state. The Running Extensions editor is
 * the only black-box signal available to the web E2E browser for distinguishing
 * that state from a completed activation.
 */
export const waitForSalesforceServicesActivation = async (
  page: Page,
  timeout = 30_000,
): Promise<void> => {
  await executeCommandWithCommandPalette(
    page,
    'Developer: Show Running Extensions',
  );

  const runningExtensions = page.locator('.runtime-extensions-editor');
  await runningExtensions.waitFor({ state: 'visible', timeout: 10_000 });

  const servicesExtension = runningExtensions
    .locator('.monaco-list-row')
    .filter({ hasText: 'Salesforce Services' })
    .first();

  await expect(
    servicesExtension,
    'Salesforce Services should be present in Running Extensions',
  ).toBeVisible({ timeout: 10_000 });

  await expect(async () => {
    const status = (await servicesExtension.innerText()).trim();
    if (!/(?:Startup )?Activation:\s*\d+(?:\.\d+)?ms/.test(status)) {
      throw new Error(
        `Salesforce Services has not completed activation. Running Extensions reports: "${status}"`,
      );
    }
  }, 'Waiting for Salesforce Services to finish activating').toPass({
    timeout,
  });

  const runningExtensionsTab = page
    .getByRole('tab', { name: /Running Extensions/i })
    .first();
  await page.keyboard.press('Escape');
  await expect(async () => {
    if (!(await runningExtensionsTab.isVisible().catch(() => false))) {
      return;
    }

    const closeButton = runningExtensionsTab.locator(TAB_CLOSE_BUTTON);
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click({ timeout: 3000, force: true });
    } else {
      await runningExtensionsTab.click({ timeout: 3000, force: true });
      await page.keyboard.press(getModifierShortcut('w'));
    }

    await runningExtensionsTab.waitFor({ state: 'hidden', timeout: 3000 });
  }, 'Closing the Running Extensions editor').toPass({
    timeout: 10_000,
    intervals: [100, 250, 500],
  });
};

/**
 * Verifies workspace files are loaded.
 *
 * @param page - Playwright page instance
 * @returns Number of Apex files found
 */
export const verifyWorkspaceFiles = async (page: Page): Promise<number> => {
  await closeWelcomeTabs(page);
  const explorer = page.locator(SELECTORS.EXPLORER);
  await explorer.waitFor({ state: 'visible', timeout: 30_000 });
  await expandWorkspaceFolders(page);

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
  await closeWelcomeTabs(page);
  // Desktop mode requires longer timeouts
  const isDesktopMode = isDesktop();
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

  // Verify that file content is actually loaded in the editor.
  // Use EDITOR_PART scope to exclude interactive-input-editor (Chat/Copilot) which also has .view-lines.
  const editorText = editorPart.locator('.monaco-editor .view-lines').first();
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
 * Waits for workspace ingestion to complete by polling the status bar.
 * The Apex LSP extension updates the status bar to "Apex" (ready state) when
 * workspace ingestion completes, which means cross-file symbol resolution is available.
 *
 * @param page - Playwright page instance
 * @param options - `timeout` (default: 45s desktop, 30s web) and `strict`.
 *   When `strict` is false (default), a timeout is logged as a warning and the
 *   call resolves — best-effort readiness for callers (e.g. same-file flows via
 *   `waitForLSPInitialization`) that can still make progress. When `strict` is
 *   true, a timeout THROWS after capturing the status-bar text, so a caller that
 *   requires full ingestion (cross-file navigation) fails/retries instead of
 *   racing ahead against an incomplete workspace.
 */
export const waitForWorkspaceIngestion = async (
  page: Page,
  options: { timeout?: number; strict?: boolean } = {},
): Promise<void> => {
  const { timeout, strict = false } = options;
  const isDesktopMode = isDesktop();
  const defaultTimeout = timeout ?? (isDesktopMode ? 45_000 : 30_000);

  // Poll the status bar for the ready state. The extension shows
  // "Apex-LS-TS Server Ready" when workspace ingestion is complete,
  // and various loading messages during ingestion (with $(sync~spin) icon).
  // We wait for the status bar to show the ready message or at least
  // NOT contain loading/spinning indicators.
  try {
    await page.waitForFunction(
      () => {
        const statusBar = document.querySelector(
          '[id="workbench.parts.statusbar"]',
        );
        if (!statusBar) return false;

        const statusText = statusBar.textContent || '';
        // Look for the Apex LSP status item
        // Ready state: "Apex-LS-TS Server Ready" (with $(check) icon)
        // Loading states: various messages with $(sync~spin) icon
        if (statusText.includes('Apex-LS-TS Server Ready')) {
          return true;
        }
        // Also check for legacy "Apex" status (if older build)
        const apexStatusMatch = statusText.match(
          /Apex(?:-LS-TS)?[\s:]*(.*?)(?=\n|$)/i,
        );
        if (!apexStatusMatch) return false;

        const apexStatus = apexStatusMatch[1].trim();
        // Not ready if it contains loading/scanning/compressing/sending indicators
        return (
          apexStatus === '' ||
          (!apexStatus.toLowerCase().includes('loading') &&
            !apexStatus.toLowerCase().includes('scanning') &&
            !apexStatus.toLowerCase().includes('indexing') &&
            !apexStatus.toLowerCase().includes('compressing') &&
            !apexStatus.toLowerCase().includes('sending') &&
            !apexStatus.toLowerCase().includes('found') &&
            !apexStatus.toLowerCase().includes('created') &&
            !apexStatus.toLowerCase().includes('batches'))
        );
      },
      { timeout: defaultTimeout },
    );
  } catch {
    // Capture the actual status-bar state for diagnostics in both modes.
    const statusBarText = await page.evaluate(() => {
      const statusBar = document.querySelector(
        '[id="workbench.parts.statusbar"]',
      );
      return statusBar?.textContent || 'STATUS BAR NOT FOUND';
    });
    const message = `Workspace ingestion wait timed out after ${defaultTimeout}ms. Status bar: "${statusBarText}"`;
    if (strict) {
      // Cross-file callers must NOT proceed against an incomplete workspace —
      // surface the timeout so the test fails/retries instead of racing.
      throw new Error(message);
    }
    console.warn(`⚠️  ${message}`);
  }
};

/**
 * Waits for LSP server to initialize and workspace ingestion to complete.
 * Waits for Monaco editor to be ready, view lines (content) to be visible,
 * and workspace indexing to finish (so cross-file navigation works).
 *
 * @param page - Playwright page instance
 */
export const waitForLSPInitialization = async (page: Page): Promise<void> => {
  const isDesktopMode = isDesktop();
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

  // Wait for workspace ingestion to complete - critical for cross-file navigation
  // Without this, go-to-definition on cross-file references may fail because
  // the target files haven't been indexed yet.
  await waitForWorkspaceIngestion(page);
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
