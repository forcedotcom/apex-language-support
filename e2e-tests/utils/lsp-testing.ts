/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import {
  findInPage,
  getModifierShortcut,
  isDesktop,
} from '../shared/utils/helpers';
import { SELECTORS } from './constants';
import { findAndActivateOutlineView } from './outline-helpers';
import { ErrorHandler, WaitingStrategies } from './error-handling';
import type { WaitOptions } from './error-handling';

/**
 * Hover test scenario definition.
 */
export interface HoverTestScenario {
  /** Description of what we're testing */
  readonly description: string;
  /** Text to search for to position cursor */
  readonly searchText: string;
  /** Whether to move cursor to end of found text */
  readonly moveToEnd?: boolean;
}

/**
 * Hover test result.
 */
export interface HoverTestResult {
  readonly success: boolean;
}

/**
 * LSP functionality test result.
 */
export interface LSPFunctionalityResult {
  readonly completionTested: boolean;
  readonly symbolsTested: boolean;
  readonly editorResponsive: boolean;
}

/**
 * Symbol detection result.
 */
interface SymbolDetectionResult {
  readonly found: boolean;
  readonly symbolName: string;
  readonly foundSymbols: string[];
}

/**
 * Symbol detection utilities for test optimization.
 */
class SymbolDetectionUtils {
  /**
   * Detects multiple symbols efficiently using batch selectors.
   */
  static async detectSymbols(
    page: Page,
    symbolNames: string[],
  ): Promise<SymbolDetectionResult[]> {
    const results: SymbolDetectionResult[] = [];

    for (const symbolName of symbolNames) {
      const symbolSelectors = [
        `text=${symbolName}`,
        `.outline-tree .monaco-list-row:has-text("${symbolName}")`,
        `[aria-label*="${symbolName}"]`,
        `.monaco-tree .monaco-list-row:has-text("${symbolName}")`,
      ];

      let found = false;
      for (const selector of symbolSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          found = true;
          console.log(`✅ Found LCS symbol: ${symbolName}`);
          break;
        }
      }

      if (!found) {
        console.log(`❌ LCS symbol not found: ${symbolName}`);
      }

      results.push({
        found,
        symbolName,
        foundSymbols: found ? [symbolName] : [],
      });
    }

    return results;
  }

  /**
   * Aggregates symbol detection results.
   */
  static aggregateResults(results: SymbolDetectionResult[]): {
    foundSymbols: string[];
    foundCount: number;
  } {
    const foundSymbols = results
      .filter((r) => r.found)
      .map((r) => r.symbolName);

    return {
      foundSymbols,
      foundCount: foundSymbols.length,
    };
  }
}

/**
 * Batch hover test execution utility.
 */
class HoverTestUtils {
  /**
   * Executes multiple hover scenarios efficiently.
   */
  static async executeHoverScenarios(
    page: Page,
    scenarios: readonly HoverTestScenario[],
  ): Promise<Array<{ scenario: HoverTestScenario; success: boolean }>> {
    const results: Array<{
      scenario: HoverTestScenario;
      success: boolean;
    }> = [];

    // Desktop mode requires longer timeouts
    const isDesktopMode = isDesktop();
    const lspTimeout = isDesktopMode ? 10000 : 3000;

    // Wait for LSP server to be ready once for all scenarios
    await WaitingStrategies.waitForLSPResponsive(page, { timeout: lspTimeout });

    for (const scenario of scenarios) {
      const result = await testHoverScenario(page, scenario);
      results.push({
        scenario,
        success: result.success,
      });
    }

    return results;
  }
}

/**
 * Waits for LCS services to be ready by checking for completion functionality.
 * Replaces unreliable setTimeout calls with deterministic waiting.
 *
 * @param page - Playwright page instance
 * @param options - Wait options
 */
export const waitForLCSReady = async (
  page: Page,
  options: WaitOptions = {},
): Promise<void> => {
  await ErrorHandler.safeExecute(
    () => WaitingStrategies.waitForLSPResponsive(page, options),
    {
      context: 'LCS readiness check',
      logError: false, // Use custom message
      throwError: false,
    },
  );

  // Always log completion for informational purposes
  console.log('ℹ️ LCS readiness check completed');
};

/**
 * Tests LSP language services functionality (completion, symbols, etc.).
 * Consolidates LSP functionality testing from multiple files.
 *
 * @param page - Playwright page instance
 * @returns Object indicating which LSP features are working
 */
