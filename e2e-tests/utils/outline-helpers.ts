/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { getModifierShortcut } from '../shared/utils/helpers';
import { OUTLINE_SELECTORS, type ExpectedApexSymbols } from './constants';

/**
 * Attempts to find and activate the outline view.
 * Throws an error if outline view cannot be found or activated.
 *
 * @param page - Playwright page instance
 * @throws Error if outline view cannot be found or activated
 */
export const findAndActivateOutlineView = async (page: Page): Promise<void> => {
  // Check if the outline tree already has content (rows) — skip activation
  // to avoid toggling it closed by re-clicking the header.
  const existingRows = page.locator(
    '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
  );
  if ((await existingRows.count()) > 0) {
    return;
  }

  // Also check broader outline presence — the tree container may exist without rows
  const outlineTree = page.locator('.outline-tree');
  if ((await outlineTree.count()) > 0) {
    return;
  }

  // Try to find outline view in the explorer sidebar
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
        await page.waitForSelector('.outline-tree', { timeout: 15000 });
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
    await page.keyboard.press(getModifierShortcut('Shift+P'));
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
        timeout: 10000,
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
 * Ensures all outline tree symbols are visible by expanding collapsed nodes
 * using keyboard navigation (ArrowRight expands, ArrowDown moves to next).
 *
 * Monaco's outline tree virtualises rows — only visible rows exist in the DOM.
 * Clicking twistie icons is unreliable because child rows don't exist until
 * the parent is expanded. Instead we focus the tree, press Home, then walk
 * down with ArrowDown, pressing ArrowRight on each row to expand it.
 *
 * @param page - Playwright page instance
 */
const ensureOutlineTreeFullyVisible = async (page: Page): Promise<void> => {
  const outlineRows = page.locator(
    '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
  );
  if ((await outlineRows.count()) === 0) return;

  // Focus the tree list container — avoids the sticky pane header
  // intercepting clicks on partially-hidden rows.
  const listContainer = page.locator(
    '.outline-tree .monaco-list, .tree-explorer .monaco-list',
  );
  await listContainer.first().click({ force: true });
  await page.keyboard.press('Home');

  const focused = page.locator(
    '.outline-tree .monaco-list-row.focused, .tree-explorer .monaco-list-row.focused',
  );

  const getFocusedId = async (): Promise<string | null> =>
    focused
      .first()
      .getAttribute('id')
      .catch(() => null);

  // Walk the tree: ArrowRight expands the focused node (no-op if leaf/already
  // expanded), ArrowDown moves to the next visible row.
  // We detect "end of tree" by checking whether the focused row's id stops
  // changing after ArrowDown — the DOM row count is unreliable with
  // virtualised lists because it stays roughly viewport-sized.
  const maxSteps = 300;
  let stableSteps = 0;

  for (let i = 0; i < maxSteps; i++) {
    const beforeId = await getFocusedId();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    const afterId = await getFocusedId();

    if (afterId === beforeId) {
      stableSteps++;
      if (stableSteps >= 3) break;
    } else {
      stableSteps = 0;
    }
  }
};

/**
 * Collects all row labels from a virtualised Monaco tree by walking it with
 * keyboard navigation.  At each step the focused row's text is read.  This
 * handles trees where only a viewport-sized slice of rows exists in the DOM.
 */
const collectAllTreeLabels = async (page: Page): Promise<string[]> => {
  const outlineRows = page.locator(
    '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
  );
  if ((await outlineRows.count()) === 0) return [];

  // Focus the tree list container rather than a row — avoids the sticky
  // pane header intercepting clicks on partially-hidden rows.
  const listContainer = page.locator(
    '.outline-tree .monaco-list, .tree-explorer .monaco-list',
  );
  await listContainer.first().click({ force: true });
  await page.keyboard.press('Home');

  const focused = page.locator(
    '.outline-tree .monaco-list-row.focused, .tree-explorer .monaco-list-row.focused',
  );

  const labels: string[] = [];
  const maxSteps = 300;
  let stableSteps = 0;

  for (let i = 0; i < maxSteps; i++) {
    // Use the element id to detect end-of-tree — text can repeat
    // (e.g. two constructors named "ApexClassExample").
    const beforeId = await focused
      .first()
      .getAttribute('id')
      .catch(() => null);

    const text = await focused
      .first()
      .textContent()
      .catch(() => null);
    if (text?.trim()) labels.push(text.trim());

    await page.keyboard.press('ArrowDown');

    const afterId = await focused
      .first()
      .getAttribute('id')
      .catch(() => null);
    if (afterId === beforeId) {
      stableSteps++;
      if (stableSteps >= 2) break;
    } else {
      stableSteps = 0;
    }
  }

  return labels;
};

/**
 * Validates specific Apex symbols are present in the outline view.
 *
 * Uses keyboard-driven tree walking to handle Monaco's virtualised list —
 * rows not in the viewport don't exist in the DOM, so we navigate and read
 * each focused row's text instead of querying all rows at once.
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
  const outlineRows = page.locator(
    '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
  );

  // Wait for at least one outline row to appear
  await outlineRows.first().waitFor({ state: 'visible', timeout: 10_000 });

  // Expand all collapsed nodes so method symbols become reachable
  await ensureOutlineTreeFullyVisible(page);

  // Walk the full tree to collect every label (handles virtualization)
  const allLabels = await collectAllTreeLabels(page);

  console.log(`Outline labels (${allLabels.length}): ${allLabels.join(', ')}`);

  // --- Validate class ---
  const classFound = allLabels.some((label) =>
    label.includes(expectedSymbols.className),
  );

  // --- Validate methods ---
  const expectedMethodNames = expectedSymbols.methods.map((m) => m.name);
  const exactMethodsFound: string[] = [];

  for (const method of expectedSymbols.methods) {
    if (allLabels.some((label) => label.includes(method.name))) {
      exactMethodsFound.push(method.name);
    }
  }

  const missingMethods = expectedMethodNames.filter(
    (name) => !exactMethodsFound.includes(name),
  );
  const unexpectedMethods: string[] = [];
  const allExpectedMethodsFound = missingMethods.length === 0;
  const exactMatch = classFound && allExpectedMethodsFound;

  console.log(
    `Symbol validation: class=${classFound ? 'found' : 'MISSING'}, ` +
      `methods=${exactMethodsFound.length}/${expectedMethodNames.length}` +
      (missingMethods.length > 0
        ? `, missing=[${missingMethods.join(', ')}]`
        : ''),
  );

  return {
    classFound,
    exactMethodsFound,
    missingMethods,
    unexpectedMethods,
    allExpectedMethodsFound,
    exactMatch,
  };
};
