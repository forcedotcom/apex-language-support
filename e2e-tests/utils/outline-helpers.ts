/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';
import { executeCommandWithCommandPalette } from '../shared/pages/commands';
import type { ExpectedApexSymbols } from './constants';

/**
 * Attempts to find and activate the outline view.
 * Throws an error if outline view cannot be found or activated.
 *
 * @param page - Playwright page instance
 * @throws Error if outline view cannot be found or activated
 */
export const findAndActivateOutlineView = async (page: Page): Promise<void> => {
  const outlineTree = page.locator('.outline-tree:visible');
  if (
    await outlineTree
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  // The Outline pane belongs to the Files Explorer. Ensure that view is active
  // before looking for its header; a hidden .outline-tree from a previous view
  // must not be mistaken for an activated outline.
  const explorerView = page.locator('[id="workbench.view.explorer"]');
  if (!(await explorerView.isVisible().catch(() => false))) {
    await executeCommandWithCommandPalette(
      page,
      'File: Focus on Files Explorer',
    );
  }
  await explorerView.waitFor({ state: 'visible', timeout: 10_000 });

  const outlineHeader = page
    .locator('.pane-header:visible')
    .filter({ hasText: /outline/i })
    .first();
  if (await outlineHeader.isVisible().catch(() => false)) {
    if ((await outlineHeader.getAttribute('aria-expanded')) !== 'true') {
      await outlineHeader.click();
    }
  } else {
    // This command reveals and focuses Outline even when its pane was moved or
    // hidden. Command-palette results are available before Quick Open's file
    // index, so this does not reproduce the desktop activation race.
    await executeCommandWithCommandPalette(page, 'View: Focus on Outline View');
  }

  // An expanded pane can legitimately render "No symbols found" after an
  // early null document-symbol response. That is an activated Outline view,
  // even though .outline-tree does not exist yet; waitForSymbols is responsible
  // for reissuing the semantic request and waiting for rows.
  await outlineHeader.waitFor({ state: 'visible', timeout: 15_000 });
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