export const testLSPFunctionality = async (
  page: Page,
): Promise<LSPFunctionalityResult> => {
  const isDesktopMode = isDesktop();
  const lspTimeout = isDesktopMode ? 10000 : 5000;
  const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR).first();
  let completionTested = false;
  let symbolsTested = false;
  let editorResponsive = false;

  try {
    // Wait for LSP to be responsive before testing
    await WaitingStrategies.waitForLSPResponsive(page, { timeout: lspTimeout });

    // Close any open widgets (peek, find) so main editor has focus
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }

    // Test editor responsiveness - click main editor
    await monacoEditor.click({ timeout: 3000 });
    await page.waitForTimeout(300);
    editorResponsive = await monacoEditor.isVisible();

    // Test document symbols
    const symbolPickerTimeout = isDesktopMode ? 1500 : 1000;
    const tryOpenSymbolPicker = async (): Promise<boolean> => {
      const symbolPicker = page.locator(
        '.quick-input-widget, [id*="quickInput"]',
      );

      await page.keyboard.press(getModifierShortcut('Shift+O'));
      await symbolPicker
        .waitFor({ state: 'visible', timeout: symbolPickerTimeout })
        .catch(() => {});
      if (await symbolPicker.isVisible().catch(() => false)) {
        const itemCount = await page
          .locator('.quick-input-widget .monaco-list-row')
          .count()
          .catch(() => 0);
        if (itemCount > 0) return true;
      }

      // Fallback: Command Palette → '@' (Go to Symbol in Editor)
      await page.keyboard.press('F1');
      const quickInput = page.locator('.quick-input-widget');
      await quickInput
        .waitFor({ state: 'visible', timeout: 1000 })
        .catch(() => {});
      await page.keyboard.type('@');
      await page.keyboard.press('Enter');
      await symbolPicker
        .waitFor({ state: 'visible', timeout: 1200 })
        .catch(() => {});
      if (await symbolPicker.isVisible().catch(() => false)) {
        const itemCount = await page
          .locator('.quick-input-widget .monaco-list-row')
          .count()
          .catch(() => 0);
        if (itemCount > 0) return true;
      }
      return false;
    };

    symbolsTested = await tryOpenSymbolPicker();
    if (symbolsTested) {
      await page.keyboard.press('Escape'); // Close symbol picker
    }

    // If picker approach failed, open Outline and accept outline as proof of symbol services
    if (!symbolsTested) {
      try {
        await findAndActivateOutlineView(page);
      } catch (_e) {
        // ignore activation failure; we'll still try to detect rows
      }
      const outlineRows = page.locator(
        '.outline-tree .monaco-list-row, .monaco-tree .monaco-list-row',
      );
      await outlineRows
        .first()
        .waitFor({ state: 'visible', timeout: isDesktopMode ? 8000 : 6000 })
        .catch(() => {});
      const outlineCount = await outlineRows.count().catch(() => 0);
      symbolsTested = outlineCount > 0;

      // If still no symbols, try alternative detection methods
      if (!symbolsTested) {
        // Check if document symbols API is available via VS Code command
        try {
          await page.keyboard.press('F1');
          await page.waitForSelector('.quick-input-widget', { timeout: 2000 });
          await page.keyboard.type('Go to Symbol in Editor');
          await page.keyboard.press('Enter');
          const symbolWidget = page.locator('.quick-input-widget');
          await symbolWidget
            .waitFor({ state: 'visible', timeout: 3000 })
            .catch(() => {});
          const symbolItems = await page
            .locator('.quick-input-widget .monaco-list-row')
            .count()
            .catch(() => 0);
          symbolsTested = symbolItems > 0;
          await page.keyboard.press('Escape'); // Close the widget
        } catch (_error) {
          // Ignore symbol detection errors
        }
      }
    }
  } catch (_error) {
    // LSP functionality testing is informational
  }

  return { completionTested, symbolsTested, editorResponsive };
};

/**
 * Positions the cursor on a specific word in the editor by searching for it.
 *
 * @param page - Playwright page instance
 * @param searchText - Text to search for to position cursor
 * @param moveToEnd - Whether to move cursor to end of the found text (default: false)
 */
