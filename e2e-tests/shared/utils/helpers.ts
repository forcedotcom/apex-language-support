/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, type Page } from '@playwright/test';
import { executeCommandWithCommandPalette } from '../pages/commands';
import { upsertSettings } from '../pages/settings';
import { QUICK_INPUT_WIDGET, TAB, TAB_CLOSE_BUTTON, WORKBENCH } from './locators';

type ConsoleError = { text: string; url?: string };
type NetworkError = { status: number; url: string; description: string };

const NON_CRITICAL_ERROR_PATTERNS: readonly string[] = [
  // VS Code Web expected missing resources
  'favicon.ico',
  'sourcemap',
  'webPackagePaths.js',
  'workbench.web.main.nls.js',
  // IndexedDB shutdown noise in web
  'idbtransaction',
  'indexeddb database',
  'Long running operations during shutdown',
  'marketplace.visualstudio.com',
  "Activating extension 'vscode.typescript-language-features' failed",
  'CodeExpectedError',
  'Failed to load resource',
  'vscode-userdata:/user/caches/cachedconfigurations',
  'vsliveshare',
  'punycode',
  'selectedStep',
  'onWillSaveTextDocument',
  'Throttler is disposed',
  'vscode-log:',
  'tasks.log',
  'theme-defaults/themes',
  'light_modern.json',
  'Failed to fetch',
  'NO_COLOR',
  'Content Security Policy',
  'Applying inline style violates',
  'Unable to resolve resource walkThrough://',
  'SourceMembers timed out after',
  'Blocked script execution',
  'vscode-webview://',
  'Failed to write JSON test result file',
  'callback must be a function',
  'Unable to resolve nonexistent file',
  'testResults',
  'workspaceStorage',
  // LSP and Apex extension specific
  'Request textDocument/diagnostic failed',
  'Request textDocument/completion failed',
  'Unhandled method textDocument/completion',
  'Request textDocument/hover failed',
  'Request textDocument/definition failed',
  'apex.tmLanguage',
  'grammars/apex.tmLanguage',
  'Unable to load and parse grammar',
] as const;

const NON_CRITICAL_NETWORK_PATTERNS: readonly string[] = [
  'webPackagePaths.js',
  'workbench.web.main.nls.js',
  'marketplace.visualstudio.com',
  'vscode-unpkg.net',
  'apex.tmLanguage',
  'grammars/apex.tmLanguage',
] as const;

export const setupConsoleMonitoring = (page: Page): ConsoleError[] => {
  const consoleErrors: ConsoleError[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), url: msg.location()?.url || '' });
    }
  });
  return consoleErrors;
};

