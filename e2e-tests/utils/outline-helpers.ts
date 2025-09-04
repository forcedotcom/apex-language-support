/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { OUTLINE_SELECTORS, TEST_TIMEOUTS, SELECTORS } from './constants';
import { logStep, logSuccess, logWarning } from './test-helpers';

/**
 * Expected symbol structure for ApexClassExample.cls file.
 */
export const EXPECTED_APEX_SYMBOLS = {
  className: 'ApexClassExample',
  classType: 'class',
  methods: [
    { name: 'sayHello', visibility: 'public', isStatic: true },
    { name: 'add', visibility: 'public', isStatic: true },
    { name: 'getCurrentUserName', visibility: 'public', isStatic: true },
    { name: 'formatPhoneNumber', visibility: 'public', isStatic: true },
    { name: 'isValidEmail', visibility: 'public', isStatic: true },
  ],
  totalSymbols: 6, // 1 class + 5+ methods (we have many more in the comprehensive class)
} as const;

/**
 * Attempts to find and activate the outline view.
 * Throws an error if outline view cannot be found or activated.
 *
 * @param page - Playwright page instance
 * @throws Error if outline view cannot be found or activated
 */
export const findAndActivateOutlineView = async (page: Page): Promise<void> => {
  logStep('Opening outline view', '🗂️');

  // First, try to find outline view in the explorer sidebar
  let outlineFound = false;

  for (const selector of OUTLINE_SELECTORS) {
    const outlineElement = page.locator(selector);
    const count = await outlineElement.count();

    if (count > 0) {
      logSuccess(
        `Found outline view with selector: ${selector} (${count} elements)`,
      );
      outlineFound = true;

      // Highlight the outline section in debug mode
      if (process.env.DEBUG_MODE && count > 0) {
        await outlineElement.first().hover();
      }

      // If it's the text selector, try to click to expand
      if (selector === 'text=OUTLINE') {
        try {
          await outlineElement.first().click();
          // Wait for outline tree to become visible after clicking
          await page.waitForSelector('.outline-tree', { timeout: 2000 });
          logSuccess('Clicked to expand outline view');
        } catch (_e) {
          logStep('Outline view found but click not needed', 'ℹ️');
        }
      }
      break;
    }
  }

  // If outline not visible, try to activate it via command palette
  if (!outlineFound) {
    try {
      await activateOutlineViaCommandPalette(page);
      outlineFound = true;
    } catch (error) {
      throw new Error(
        `Failed to activate outline via command palette: ${error}`,
      );
    }
  }

  if (outlineFound) {
    logSuccess('Outline view is now visible and activated');
  } else {
    throw new Error('Outline view could not be found or activated');
  }
};

/**
 * Activates outline view using the command palette.
 * Throws an error if activation fails.
 *
 * @param page - Playwright page instance
 * @throws Error if activation fails
 */
const activateOutlineViaCommandPalette = async (page: Page): Promise<void> => {
  logStep('Outline view not immediately visible, trying to activate it', '🔍');

  try {
    // Open command palette
    await page.keyboard.press('Control+Shift+P');
    await page.waitForSelector('.quick-input-widget', { timeout: 2000 });

    // Type command to show outline
    await page.keyboard.type('outline');
    await page.waitForSelector('.quick-input-list .monaco-list-row', {
      timeout: 2000,
    });

    // Try to find and click outline command
    const outlineCommand = page
      .locator('.quick-input-list .monaco-list-row')
      .filter({ hasText: /outline/i })
      .first();

    const isVisible = await outlineCommand.isVisible({ timeout: 2000 });
    if (isVisible) {
      await outlineCommand.click();
      // Wait for outline tree to appear after command execution
      await page.waitForSelector('.outline-tree, [id*="outline"]', {
        timeout: 3000,
      });
      logSuccess('Activated outline view via command palette');
    } else {
      // Close command palette
      await page.keyboard.press('Escape');
      throw new Error('Outline command not visible in command palette');
    }
  } catch (error) {
    // Ensure command palette is closed
    await page.keyboard.press('Escape').catch(() => {});

    if (
      error instanceof Error &&
      error.message.includes('Outline command not visible')
    ) {
      throw error; // Re-throw our custom error
    }
    throw new Error(`Failed to activate outline via command palette: ${error}`);
  }
};

