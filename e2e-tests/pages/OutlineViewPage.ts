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
  findAndActivateOutlineView,
  validateApexSymbolsInOutline,
  captureOutlineViewScreenshot,
} from '../utils/outline-helpers';
import { detectOutlineSymbols } from '../utils/lsp-testing';
import { SELECTORS, OUTLINE_SELECTORS } from '../utils/constants';

/**
 * Symbol information from the outline view.
 */
export interface OutlineSymbol {
  /** Symbol name (e.g., "ApexClassExample", "sayHello") */
  name: string;
  /** Symbol type (e.g., "class", "method", "field", "enum") */
  type: string;
  /** Whether the symbol is visible in the outline */
  visible: boolean;
  /** Child symbols (for nested structures) */
  children?: OutlineSymbol[];
}

/**
 * Page object for Apex outline view interactions.
 * Provides methods for:
 * - Opening and navigating the outline view
 * - Finding and validating symbols
 * - Verifying outline structure and hierarchy
 */
export class OutlineViewPage extends BasePage {
  private readonly outlineTree: Locator;
  private readonly outlineItems: Locator;
  private readonly isDesktopMode: boolean;
  private readonly defaultTimeout: number;

  constructor(page: Page) {
    super(page);
    this.outlineTree = page.locator(SELECTORS.OUTLINE_TREE);
    this.outlineItems = page.locator(
      '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
    );
    // Detect desktop mode and adjust timeouts accordingly
    this.isDesktopMode = process.env.TEST_MODE === 'desktop';
    this.defaultTimeout = this.isDesktopMode ? 30000 : 15000;
  }

  /**
   * Open the outline view in the sidebar.
   * Uses the existing utility function for reliable outline activation.
   */
  async open(): Promise<void> {
    await findAndActivateOutlineView(this.page);
  }

