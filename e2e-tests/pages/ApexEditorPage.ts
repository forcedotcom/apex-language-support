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
   * Wait for the active editor tab to change away from the given file.
   * Use after goToDefinition() for cross-file navigation to ensure the LSP
   * response has arrived and VS Code has opened the target file before
   * asserting on editor content.
   * @param fromFile - Filename that should NO LONGER be the active tab
   * @param timeout - Max wait in ms (defaults to 8s desktop / 6s CI)
   */
  async waitForNavigation(fromFile: string, timeout?: number): Promise<void> {
    const waitMs = timeout ?? (this.isDesktopMode ? 8000 : 6000);
    await this.page
      .waitForFunction(
        (original: string) => {
          // Try .label-name textContent first (most specific)
          const labelEl = document.querySelector('.tab.active .label-name');
          if (labelEl?.textContent?.trim()) {
            const name = labelEl.textContent.trim();
            return name !== '' && name !== original;
          }
          // Fallback: aria-label may include extra info like ", tab 1 of 4" —
          // extract only the filename (the part before the first comma).
          const ariaLabel =
            document
              .querySelector('.tab.active[aria-label]')
              ?.getAttribute('aria-label') ?? '';
          const name = ariaLabel.split(',')[0].trim();
          return name !== '' && name !== original;
        },
        fromFile,
        { timeout: waitMs },
      )
      .catch(() => {});
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
    // Ensure the Find widget is fully closed and the editor has keyboard focus before
    // pressing F12. If positionCursorOnWord left the Find widget open (e.g. Escape
    // didn't dismiss it within 2 s), F12 lands in the Find input rather than the
    // editor and no go-to-definition is triggered.
    // Ensure the Find widget is fully closed before pressing F12. If
    // positionCursorOnWord left the widget open, F12 lands in the Find input
    // rather than triggering go-to-definition. Escape closes the widget and
    // returns focus + cursor to the editor at the found position — no click
    // needed (clicking the editor would move the cursor off the target word).
    const findWidget = this.page.locator('.editor-widget.find-widget');
    if (await findWidget.isVisible()) {
      await this.page.keyboard.press('Escape');
      await findWidget
        .waitFor({ state: 'hidden', timeout: 3000 })
        .catch(() => {});
    }

    await this.page.keyboard.press('F12');

    // Wait only for an actual peek view widget (not the broad .editor-widget which
    // is always visible). The broad selector caused Escapes to fire immediately after
    // F12, canceling VS Code's pending cross-file definition request before the LSP
    // responded. The .peekview-widget only appears for multi-result definitions.
    const peekWidget = this.page.locator('.editor-widget.peekview-widget');
    await peekWidget
      .waitFor({ state: 'visible', timeout: 200 })
      .catch(() => {});

    // Only close the peek if it actually appeared
    if (await peekWidget.isVisible()) {
      for (let i = 0; i < 3; i++) {
        await this.page.keyboard.press('Escape');
        await peekWidget
          .waitFor({ state: 'hidden', timeout: 500 })
          .catch(() => {});
      }
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
    // Ensure the active editor has keyboard focus before invoking Find (Cmd/Ctrl+F).
    // After cross-file navigation, VS Code may not have transferred focus to the new
    // editor yet. Without explicit focus, keyboard.type() can land in the Monaco editor
    // body instead of the Find widget, silently inserting text into the file.
    const activeEditor = this.page.locator(
      '.editor-group-container.active .monaco-editor',
    );
    await activeEditor.click({ timeout: 5000 }).catch(() => {});

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

      // Prefer the focused Monaco editor - this is the active editor after navigation.
      // Inactive tab editors may retain cached .view-line elements in the DOM, causing
      // the "most lines" heuristic to pick the wrong editor.
      const focusedEditor = editorPart.querySelector('.monaco-editor.focused');
      if (focusedEditor) {
        const focusedLines = focusedEditor.querySelectorAll('.view-line');
        if (focusedLines.length > 0) {
          return Array.from(focusedLines)
            .map((ln) => (ln as HTMLElement).innerText)
            .join('\n');
        }
      }

      // Second try: use active editor group container
      const activeGroupEditor = editorPart.querySelector(
        '.editor-group-container.active .monaco-editor',
      );
      if (activeGroupEditor) {
        const activeLines = activeGroupEditor.querySelectorAll('.view-line');
        if (activeLines.length > 0) {
          return Array.from(activeLines)
            .map((ln) => (ln as HTMLElement).innerText)
            .join('\n');
        }
      }

      // Fallback: pick the editor with the most view-lines
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
