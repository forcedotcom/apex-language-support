/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import {
  findInPage,
  getModifierShortcut,
  goToLineInEditor,
} from '../shared/utils/helpers';
import { waitForLSPInitialization } from '../utils/vscode-interaction';
import { SELECTORS } from '../utils/constants';

/**
 * Page object for Apex editor interactions.
 * Provides methods for:
 * - Opening Apex files
 * - Navigating within the editor
 * - Triggering LSP features (go-to-definition, completion, etc.)
 * - Getting editor content and state
 */
export class ApexEditorPage extends BasePage {
  private readonly editorContent: Locator;
  private readonly editorLineNumbers: Locator;
  private readonly defaultTimeout: number;

  constructor(page: Page) {
    super(page);
    this.editorContent = page
      .locator(SELECTORS.MONACO_EDITOR)
      .first()
      .locator('.view-lines');
    this.editorLineNumbers = page.locator('.monaco-editor .line-numbers');
    const isCI = !!process.env.CI;
    this.defaultTimeout = this.isDesktopMode ? 30000 : isCI ? 25000 : 15000;
  }

  /**
   * Open an Apex file in the editor.
   * @param filename - Name of the file to open (e.g., "ApexClassExample.cls")
   */
  async openFile(filename: string): Promise<void> {
    const fileLocator = this.page
      .locator(`[aria-label*="${filename}"]`)
      .first();

    const fileExists = await fileLocator.count();
    if (fileExists > 0) {
      await fileLocator.dblclick();
    } else {
      await this.executeCommand('File: Open File');
      const quickInput = this.page.locator('.quick-input-widget');
      await quickInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.page.keyboard.type(filename);
      await this.page.keyboard.press('Enter');
      await quickInput
        .waitFor({ state: 'hidden', timeout: 5000 })
        .catch(() => {});
    }

    await this.editor.waitFor({
      state: 'visible',
      timeout: this.defaultTimeout,
    });
    await this.editorContent
      .locator('.view-line')
      .first()
      .waitFor({ state: 'visible', timeout: this.defaultTimeout });
  }

  /**
   * Wait for the Apex language server to be ready.
   * Uses the existing utility function for LSP readiness detection.
   */
  async waitForLanguageServerReady(): Promise<void> {
    await waitForLSPInitialization(this.page);
  }

  /**
   * Navigate to a specific line and column position in the editor.
   * @param line - Line number (1-indexed)
   * @param column - Column number (1-indexed), optional
   */
  async goToPosition(line: number, column?: number): Promise<void> {
    const position = column ? `${line}:${column}` : line.toString();
    await goToLineInEditor(this.page, position);
  }

  /**
   * Trigger go-to-definition at the current cursor position.
   * Uses F12 keyboard shortcut.
   * Waits for peek widget or editor to update, then closes peek if open.
   */
  async goToDefinition(): Promise<void> {
    await this.page.keyboard.press('F12');
    // Wait for either peek widget or editor content to be ready
    const peekWidget = this.page.locator('.editor-widget');
    const settleTimeout = this.isDesktopMode
      ? 5000
      : process.env.CI
        ? 5000
        : 3000;
    await Promise.race([
      peekWidget.waitFor({ state: 'visible', timeout: settleTimeout }),
      this.editorContent.waitFor({ state: 'visible', timeout: settleTimeout }),
    ]).catch(() => {});
    for (let i = 0; i < 3; i++) {
      await this.page.keyboard.press('Escape');
      await peekWidget
        .waitFor({ state: 'hidden', timeout: 500 })
        .catch(() => {});
    }
    await this.editorContent
      .waitFor({ state: 'visible', timeout: this.defaultTimeout })
      .catch(() => {});
  }

  /**
   * Trigger completion/IntelliSense at the current cursor position.
   * Uses Ctrl+Space keyboard shortcut.
   */
  async triggerCompletion(): Promise<void> {
    await this.page.keyboard.press('Control+Space');
    const suggestWidget = this.page.locator(
      '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
    );
    await suggestWidget
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
  }

  /**
   * Trigger signature help at the current cursor position.
   * Uses Ctrl+Shift+Space keyboard shortcut.
   */
  async triggerSignatureHelp(): Promise<void> {
    await this.page.keyboard.press('Control+Shift+Space');
    const signatureWidget = this.page.locator(
      '.monaco-editor .parameter-hints-widget, .editor-widget.parameter-hints',
    );
    await signatureWidget
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
  }

  /**
   * Use Ctrl+F to find text and scroll it into view, then return viewport content.
   * This is the reliable way to verify content after navigation (Monaco virtualizes).
   * @param searchText - Text to search for (scrolls to first match)
   * @returns Viewport content after find (includes the matched text)
   */
  async findAndGetViewportContent(searchText: string): Promise<string> {
    await this.positionCursorOnWord(searchText);
    await this.editorContent.waitFor({ state: 'visible', timeout: 3000 });
    return this.getContent();
  }