export const positionCursorOnWord = async (
  page: Page,
  searchText: string,
  moveToEnd = false,
): Promise<void> => {
  const isDesktopMode = isDesktop();
  const findTimeout = isDesktopMode ? 5000 : 1500;

  await ErrorHandler.safeExecute(
    async () => {
      await page
        .locator('[id="workbench.parts.editor"] .monaco-editor')
        .first()
        .click();
      await findInPage(page, searchText, { findTimeout });

      // Collapse selection so cursor is ON the identifier (hover needs this)
      await page.keyboard.press('ArrowLeft');

      // Dismiss any lingering dialogs/tooltips
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page
        .getByRole('dialog', { name: 'Find / Replace' })
        .waitFor({ state: 'hidden', timeout: 2000 })
        .catch(() => {});

      if (moveToEnd) {
        await page.keyboard.press('End');
      }
    },
    {
      context: `Position cursor on "${searchText}"`,
      logError: true,
      throwError: false,
    },
  );
};

/**
 * Triggers a hover at the current cursor position and waits for hover widget to appear.
 *
 * @param page - Playwright page instance
 * @param timeout - Timeout in milliseconds to wait for hover (default: mode-specific)
 * @returns Whether hover widget appeared
 */
export const triggerHover = async (
  page: Page,
  timeout?: number,
): Promise<boolean> => {
  // Desktop mode requires longer timeouts; web mode needs time for LSP hover to resolve
  const isDesktopMode = isDesktop();
  const effectiveTimeout = timeout ?? (isDesktopMode ? 6000 : 5000);
  const waitMultiplier = isDesktopMode ? 2 : 1;

  try {
    // VS Code hover shortcut is a chord: Cmd+K then Cmd+I on Mac, Ctrl+K then Ctrl+I elsewhere
    await page.keyboard.press(getModifierShortcut('K'));
    await page.waitForTimeout(150 * waitMultiplier);
    await page.keyboard.press(getModifierShortcut('I'));
    // LSP hover can take time to resolve; wait before checking for widget
    await page.waitForTimeout(800 * waitMultiplier);

    // Wait for hover widget to appear with multiple selectors.
    // VS Code Web may use role="tooltip" for the hover widget.
    const hoverSelectors = [
      '[role="tooltip"]',
      '.monaco-editor .hover-row',
      '.monaco-hover',
      '.monaco-hover-content',
    ];

    for (const selector of hoverSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: 'visible',
          timeout: effectiveTimeout,
        });
        return true;
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Tests hover functionality for a specific scenario.
 *
 * @param page - Playwright page instance
 * @param scenario - Hover test scenario
 * @returns Test result with details
 */
export const testHoverScenario = async (
  page: Page,
  scenario: HoverTestScenario,
): Promise<HoverTestResult> => {
  // Desktop mode requires longer timeouts
  const isDesktopMode = isDesktop();
  const lspTimeout = isDesktopMode ? 10000 : 3000;
  const hoverTimeout = isDesktopMode ? 5000 : 1500;

  try {
    console.log(`🔍 Testing hover: ${scenario.description}`);
    // Wait for LSP server to be ready for hover requests
    await WaitingStrategies.waitForLSPResponsive(page, { timeout: lspTimeout });

    // Position cursor on the target text
    await positionCursorOnWord(page, scenario.searchText, scenario.moveToEnd);

    // Trigger hover with mode-appropriate timeout
    const hoverAppeared = await triggerHover(page, hoverTimeout);

    if (!hoverAppeared) {
      console.log(`❌ No hover appeared for: ${scenario.description}`);
      return {
        success: false,
      };
    }

    // Move cursor away or press Escape to dismiss hover
    await page.keyboard.press('Escape');
    return {
      success: true,
    };
  } catch {
    return {
      success: false,
    };
  }
};

/**
 * Executes multiple hover test scenarios with optimized performance.
 *
 * @param page - Playwright page instance
 * @param scenarios - Array of hover test scenarios
 * @returns Array of test results
 */
export const executeHoverTestScenarios = async (
  page: Page,
  scenarios: readonly HoverTestScenario[],
): Promise<Array<{ scenario: HoverTestScenario; success: boolean }>> =>
  HoverTestUtils.executeHoverScenarios(page, scenarios);

/**
 * Detects multiple symbols in the outline view efficiently.
 *
 * @param page - Playwright page instance
 * @param symbolNames - Array of symbol names to detect
 * @returns Symbol detection results
 */
export const detectOutlineSymbols = async (
  page: Page,
  symbolNames: string[],
): Promise<{ foundSymbols: string[]; foundCount: number }> => {
  const results = await SymbolDetectionUtils.detectSymbols(page, symbolNames);
  return SymbolDetectionUtils.aggregateResults(results);
};
