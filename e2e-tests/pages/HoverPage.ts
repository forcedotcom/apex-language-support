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
  positionCursorOnWord,
  triggerHover,
  testHoverScenario,
  executeHoverTestScenarios,
  type HoverTestScenario,
  type HoverTestResult,
} from '../utils/lsp-testing';

/**
 * Page object for hover functionality interactions.
 * Provides methods for:
 * - Triggering hover tooltips
 * - Getting hover content
 * - Testing hover scenarios
 * - Validating hover information
 */
export class HoverPage extends BasePage {
  private readonly hoverWidget: Locator;
  private readonly hoverContent: Locator;
  private readonly defaultTimeout: number;

  constructor(page: Page) {
    super(page);
    // VS Code Web uses role="tooltip" for hover; Monaco uses .monaco-hover
    this.hoverWidget = page.getByRole('tooltip').or(
      page.locator('.monaco-hover, .monaco-editor .hover-row, .hover-row'),
    );
    this.hoverContent = page.getByRole('tooltip').or(
      page.locator('.monaco-hover-content, .hover-contents, .monaco-hover'),
    );
    this.defaultTimeout = this.isDesktopMode ? 10000 : 5000;
  }

  /**
   * Trigger hover at a specific line and column position.
   * @param line - Line number (1-indexed)
   * @param column - Column number (1-indexed)
   */
  async hoverAt(line: number, column: number): Promise<void> {
    const waitMultiplier = this.isDesktopMode ? 2 : 1;

    // Navigate to position
    await this.page.keyboard.press('Control+G');
    await this.page.waitForTimeout(300 * waitMultiplier);
    await this.page.keyboard.type(`${line}:${column}`);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500 * waitMultiplier);