/**
 * Takes a screenshot for debugging outline view issues.
 *
 * @param page - Playwright page instance
 * @param filename - Screenshot filename
 */
export const captureOutlineViewScreenshot = async (
  page: Page,
  filename = 'outline-view-test.png',
): Promise<void> => {
  try {
    await page.screenshot({
      path: `test-results/${filename}`,
      fullPage: true,
    });
    logStep(`Screenshot saved: test-results/${filename}`, '📸');
  } catch (error) {
    logWarning(`Failed to capture screenshot: ${error}`);
  }
};

/**
 * Validates specific Apex symbols are present in the outline view.
 *
 * @param page - Playwright page instance
 * @returns Detailed symbol validation results
 */
export const validateApexSymbolsInOutline = async (
  page: Page,
): Promise<{
  classFound: boolean;
  methodsFound: string[];
  symbolIconsCount: number;
  totalSymbolsDetected: number;
  isValidStructure: boolean;
}> => {
  logStep('Validating Apex symbols in outline', '🔍');

  // Wait for LSP to populate symbols by checking for any outline content
  try {
    await page.waitForSelector('.outline-tree .monaco-list-row', {
      timeout: TEST_TIMEOUTS.OUTLINE_GENERATION,
    });
  } catch {
    // Continue even if no symbols are found - we'll detect this in validation
  }

  let classFound = false;
  const methodsFound: string[] = [];
  let symbolIconsCount = 0;
  let totalSymbolsDetected = 0;

  // Look for class symbol with specific icon
  const classSelectors = [
    '.codicon-symbol-class',
    '[aria-label*="ApexClassExample"]',
    `text=${EXPECTED_APEX_SYMBOLS.className}`,
    `.outline-tree .monaco-list-row:has-text("${EXPECTED_APEX_SYMBOLS.className}")`,
  ];

  for (const selector of classSelectors) {
    const classElements = page.locator(selector);
    const count = await classElements.count();
    if (count > 0) {
      classFound = true;
      logSuccess(
        `Found class symbol: ${EXPECTED_APEX_SYMBOLS.className} (selector: ${selector})`,
      );

      // Highlight the found class symbol in debug mode
      if (process.env.DEBUG_MODE) {
        await classElements.first().hover();
      }
      break;
    }
  }

  // Look for method symbols
  for (const method of EXPECTED_APEX_SYMBOLS.methods) {
    const methodSelectors = [
      '.codicon-symbol-method',
      `[aria-label*="${method.name}"]`,
      `text=${method.name}`,
      `.outline-tree .monaco-list-row:has-text("${method.name}")`,
    ];

    for (const selector of methodSelectors) {
      const methodElements = page.locator(selector);
      const count = await methodElements.count();
      if (count > 0) {
        methodsFound.push(method.name);
        logSuccess(
          `Found method symbol: ${method.name} (selector: ${selector})`,
        );

        // Highlight the found method symbol in debug mode
        if (process.env.DEBUG_MODE) {
          await methodElements.first().hover();
        }
        break;
      }
    }
  }

  // Count total symbol icons
  const symbolIcons = page.locator(SELECTORS.SYMBOL_ICONS);
  symbolIconsCount = await symbolIcons.count();

  // Count outline tree items that look like symbols
  const outlineItems = page.locator(
    '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
  );
  const outlineItemCount = await outlineItems.count();
  totalSymbolsDetected = outlineItemCount;

  const isValidStructure =
    classFound && methodsFound.length >= EXPECTED_APEX_SYMBOLS.methods.length;

  logStep('Symbol validation results:', '📊');
  logStep(`  - Class found: ${classFound ? '✅' : '❌'}`, '   ');
  logStep(
    `  - Methods found: ${methodsFound.length}/${EXPECTED_APEX_SYMBOLS.methods.length} (${methodsFound.join(', ')})`,
    '   ',
  );
  logStep(`  - Symbol icons: ${symbolIconsCount}`, '   ');
  logStep(`  - Total symbols: ${totalSymbolsDetected}`, '   ');
  logStep(`  - Valid structure: ${isValidStructure ? '✅' : '❌'}`, '   ');

  // Extended pause in debug mode to show validation results
  if (process.env.DEBUG_MODE) {
    logStep('Validation complete - showing final outline state', '🎉');
  }

  return {
    classFound,
    methodsFound,
    symbolIconsCount,
    totalSymbolsDetected,
    isValidStructure,
  };
};
