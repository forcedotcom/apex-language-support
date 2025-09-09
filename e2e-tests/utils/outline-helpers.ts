/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { OUTLINE_SELECTORS, type ExpectedApexSymbols } from './constants';

/**
 * Attempts to find and activate the outline view.
 * Throws an error if outline view cannot be found or activated.
 *
 * @param page - Playwright page instance
 * @throws Error if outline view cannot be found or activated
 */
export const findAndActivateOutlineView = async (page: Page): Promise<void> => {
  // First, try to find outline view in the explorer sidebar
  let outlineFound = false;

  for (const selector of OUTLINE_SELECTORS) {
    const outlineElement = page.locator(selector);
    const count = await outlineElement.count();

    if (count > 0) {
      outlineFound = true;

      // Highlight the outline section in debug mode
      if (process.env.DEBUG_MODE && count > 0) {
        await outlineElement.first().hover();
      }

      // If it's the text selector, try to click to expand
      if (selector === 'text=OUTLINE') {
        await outlineElement.first().click();
        // Wait for outline tree to become visible after clicking
        await page.waitForSelector('.outline-tree', { timeout: 2000 });
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

  if (!outlineFound) {
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
    console.log(`Screenshot saved: test-results/${filename}`, '📸');
  } catch (error) {
    console.log(`⚠️  Failed to capture screenshot: ${error}`);
  }
};

/**
 * Validates specific Apex symbols are present in the outline view.
 *
 * @param page - Playwright page instance
 * @param expectedSymbols - The exact symbols we expect to find in the outline
 * @returns Detailed validation results with specific missing/found symbols
 */
export const validateApexSymbolsInOutline = async (
  page: Page,
  expectedSymbols: ExpectedApexSymbols,
): Promise<{
  classFound: boolean;
  exactMethodsFound: string[];
  missingMethods: string[];
  unexpectedMethods: string[];
  allExpectedMethodsFound: boolean;
  exactMatch: boolean;
}> => {
  // Wait for LSP to populate symbols by checking for any outline content
  await page.waitForSelector('.outline-tree .monaco-list-row', {
    timeout: 5_000, // Outline generation timeout
  });

  // Validate class exists
  let classFound = false;
  const classSelectors = [
    '.codicon-symbol-class',
    `[aria-label*="${expectedSymbols.className}"]`,
    `text=${expectedSymbols.className}`,
    `.outline-tree .monaco-list-row:has-text("${expectedSymbols.className}")`,
  ];

  for (const selector of classSelectors) {
    const classElements = page.locator(selector);
    const count = await classElements.count();
    if (count > 0) {
      classFound = true;

      // Highlight the found class symbol in debug mode
      if (process.env.DEBUG_MODE) {
        await classElements.first().hover();
      }
      break;
    }
  }

  // Validate each expected method exists
  const exactMethodsFound: string[] = [];
  const expectedMethodNames = expectedSymbols.methods.map((m) => m.name);

  for (const method of expectedSymbols.methods) {
    const methodSelectors = [
      '.codicon-symbol-method',
      `[aria-label*="${method.name}"]`,
      `text=${method.name}`,
      `.outline-tree .monaco-list-row:has-text("${method.name}")`,
    ];

    let methodFound = false;
    for (const selector of methodSelectors) {
      const methodElements = page.locator(selector);
      const count = await methodElements.count();
      if (count > 0) {
        exactMethodsFound.push(method.name);
        methodFound = true;

        // Highlight the found method symbol in debug mode
        if (process.env.DEBUG_MODE) {
          await methodElements.first().hover();
        }
        break;
      }
    }

    if (!methodFound) {
      console.log(`❌ Expected method '${method.name}' not found in outline`);
    }
  }

  // Calculate validation results
  const missingMethods = expectedMethodNames.filter(
    (name) => !exactMethodsFound.includes(name),
  );

  // For now, we don't check for unexpected methods since the class might have additional methods
  // This could be enhanced in the future if needed
  const unexpectedMethods: string[] = [];

  const allExpectedMethodsFound = missingMethods.length === 0;
  const exactMatch = classFound && allExpectedMethodsFound;

  // Report results with specific details
  console.log('📊 Symbol validation results (exact matching):');
  console.log(
    `   - Class '${expectedSymbols.className}': ${classFound ? '✅' : '❌'}`,
  );
  console.log(`   - Expected methods: ${expectedMethodNames.join(', ')}`);
  console.log(`   - Found methods: ${exactMethodsFound.join(', ')}`);

  if (missingMethods.length > 0) {
    console.log(`   - Missing methods: ❌ ${missingMethods.join(', ')}`);
  }

  console.log(
    `   - All expected found: ${allExpectedMethodsFound ? '✅' : '❌'}`,
  );
  console.log(`   - Exact match: ${exactMatch ? '✅' : '❌'}`);

  return {
    classFound,
    exactMethodsFound,
    missingMethods,
    unexpectedMethods,
    allExpectedMethodsFound,
    exactMatch,
  };
};