    // Trigger hover using keyboard shortcut (chord: Ctrl+K then Ctrl+I)
    await this.page.keyboard.press('Control+K');
    await this.page.waitForTimeout(100 * waitMultiplier);
    await this.page.keyboard.press('Control+I');
    await this.page.waitForTimeout(1000 * waitMultiplier); // Wait for hover to appear
  }

  /**
   * Position cursor on a word and trigger hover.
   * Uses the existing utility function for reliable cursor positioning.
   * @param searchText - The text to search for and hover over
   */
  async hoverOnWord(searchText: string): Promise<void> {
    await positionCursorOnWord(this.page, searchText);
    await triggerHover(this.page);
  }

  /**
   * Wait for the hover widget to appear.
   * Tries multiple selectors as VS Code Web may use different DOM structures.
   * @param timeout - Optional timeout in milliseconds (defaults to mode-specific timeout)
   */
  async waitForHover(timeout?: number): Promise<void> {
    const effectiveTimeout = timeout || this.defaultTimeout;
    const selectors = [
      '[role="tooltip"]',
      '.monaco-hover',
      '.monaco-editor .hover-row',
      '.hover-row',
      '.monaco-hover-content',
    ];
    for (const selector of selectors) {
      try {
        await this.page.locator(selector).first().waitFor({
          state: 'visible',
          timeout: effectiveTimeout,
        });
        return;
      } catch {
        continue;
      }
    }
    throw new Error(
      `Hover widget did not appear within ${effectiveTimeout}ms. Tried: ${selectors.join(', ')}`,
    );
  }

  /**
   * Get the text content of the hover tooltip.
   * Tries multiple selectors as VS Code Web may use different DOM structures.
   * Uses innerText when available as it returns rendered text (more reliable for tooltips).
   * @returns The hover content as a string
   */
  async getHoverContent(): Promise<string> {
    try {
      await this.waitForHover();
      // Try hover widget first - use innerText for rendered content (handles spans, etc.)
      const widget = this.hoverWidget.first();
      let content =
        (await widget.innerText().catch(() => null)) ||
        (await widget.textContent()) ||
        '';
      if (content.trim().length > 0) return content;
      // Fallback: try content-specific locators
      const contentEl = this.hoverContent.first();
      content =
        (await contentEl.innerText().catch(() => null)) ||
        (await contentEl.textContent()) ||
        '';
      if (content.trim().length > 0) return content;
      // Fallback: use page.evaluate to find tooltip in DOM (handles shadow DOM, etc.)
      content =
        (await this.page.evaluate(() => {
          const el =
            document.querySelector('[role="tooltip"]') ||
            document.querySelector('.monaco-hover') ||
            document.querySelector('.hover-row');
          return el ? (el as HTMLElement).innerText : '';
        })) || '';
      return content;
    } catch {
      return '';
    }
  }

  /**
   * Check if a hover tooltip is currently visible.
   * @returns True if the hover widget is visible
   */
  async isHoverVisible(): Promise<boolean> {
    return await this.isVisible(this.hoverWidget);
  }

  /**
   * Verify that the hover content contains specific text.
   * @param expectedText - The text expected in the hover tooltip
   * @returns True if the hover contains the expected text
   */
  async hoverContains(expectedText: string): Promise<boolean> {
    const content = await this.getHoverContent();
    return content.includes(expectedText);
  }

  /**
   * Verify that the hover content matches a specific pattern.
   * @param pattern - Regular expression pattern to match
   * @returns True if the hover content matches the pattern
   */
  async hoverMatches(pattern: RegExp): Promise<boolean> {
    const content = await this.getHoverContent();
    return pattern.test(content);
  }

  /**
   * Dismiss/close the hover tooltip.
   */
  async dismissHover(): Promise<void> {
    // Press Escape to close hover
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Test a specific hover scenario.
   * Uses the existing utility function for scenario testing.
   * @param scenario - The hover test scenario to execute
   * @returns The test result
   */
  async testScenario(scenario: HoverTestScenario): Promise<HoverTestResult> {
    return await testHoverScenario(this.page, scenario);
  }

  /**
   * Execute multiple hover test scenarios.
   * Uses the existing utility function for batch testing.
   * @param scenarios - Array of hover test scenarios
   * @returns Array of test results
   */
  async testScenarios(
    scenarios: readonly HoverTestScenario[],
  ): Promise<Array<{ scenario: HoverTestScenario; success: boolean }>> {
    return await executeHoverTestScenarios(this.page, scenarios);
  }

  /**
   * Get hover information for a specific symbol.
   * @param symbolName - Name of the symbol to get hover for
   * @returns Hover content or empty string if no hover
   */
  async getSymbolHover(symbolName: string): Promise<string> {
    await this.hoverOnWord(symbolName);
    return await this.getHoverContent();
  }

  /**
   * Verify hover shows type information.
   * Checks if the hover contains common type indicators.
   * @returns True if hover shows type information
   */
  async hasTypeInformation(): Promise<boolean> {
    const content = await this.getHoverContent();

    // Check for common type indicators in Apex
    const typeIndicators = [
      'String',
      'Integer',
      'Boolean',
      'List<',
      'Map<',
      'Set<',
      'void',
      'Object',
      'public',
      'private',
      'static',
    ];

    return typeIndicators.some((indicator) => content.includes(indicator));
  }

  /**
   * Verify hover shows method signature.
   * Checks if the hover contains method signature patterns.
   * @returns True if hover shows a method signature
   */
  async hasMethodSignature(): Promise<boolean> {
    const content = await this.getHoverContent();

    // Check for method signature patterns
    return content.includes('(') && content.includes(')');
  }

  /**
   * Verify hover shows documentation comments.
   * @returns True if hover shows documentation
   */
  async hasDocumentation(): Promise<boolean> {
    const content = await this.getHoverContent();

    // Check for common documentation patterns
    const docIndicators = ['/**', '@param', '@return', '//'];

    return docIndicators.some((indicator) => content.includes(indicator));
  }

  /**
   * Wait for hover to disappear.
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForHoverToDisappear(timeout = 3000): Promise<void> {
    // Use first() to avoid strict mode violation when multiple hover elements exist
    await this.hoverWidget.first().waitFor({ state: 'hidden', timeout });
  }

  /**
   * Take a screenshot of the hover tooltip.
   * @param filename - Screenshot filename (without extension)
   */
  async captureHoverScreenshot(filename: string): Promise<void> {
    await this.waitForHover();
    await this.screenshot(`hover-${filename}`);
  }

  /**
   * Get all visible hover widgets (in case multiple are shown).
   * @returns Array of hover content from all visible widgets
   */
  async getAllHoverContent(): Promise<string[]> {
    const widgets = this.page.locator('.monaco-hover');
    const count = await widgets.count();
    const content: string[] = [];

    for (let i = 0; i < count; i++) {
      const widget = widgets.nth(i);
      if (await widget.isVisible()) {
        const text = (await widget.textContent()) || '';
        content.push(text);
      }
    }

    return content;
  }

  /**
   * Verify that hover appears within a reasonable time.
   * Useful for testing hover responsiveness.
   * @param searchText - Text to hover over
   * @param maxTime - Maximum acceptable time in ms (defaults to mode-specific timeout)
   * @returns True if hover appears within the time limit
   */
  async isHoverResponsive(searchText: string, maxTime?: number): Promise<boolean> {
    const effectiveMaxTime = maxTime || (this.isDesktopMode ? 5000 : 2000);
    const startTime = Date.now();

    await this.hoverOnWord(searchText);

    try {
      await this.waitForHover(effectiveMaxTime);
      const elapsedTime = Date.now() - startTime;
      return elapsedTime <= effectiveMaxTime;
    } catch {
      return false;
    }
  }
}