export const setupNetworkMonitoring = (page: Page): NetworkError[] => {
  const networkErrors: NetworkError[] = [];
  page.on('response', response => {
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

export const filterErrors = (errors: ConsoleError[]): ConsoleError[] =>
  errors.filter(e => {
    const t = e.text.toLowerCase();
    const u = (e.url ?? '').toLowerCase();
    return !NON_CRITICAL_ERROR_PATTERNS.some(
      p => t.includes(p.toLowerCase()) || u.includes(p.toLowerCase())
    );
  });

export const filterNetworkErrors = (errors: NetworkError[]): NetworkError[] =>
  errors.filter(e => {
    const u = e.url.toLowerCase();
    const d = e.description.toLowerCase();
    return !NON_CRITICAL_NETWORK_PATTERNS.some(
      p => u.includes(p.toLowerCase()) || d.includes(p.toLowerCase())
    );
  });

/** Wait for VS Code workbench to load. For web, navigates to /. For desktop, just waits. */
export const waitForVSCodeWorkbench = async (
  page: Page,
  navigate = true
): Promise<void> => {
  if (isDesktop()) {
    await page.waitForSelector(WORKBENCH, { timeout: 60_000 });
    return;
  }

  if (navigate) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  }
  await page.waitForSelector(WORKBENCH, { timeout: 60_000 });
};

/** Assert that Welcome/Walkthrough tab exists and is visible - useful for debugging startup issues */
export const assertWelcomeTabExists = async (page: Page): Promise<void> => {
  const welcomeTab = page.getByRole('tab', { name: /Welcome|Walkthrough/i }).first();
  await expect(
    welcomeTab,
    'Welcome/Walkthrough tab should exist after VS Code startup'
  ).toBeVisible({ timeout: 10_000 });
};

/** Dismiss any open quick input widgets by pressing Escape until none visible */
export const dismissAllQuickInputWidgets = async (page: Page): Promise<void> => {
  const quickInput = page.locator(QUICK_INPUT_WIDGET);
  for (let i = 0; i < 3; i++) {
    if (await quickInput.isVisible({ timeout: 200 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await quickInput.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
    } else {
      break;
    }
  }
};

/** Close VS Code Welcome/Walkthrough tabs if they're open */
export const closeWelcomeTabs = async (page: Page): Promise<void> => {
  const workbench = page.locator(WORKBENCH);

  await expect(async () => {
    await dismissAllQuickInputWidgets(page);
    await workbench.click({ timeout: 5000 });

    const welcomeTabs = page.getByRole('tab', { name: /Welcome|Walkthrough/i });
    const count = await welcomeTabs.count();

    if (count === 0) {
      return;
    }

    const welcomeTab = welcomeTabs.first();
    await welcomeTab.click({ timeout: 5000, force: true });
    await expect(welcomeTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 5000,
    });

    await dismissAllQuickInputWidgets(page);

    const closeButton = welcomeTab.locator(TAB_CLOSE_BUTTON);
    if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const quickInput = page.locator(QUICK_INPUT_WIDGET);
      const widgetVisible = await quickInput.isVisible({ timeout: 200 }).catch(() => false);
      if (widgetVisible) {
        await dismissAllQuickInputWidgets(page);
      }
      await closeButton.click({ timeout: 5000, force: true });
      await welcomeTab.waitFor({ state: 'detached', timeout: 10_000 });
    } else {
      await page.keyboard.press('Control+w');
      await welcomeTab.waitFor({ state: 'detached', timeout: 10_000 });
    }

    const remainingCount = await welcomeTabs.count();
    if (remainingCount > 0) {
      throw new Error(`Still ${remainingCount} welcome tab(s) remaining`);
    }
  }).toPass({ timeout: 30_000 });
};

/** Closes any visible Settings tabs */
export const closeSettingsTab = async (page: Page): Promise<void> => {
  const settingsTab = page.locator(TAB).filter({ hasText: /Settings/i }).first();
  const isSettingsVisible = await settingsTab.isVisible().catch(() => false);
  if (isSettingsVisible) {
    const closeButton = settingsTab.locator(TAB_CLOSE_BUTTON);
    await closeButton.click();
    await settingsTab.waitFor({ state: 'detached', timeout: 5000 });
  }
};

/** Wait for workspace file system to be ready by checking for sfdx-project.json in Explorer */
export const waitForWorkspaceReady = async (
  page: Page,
  timeout = 30_000
): Promise<void> => {
  const projectFile = page.getByRole('treeitem', { name: /sfdx-project\.json/ });
  await projectFile.waitFor({ state: 'visible', timeout }).catch(() => {
    throw new Error('sfdx-project.json not found - Salesforce project may not be loaded');
  });
};

export const typingSpeed = 50;

/** Returns true if running on desktop (Electron), regardless of platform */
export const isDesktop = (): boolean => process.env.VSCODE_DESKTOP === '1';

/** Returns true if running on macOS desktop (Electron) */
export const isMacDesktop = (): boolean =>
  process.env.VSCODE_DESKTOP === '1' && process.platform === 'darwin';

/** Returns true if running on Windows desktop (Electron) */
export const isWindowsDesktop = (): boolean =>
  process.env.VSCODE_DESKTOP === '1' && process.platform === 'win32';

/** Returns true if running in VS Code web (not desktop Electron) */
export const isVSCodeWeb = (): boolean => process.env.VSCODE_DESKTOP !== '1';

/** Validate no critical console or network errors occurred during test execution */
export const validateNoCriticalErrors = async (
  test: { step: (name: string, fn: () => Promise<void>) => Promise<void> },
  consoleErrors: ConsoleError[],
  networkErrors?: NetworkError[]
): Promise<void> => {
  await test.step('validate no critical errors', async () => {
    const criticalConsole = filterErrors(consoleErrors);
    const criticalNetwork = networkErrors ? filterNetworkErrors(networkErrors) : [];
    expect(
      criticalConsole,
      `Console errors: ${criticalConsole.map(e => e.text).join(' | ')}`
    ).toHaveLength(0);
    if (networkErrors) {
      expect(
        criticalNetwork,
        `Network errors: ${criticalNetwork.map(e => e.description).join(' | ')}`
      ).toHaveLength(0);
    }
    await Promise.resolve();
  });
};

/**
 * Disable Monaco editor auto-closing features (brackets, quotes, etc.) to prevent duplicates during typing.
 */
export const disableMonacoAutoClosing = async (page: Page): Promise<void> => {
  await upsertSettings(page, {
    'editor.autoClosingBrackets': 'never',
    'editor.autoClosingQuotes': 'never',
    'editor.autoClosingOvertype': 'never',
  });
  await closeSettingsTab(page);
};

/**
 * Re-enable Monaco editor auto-closing features with default language-defined behavior.
 */
export const enableMonacoAutoClosing = async (page: Page): Promise<void> => {
  await upsertSettings(page, {
    'editor.autoClosingBrackets': 'languageDefined',
    'editor.autoClosingQuotes': 'languageDefined',
    'editor.autoClosingOvertype': 'auto',
  });
  await closeSettingsTab(page);
};

/**
 * Ensure the secondary sidebar (auxiliary bar, typically used for Chat/Copilot) is hidden.
 * Idempotent - only hides if currently visible.
 */
export const ensureSecondarySideBarHidden = async (page: Page): Promise<void> => {
  const auxiliaryBar = page.locator('.part.auxiliarybar');
  const isVisible = await auxiliaryBar.isVisible().catch(() => false);

  if (isVisible) {
    await executeCommandWithCommandPalette(page, 'View: Hide Secondary Side Bar');
    await auxiliaryBar.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
};
