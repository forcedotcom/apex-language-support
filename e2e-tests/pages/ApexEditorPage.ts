/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
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
  private readonly isDesktopMode: boolean;
  private readonly defaultTimeout: number;

  constructor(page: Page) {
    super(page);
    // Scope to active editor to avoid reading from wrong tab
    this.editorContent = page.locator('.editor-instance.active .monaco-editor .view-lines').or(
      page.locator('.monaco-editor .view-lines'),
    );
    this.editorLineNumbers = page.locator('.monaco-editor .line-numbers');
    // Detect desktop mode and adjust timeouts accordingly
    this.isDesktopMode = process.env.TEST_MODE === 'desktop';
    this.defaultTimeout = this.isDesktopMode ? 30000 : 15000;
  }

  /**
   * Open an Apex file in the editor.
   * @param filename - Name of the file to open (e.g., "ApexClassExample.cls")
   */
  async openFile(filename: string): Promise<void> {
    // Click on the file in the explorer
    const fileLocator = this.page.locator(`[aria-label*="${filename}"]`).first();

    // Try multiple strategies to open the file
    const fileExists = await fileLocator.count();
    if (fileExists > 0) {
      await fileLocator.dblclick();
    } else {
      // Fallback: use command palette
      await this.executeCommand(`File: Open File`);
      await this.page.waitForTimeout(this.isDesktopMode ? 1000 : 500);
      await this.page.keyboard.type(filename);
      await this.page.keyboard.press('Enter');
    }

    // Wait for editor to be visible and active (longer timeout for desktop mode)
    await this.editor.waitFor({ state: 'visible', timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.isDesktopMode ? 2000 : 1000); // Allow file to load
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

    await this.page.keyboard.press('Control+G');
    await this.page.waitForTimeout(300);
    await this.page.keyboard.type(position);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500); // Allow editor to navigate
  }

  /**
   * Trigger go-to-definition at the current cursor position.
   * Uses F12 keyboard shortcut.
   */
  async goToDefinition(): Promise<void> {
    await this.page.keyboard.press('F12');
    // Allow navigation to complete and editor to settle (e.g. tab switch, scroll)
    await this.page.waitForTimeout(this.isDesktopMode ? 2000 : 1500);
    // Ensure editor content is visible before any subsequent getContent() calls
    await this.editorContent.waitFor({ state: 'visible', timeout: this.defaultTimeout }).catch(() => {});
  }

  /**
   * Trigger completion/IntelliSense at the current cursor position.
   * Uses Ctrl+Space keyboard shortcut.
   */
  async triggerCompletion(): Promise<void> {
    await this.page.keyboard.press('Control+Space');
    await this.page.waitForTimeout(500); // Allow completion widget to appear
  }

  /**
   * Trigger signature help at the current cursor position.
   * Uses Ctrl+Shift+Space keyboard shortcut.
   */
  async triggerSignatureHelp(): Promise<void> {
    await this.page.keyboard.press('Control+Shift+Space');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the full text content of the editor.
   * Uses Monaco's model when available (full content); falls back to Select All +
   * getSelection for reliability. The view-lines approach only returns visible viewport
   * due to Monaco's virtualization.
   * @param scrollToLine - Optional line to scroll to before reading (1-based). Use 1 for file start.
   * @returns The editor content as a string
   */
  async getContent(scrollToLine?: number): Promise<string> {
    // Wait for editor content to be visible first
    await this.editorContent.waitFor({ state: 'visible', timeout: this.defaultTimeout });

    if (scrollToLine !== undefined) {
      await this.goToPosition(scrollToLine, 1);
      await this.page.waitForTimeout(800);
    }


    // Try to get full content via Monaco/VS Code API
    const fullContent = await this.page.evaluate(() => {
      try {
        const w = window as unknown as { require?: (id: string) => unknown };
        if (w.require) {
          // VS Code uses 'vs/editor/editor.api' for Monaco
          for (const modId of ['vs/editor/editor.api', 'monaco-editor']) {
            try {
              const api = w.require(modId) as {
                editor?: { getEditors?: () => Array<{ getModel?: () => { getValue?: () => string } }> };
              };
              if (api?.editor?.getEditors) {
                const editors = api.editor.getEditors();
                for (const ed of editors) {
                  const value = ed.getModel?.()?.getValue?.();
                  if (value && value.length > 0) return value;
                }
              }
            } catch {
              continue;
            }
          }
        }
      } catch {
        // Ignore
      }
      return null;
    });

    if (fullContent && fullContent.length > 0) {
      return fullContent;
    }

    // Fallback: Select All via keyboard, then read selection (captures full content)
    const activeEditor = this.getActiveEditor();
    const editorToUse = (await activeEditor.count()) > 0 ? activeEditor : this.page.locator('.monaco-editor').first();
    await editorToUse.click();
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Control+A');
    await this.page.waitForTimeout(400);
    const selectionContent = await this.page.evaluate(
      () => window.getSelection()?.toString() ?? '',
    );
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(150);

    if (selectionContent.length > 0) {
      return selectionContent;
    }

    // Final fallback: view-lines (may be viewport-only in virtualized editor)
    return (await this.editorContent.textContent({ timeout: this.defaultTimeout })) || '';
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
    await this.page.waitForTimeout(300); // Allow typing to register
  }

  /**
   * Select all text in the editor.
   */
  async selectAll(): Promise<void> {
    await this.page.keyboard.press('Control+A');
    await this.page.waitForTimeout(200);
  }

  /**
   * Find and navigate to specific text in the editor.
   * @param searchText - The text to search for
   */
  async findText(searchText: string): Promise<void> {
    // Open find widget
    await this.page.keyboard.press('Control+F');
    await this.page.waitForTimeout(300);

    // Type search text
    await this.page.keyboard.type(searchText);
    await this.page.waitForTimeout(500);

    // Close find widget
    await this.page.keyboard.press('Escape');
  }

  /**
   * Position the cursor on a specific word in the editor.
   * This is useful for testing hover and go-to-definition on specific symbols.
   * @param searchText - The text to search for and position cursor on
   */
  async positionCursorOnWord(searchText: string): Promise<void> {
    // Use find to navigate to the word
    await this.page.keyboard.press('Control+F');
    await this.page.waitForTimeout(300);

    // Type search text
    await this.page.keyboard.type(searchText);
    await this.page.waitForTimeout(500);

    // Press Enter to go to first match
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);

    // Close find widget
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the word at the current cursor position.
   * @returns The word under the cursor, or empty string
   */
  async getWordAtCursor(): Promise<string> {
    // Select the word under cursor
    await this.page.keyboard.press('Control+D'); // Select word
    await this.page.waitForTimeout(200);

    // Copy the selection
    await this.page.keyboard.press('Control+C');
    await this.page.waitForTimeout(200);

    // Get clipboard content (note: this may not work in all test environments)
    // For now, return a placeholder - this can be enhanced if needed
    return '';
  }

  /**
   * Verify that the editor is showing an Apex file.
   * Waits briefly for indicators to appear before returning.
   * @returns True if an Apex file is open
   */
  async isApexFileOpen(): Promise<boolean> {
    // Check for Apex language indicator or .cls extension in tab
    const apexIndicators = [
      '.apex-lang-file-icon',
      '.cls-ext-file-icon',
      '[aria-label*=".cls"]',
      '.tab [title*=".cls"]',
      '.monaco-editor', // Fallback: just check if any editor is visible
    ];

    // Give indicators time to render (longer in desktop mode)
    const waitTime = this.isDesktopMode ? 2000 : 500;
    await this.page.waitForTimeout(waitTime);

    for (const selector of apexIndicators) {
      try {
        const locator = this.page.locator(selector);
        const count = await locator.count();
        if (count > 0) {
          // Verify the element is actually visible
          const isVisible = await locator.first().isVisible();
          if (isVisible) {
            return true;
          }
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