  /**
   * Wait for editor content to include specific text (polls until found).
   * Use instead of arbitrary wait() when waiting for typed content to render.
   * Normalizes \u00A0 (non-breaking space) to regular space for reliable matching.
   */
  async waitForContentToInclude(text: string, timeout = 5000): Promise<void> {
    const { expect } = await import('@playwright/test');
    const normalizedText = text.replace(/\u00A0/g, ' ');
    await expect(async () => {
      const content = await this.getContent();
      const normalizedContent = content.replace(/\u00A0/g, ' ');
      expect(
        normalizedContent,
        `Expected content to include "${text}"`,
      ).toContain(normalizedText);
    }).toPass({ timeout });
  }

  /**
   * Get visible viewport content from the main editor.
   * Monaco virtualizes; only visible lines are in the DOM.
   * Use findAndGetViewportContent(searchText) to scroll to specific content first.
   */
  async getContent(): Promise<string> {
    await this.editorContent.waitFor({
      state: 'visible',
      timeout: this.defaultTimeout,
    });
    return this.page.evaluate(() => {
      const editorPart = document.querySelector(
        '[id="workbench.parts.editor"]',
      );
      if (!editorPart) return '';
      const editors = Array.from(editorPart.querySelectorAll('.monaco-editor'));
      const mainEditor = editors.reduce(
        (best, ed) => {
          const lines = ed.querySelectorAll('.view-line').length;
          const bestLines = best
            ? best.querySelectorAll('.view-line').length
            : 0;
          return !best || lines > bestLines ? ed : best;
        },
        null as Element | null,
      );
      if (!mainEditor) return '';
      const lines = mainEditor.querySelectorAll('.view-line');
      return Array.from(lines)
        .map((ln) => (ln as HTMLElement).innerText)
        .join('\n');
    });
  }

  /**
   * Get the current cursor position (line and column).
   * @returns An object with line and column numbers
   */
  async getCursorPosition(): Promise<{ line: number; column: number }> {
    // Get the cursor position from the status bar
    const statusBarPosition = this.page.locator(
      '.statusbar-item[title*="Line"], .statusbar-item[aria-label*="Line"]',
    );

    try {
      const text = await statusBarPosition.textContent();
      if (text) {
        // Parse "Ln X, Col Y" format
        const match = text.match(/Ln\s*(\d+),\s*Col\s*(\d+)/i);
        if (match) {
          return {
            line: parseInt(match[1], 10),
            column: parseInt(match[2], 10),
          };
        }
      }
    } catch {
      // Fallback if status bar parsing fails
    }

    return { line: 1, column: 1 }; // Default fallback
  }

  /**
   * Type text at the current cursor position.
   * @param text - The text to type
   */
  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  /**
   * Select all text in the editor.
   */
  async selectAll(): Promise<void> {
    await this.page.keyboard.press(getModifierShortcut('A'));
  }

  /**
   * Find and navigate to specific text in the editor.
   * @param searchText - The text to search for
   */
  async findText(searchText: string): Promise<void> {
    await findInPage(this.page, searchText);
  }

  /**
   * Position the cursor on a specific word in the editor.
   * @param searchText - The text to search for and position cursor on
   */
  async positionCursorOnWord(searchText: string): Promise<void> {
    await findInPage(this.page, searchText);
  }

  /**
   * Get the word at the current cursor position.
   * @returns The word under the cursor, or empty string
   */
  async getWordAtCursor(): Promise<string> {
    await this.page.keyboard.press(getModifierShortcut('D'));
    await this.page.keyboard.press(getModifierShortcut('C'));
    return '';
  }

  /**
   * Verify that the editor is showing an Apex file.
   * @returns True if an Apex file is open
   */
  async isApexFileOpen(): Promise<boolean> {
    const apexIndicators = [
      '.apex-lang-file-icon',
      '.cls-ext-file-icon',
      '[aria-label*=".cls"]',
      '.tab [title*=".cls"]',
      '.monaco-editor',
    ];

    const timeout = this.isDesktopMode ? 5000 : 3000;
    for (const selector of apexIndicators) {
      try {
        const locator = this.page.locator(selector);
        const count = await locator.count();
        if (count > 0) {
          await locator.first().waitFor({ state: 'visible', timeout });
          return true;
        }
      } catch {
        // Continue to next selector
      }
    }

    return false;
  }

  /**
   * Get the number of visible lines in the editor.
   * @returns The line count
   */
  async getLineCount(): Promise<number> {
    const lineNumbers = await this.editorLineNumbers.count();
    return lineNumbers;
  }

  /**
   * Scroll to a specific line in the editor.
   * @param line - Line number to scroll to
   */
  async scrollToLine(line: number): Promise<void> {
    await this.goToPosition(line);
  }

  /**
   * Check if the editor contains specific text.
   * @param text - The text to search for
   * @returns True if the text is found
   */
  async containsText(text: string): Promise<boolean> {
    const content = await this.getContent();
    return content.includes(text);
  }
}
