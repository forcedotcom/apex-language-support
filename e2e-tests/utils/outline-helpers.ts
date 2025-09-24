/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
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
        await page.waitForSelector('.outline-tree', { timeout: 4000 });
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
    await page.waitForSelector('.quick-input-widget', { timeout: 3000 });

    // Type command to show outline
    await page.keyboard.type('outline');
    await page.waitForSelector('.quick-input-list .monaco-list-row', {
      timeout: 4000,
    });

    // Try to find and click outline command
    const outlineCommand = page
      .locator('.quick-input-list .monaco-list-row')
      .filter({ hasText: /outline/i })
      .first();

    const isVisible = await outlineCommand.isVisible({ timeout: 3000 });
    if (isVisible) {
      await outlineCommand.click();
      // Wait for outline tree to appear after command execution
      await page.waitForSelector('.outline-tree, [id*="outline"]', {
        timeout: 5000,
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
 * Ensures all outline tree symbols are visible by expanding the tree and scrolling.
 *
 * @param page - Playwright page instance
 */
const ensureOutlineTreeFullyVisible = async (page: Page): Promise<void> => {
  try {
    // Find the outline tree container
    const outlineTree = page
      .locator('.outline-tree, .monaco-tree, .tree-explorer')
      .first();

    if (await outlineTree.isVisible()) {
      // Expand all tree nodes by clicking expand icons
      const expandIcons = page.locator(
        [
          '.outline-tree .codicon-chevron-right',
          '.monaco-tree .codicon-chevron-right',
          '.codicon-tree-item-expanded',
          '.codicon-triangle-right',
        ].join(', '),
      );
      const expandCount = await expandIcons.count();

      for (let i = 0; i < expandCount; i++) {
        const icon = expandIcons.nth(i);
        if (await icon.isVisible()) {
          await icon.click().catch(() => {}); // Ignore errors if already expanded
        }
      }

      // Also try to expand by double-clicking on class names to reveal methods
      const classElements = page.locator(
        [
          '.outline-tree .monaco-list-row:has-text("ApexClassExample")',
          '.monaco-tree .monaco-list-row:has-text("ApexClassExample")',
        ].join(', '),
      );
      const classCount = await classElements.count();

      for (let i = 0; i < classCount; i++) {
        const classElement = classElements.nth(i);
        if (await classElement.isVisible()) {
          await classElement.dblclick().catch(() => {}); // Double-click to expand
        }
      }

      // Scroll to the bottom of the outline tree to ensure all symbols are rendered
      await outlineTree.hover();
      await page.keyboard.press('End'); // Scroll to bottom

      // Wait for rendering to complete by checking for outline rows
      await page
        .waitForFunction(
          () => {
            const tree = document.querySelector(
              '.outline-tree, .monaco-tree, .tree-explorer',
            );
            return tree && tree.querySelector('.monaco-list-row');
          },
          { timeout: 2000 },
        )
        .catch(() => {});

      // Scroll back to top
      await page.keyboard.press('Home'); // Scroll to top

      // Wait for scroll to complete
      await page
        .waitForFunction(
          () => {
            const tree = document.querySelector(
              '.outline-tree, .monaco-tree, .tree-explorer',
            );
            return tree && tree.scrollTop === 0;
          },
          { timeout: 1000 },
        )
        .catch(() => {});
    }
  } catch (error) {
    console.log(`⚠️  Failed to fully expand outline tree: ${error}`);
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

  // Ensure outline tree is fully expanded and all symbols are visible
  await ensureOutlineTreeFullyVisible(page);

  // Debug: Log all visible text in the outline for troubleshooting
  try {
    const allOutlineText = await page
      .locator('.outline-tree, .monaco-tree')
      .first()
      .textContent();
    console.log('🔍 All outline text content:', allOutlineText);

    // Get all outline row elements for debugging
    const outlineRows = page.locator(
      '.outline-tree .monaco-list-row, .monaco-tree .monaco-list-row',
    );
    const rowCount = await outlineRows.count();
    console.log(`🔍 Found ${rowCount} outline rows`);

    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const rowText = await outlineRows.nth(i).textContent();
      console.log(`  Row ${i}: ${rowText}`);
    }
  } catch (_error) {
    console.log('⚠️  Could not retrieve outline debug information');
  }

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
    // Enhanced selectors that work better with scrollable content
    const methodSelectors = [
      `text=${method.name}`, // Direct text match (most reliable)
      `.outline-tree .monaco-list-row:has-text("${method.name}")`, // Tree row with text
      `.monaco-tree .monaco-list-row:has-text("${method.name}")`, // Alternative tree structure
      `[aria-label*="${method.name}"]`, // Aria label match
      `.codicon-symbol-method ~ span:has-text("${method.name}")`, // Method icon with text
    ];

    let methodFound = false;
    for (const selector of methodSelectors) {
      const methodElements = page.locator(selector);
      const count = await methodElements.count();
      if (count > 0) {
        // Scroll the found element into view to ensure it's visible
        try {
          await methodElements.first().scrollIntoViewIfNeeded();
          // Wait for scroll to complete by checking element is in view
          await expect(methodElements.first())
            .toBeInViewport()
            .catch(() => {});
        } catch (_error) {
          // Ignore scroll errors
        }

        exactMethodsFound.push(method.name);
        methodFound = true;

        // Highlight the found method symbol in debug mode
        if (process.env.DEBUG_MODE) {
          await methodElements.first().hover();
        }
        console.log(`✅ Found method '${method.name}' in outline`);
        break;
      }
    }

    if (!methodFound) {
      console.log(`❌ Expected method '${method.name}' not found in outline`);

      // Try alternative approach: get all text content and search
      try {
        const outlineText = await page
          .locator('.outline-tree, .monaco-tree')
          .first()
          .textContent();
        if (outlineText && outlineText.includes(method.name)) {
          console.log(
            `ℹ️  Method '${method.name}' found in outline text but not via selectors`,
          );
          exactMethodsFound.push(method.name);
          methodFound = true;
        }
      } catch (_error) {
        // Ignore text search errors
      }
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