  /**
   * Check if the outline view is currently visible.
   * @returns True if the outline view is visible
   */
  async isOutlineVisible(): Promise<boolean> {
    // Try multiple selectors for outline view
    for (const selector of OUTLINE_SELECTORS) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        const locator = this.page.locator(selector).first();
        try {
          await locator.waitFor({
            state: 'visible',
            timeout: this.defaultTimeout,
          });
          return true;
        } catch {
          continue;
        }
      }
    }
    return false;
  }

  /**
   * Alias for isOutlineVisible() to maintain compatibility.
   * @returns True if the outline view is visible
   */
  async isVisible(): Promise<boolean> {
    return this.isOutlineVisible();
  }

  /**
   * Get all symbols displayed in the outline view.
   * @returns Array of outline symbols with their names and types
   */
  async getSymbols(): Promise<OutlineSymbol[]> {
    const symbols: OutlineSymbol[] = [];
    const count = await this.outlineItems.count();

    for (let i = 0; i < count; i++) {
      const item = this.outlineItems.nth(i);
      const text = await this.getText(item);

      // Extract symbol name and type from the item
      // Format typically: "[icon] SymbolName"
      const name = text.trim();

      if (name) {
        symbols.push({
          name,
          type: await this.getSymbolType(item),
          visible: await item.isVisible(),
        });
      }
    }

    return symbols;
  }

  /**
   * Find a specific symbol by name in the outline.
   * Handles virtualized Monaco lists by using keyboard navigation to scroll
   * through off-screen symbols, since Monaco only renders visible rows in the DOM.
   * Falls back to DOM lookup for symbols that exist but may be outside visible area.
   * @param symbolName - Name of the symbol to find
   * @returns The symbol if found, or null
   */
  async findSymbol(symbolName: string): Promise<OutlineSymbol | null> {
    // First check currently visible symbols
    let symbols = await this.getSymbols();
    let match = symbols.find((s) => s.name.includes(symbolName));
    if (match) return match;

    // Monaco lists are virtualized - use keyboard navigation to scroll
    // through off-screen items. Focus the outline tree and press ArrowDown
    // to bring items into view.
    const treeContainer = this.outlineItems.first();
    const isTreeVisible = await treeContainer.isVisible().catch(() => false);
    if (!isTreeVisible) return null;

    // Click the first visible outline item to focus the tree
    await treeContainer.click();
    await this.page.waitForTimeout(200);

    // Press Home to go to the top of the tree first
    await this.page.keyboard.press('Home');
    await this.page.waitForTimeout(200);

    // Navigate down through the tree using keyboard (inner enum is deep in the tree)
    const maxNavigationSteps = 80;
    for (let i = 0; i < maxNavigationSteps; i++) {
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(100);

      // Re-check the currently visible symbols
      symbols = await this.getSymbols();
      match = symbols.find((s) => s.name.includes(symbolName));
      if (match) return match;
    }

    // Fallback: use scoped locator for symbols that exist in outline DOM
    // (Monaco may render off-screen rows in some configurations)
    const outlineRow = this.page
      .locator(
        '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
      )
      .filter({ hasText: symbolName })
      .first();
    if ((await outlineRow.count()) > 0 && (await outlineRow.isVisible())) {
      const text = (await outlineRow.textContent())?.trim() || '';
      return {
        name: text,
        type: await this.getSymbolType(outlineRow),
        visible: true,
      };
    }

    return null;
  }

  /**
   * Detect specific Apex symbols in the outline.
   * Uses the existing utility function for optimized symbol detection.
   * @param expectedSymbols - Array of symbol names to detect
   * @returns Detection results with found symbols and count
   */
  async detectSymbols(
    expectedSymbols: string[],
  ): Promise<{ foundSymbols: string[]; foundCount: number }> {
    return await detectOutlineSymbols(this.page, expectedSymbols);
  }

  /**
   * Validate that expected Apex symbols are present in the outline.
   * Uses the existing utility function for symbol validation.
   * @param expectedSymbols - Expected symbol structure
   * @returns Validation results
   */
  async validateSymbols(expectedSymbols: {
    className: string;
    classType: 'class' | 'interface' | 'enum';
    methods?: readonly { name: string }[];
    totalSymbols?: number;
  }): Promise<{
    classFound: boolean;
    methodsFound: string[];
    totalSymbolsCount: number;
  }> {
    return await validateApexSymbolsInOutline(this.page, expectedSymbols);
  }

  /**
   * Get the total count of symbols in the outline.
   * @returns The number of outline items
   */
  async getSymbolCount(): Promise<number> {
    return await this.outlineItems.count();
  }

  /**
   * Expand a symbol in the outline to show its children.
   * @param symbolName - Name of the symbol to expand
   */
  async expandSymbol(symbolName: string): Promise<void> {
    const symbolItem = this.page
      .locator(
        '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
      )
      .filter({ hasText: symbolName })
      .first();

    // Look for expand/collapse arrow
    const twistie = symbolItem.locator(
      '.monaco-tl-twistie, .codicon-chevron-right',
    );
    const twistieExists = (await twistie.count()) > 0;

    if (twistieExists) {
      await twistie.click();
      await this.page.waitForTimeout(300); // Allow expansion animation
    }
  }

  /**
   * Collapse a symbol in the outline to hide its children.
   * @param symbolName - Name of the symbol to collapse
   */
  async collapseSymbol(symbolName: string): Promise<void> {
    const symbolItem = this.page
      .locator(
        '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
      )
      .filter({ hasText: symbolName })
      .first();

    // Look for collapse arrow
    const twistie = symbolItem.locator(
      '.monaco-tl-twistie, .codicon-chevron-down',
    );
    const twistieExists = (await twistie.count()) > 0;

    if (twistieExists) {
      await twistie.click();
      await this.page.waitForTimeout(300); // Allow collapse animation
    }
  }

  /**
   * Click on a symbol in the outline to navigate to it in the editor.
   * @param symbolName - Name of the symbol to click
   */
  async clickSymbol(symbolName: string): Promise<void> {
    const symbolItem = this.page
      .locator(
        '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
      )
      .filter({ hasText: symbolName })
      .first();

    await symbolItem.click();
    await this.page.waitForTimeout(500); // Allow navigation
  }

  /**
   * Check if a symbol is expanded (showing children).
   * @param symbolName - Name of the symbol to check
   * @returns True if the symbol is expanded
   */
  async isSymbolExpanded(symbolName: string): Promise<boolean> {
    const symbolItem = this.page
      .locator(
        '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
      )
      .filter({ hasText: symbolName })
      .first();

    // Check for expanded state indicator
    const expandedIndicator = symbolItem.locator(
      '.codicon-chevron-down, [aria-expanded="true"]',
    );
    return (await expandedIndicator.count()) > 0;
  }

  /**
   * Capture a screenshot of the outline view for debugging.
   * Uses the existing utility function.
   * @param filename - Screenshot filename (without extension)
   */
  async captureScreenshot(filename: string): Promise<void> {
    await captureOutlineViewScreenshot(this.page, filename);
  }

  /**
   * Wait for the outline to be populated with symbols.
   * @param minSymbols - Minimum number of symbols expected
   * @param timeout - Optional timeout in milliseconds (defaults to mode-specific timeout)
   */
  async waitForSymbols(minSymbols = 1, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout || (this.isDesktopMode ? 20000 : 12000);
    const startTime = Date.now();

    while (Date.now() - startTime < effectiveTimeout) {
      const count = await this.getSymbolCount();
      if (count >= minSymbols) {
        return;
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error(
      `Timeout waiting for outline to have at least ${minSymbols} symbols (found: ${await this.getSymbolCount()})`,
    );
  }

  /**
   * Refresh the outline view.
   */
  async refresh(): Promise<void> {
    // Focus on the outline view
    await this.outlineTree.click();
    await this.page.waitForTimeout(200);

    // Send refresh command (if available)
    // Note: VS Code outline typically refreshes automatically
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the symbol type from an outline item.
   * @param item - The outline item locator
   * @returns The symbol type (class, method, field, etc.)
   * @private
   */
  private async getSymbolType(item: Locator): Promise<string> {
    // Check for symbol icon classes
    const iconClasses = [
      { selector: '.codicon-symbol-class', type: 'class' },
      { selector: '.codicon-symbol-method', type: 'method' },
      { selector: '.codicon-symbol-field', type: 'field' },
      { selector: '.codicon-symbol-property', type: 'property' },
      { selector: '.codicon-symbol-enum', type: 'enum' },
      { selector: '.codicon-symbol-interface', type: 'interface' },
      { selector: '.codicon-symbol-variable', type: 'variable' },
      { selector: '.codicon-symbol-constructor', type: 'constructor' },
    ];

    for (const { selector, type } of iconClasses) {
      const count = await item.locator(selector).count();
      if (count > 0) {
        return type;
      }
    }

    return 'unknown';
  }
}
