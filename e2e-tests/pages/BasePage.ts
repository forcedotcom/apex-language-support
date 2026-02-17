/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Page, Locator } from '@playwright/test';
import { executeCommandWithCommandPalette } from '../shared/pages/commands';
import { SELECTORS } from '../utils/constants';

/**
 * Base page object class for VS Code interactions.
 * Uses shared executeCommandWithCommandPalette (F1, monorepo parity).
 */
export class BasePage {
  protected readonly page: Page;

  protected readonly workbench: Locator;
  protected readonly editor: Locator;
  protected readonly explorer: Locator;
  protected readonly sidebar: Locator;
  protected readonly statusbar: Locator;

  protected readonly isDesktopMode: boolean;
  protected readonly baseTimeout: number;

  constructor(page: Page) {
    this.page = page;
    this.workbench = page.locator(SELECTORS.WORKBENCH);
    this.editor = page.locator(SELECTORS.MONACO_EDITOR);
    this.explorer = page.locator(SELECTORS.EXPLORER);
    this.sidebar = page.locator(SELECTORS.SIDEBAR);
    this.statusbar = page.locator(SELECTORS.STATUSBAR);

    this.isDesktopMode = process.env.TEST_MODE === 'desktop';
    this.baseTimeout = this.isDesktopMode ? 60000 : 30000;
  }

  /**
   * Wait for VS Code workbench to be loaded and ready.
   */
  async waitForWorkbenchLoad(): Promise<void> {
    await this.workbench.waitFor({ state: 'visible', timeout: this.baseTimeout });
  }

  /**
   * Execute a command using the command palette (F1).
   * Uses shared utility for monorepo parity.
   */
  async executeCommand(command: string, _waitForCompletion = true): Promise<void> {
    await executeCommandWithCommandPalette(this.page, command);
  }

  /**
   * Close the command palette or any quick input widget.
   */
  async closeQuickInput(): Promise<void> {
    await this.page.keyboard.press('Escape');
    const quickInput = this.page.locator('.quick-input-widget');
    await quickInput.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
  }

  /**
   * Get the current active editor.
   * @returns The active editor locator
   */
  getActiveEditor(): Locator {
    return this.page.locator('.editor-instance.active .monaco-editor');
  }

  /**
   * Wait for a specific selector to be visible.
   * @param selector - CSS selector to wait for
   * @param timeout - Optional timeout in milliseconds (defaults to mode-specific timeout)
   */
  async waitForSelector(selector: string, timeout?: number): Promise<Locator> {
    const effectiveTimeout = timeout ?? (this.isDesktopMode ? 30000 : 10000);
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout: effectiveTimeout });
    return locator;
  }

  /**
   * Check if a selector exists in the DOM (visible or hidden).
   * @param selector - CSS selector to check
   * @returns True if the element exists
   */
  async selectorExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Focus on the workbench (useful for ensuring keyboard shortcuts work).
   */
  async focusWorkbench(): Promise<void> {
    await this.workbench.click();
  }

  /**
   * Take a screenshot for debugging purposes.
   * @param name - Screenshot filename (without extension)
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `e2e-tests/test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Get text content of a locator.
   * @param locator - The locator to get text from
   * @returns The text content or empty string
   */
  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  /**
   * Check if a locator is visible.
   * @param locator - The locator to check
   * @returns True if visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to a specific line in the editor using Go to Line command.
   * @param line - Line number to navigate to
   */
  async goToLine(line: number): Promise<void> {
    await this.page.keyboard.press('Control+G');
    const widget = this.page.locator('.quick-input-widget');
    await widget.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.keyboard.type(line.toString());
    await this.page.keyboard.press('Enter');
    await widget.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Get the page instance (for advanced operations).
   * @returns The Playwright Page instance
   */
  getPage(): Page {
    return this.page;
  }
}
