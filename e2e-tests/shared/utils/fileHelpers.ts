/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, type Page } from '@playwright/test';
import { executeCommandWithCommandPalette } from '../pages/commands';
import {
  getGoToStartShortcut,
  getModifierShortcut,
  isDesktop,
} from './helpers';
import {
  DIRTY_EDITOR,
  EDITOR_WITH_URI,
  QUICK_INPUT_LIST_ROW,
  QUICK_INPUT_WIDGET,
  WORKBENCH,
} from './locators';

/**
 * Creates a new untitled file with contents.
 * NOTE: This creates an UNTITLED file that is NOT saved to disk.
 */
export const createFileWithContents = async (
  page: Page,
  _filePath: string,
  contents: string,
): Promise<void> => {
  await page.locator(WORKBENCH).click();

  await executeCommandWithCommandPalette(page, 'File: New Untitled Text File');

  const widget = page.locator(QUICK_INPUT_WIDGET);
  await widget.waitFor({ state: 'hidden', timeout: 5000 });

  const editor = page.locator(EDITOR_WITH_URI).first();
  await expect(editor).toBeAttached({ timeout: 15_000 });
  await expect(editor).toBeVisible({ timeout: 15_000 });
  await editor.click();

  await page.keyboard.type(contents);
};

/**
 * Open a file by name.
 *
 * Desktop: uses "Go to File" (Ctrl+P with full workspace indexing).
 * Web: clicks the file in the Explorer sidebar. vscode-test-web's Ctrl+P only
 * surfaces recently-opened files, not workspace files, so Quick Open is not
 * usable for the initial open of an arbitrary workspace file.
 */
export const openFileByName = async (
  page: Page,
  fileName: string,
): Promise<void> => {
  if (isDesktop()) {
    const widget = page.locator(QUICK_INPUT_WIDGET);
    await executeCommandWithCommandPalette(page, 'Go to File');
    await expect(widget).toBeVisible({ timeout: 10_000 });
    const input = widget.locator('input.input');
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.click({ timeout: 5000 });
    await page.keyboard.press(getModifierShortcut('a'));
    await page.keyboard.press('Delete');
    await page.keyboard.type(fileName);

    await page.locator(QUICK_INPUT_LIST_ROW).first().waitFor({
      state: 'visible',
      timeout: 10_000,
    });
    await widget.waitFor({ state: 'visible', timeout: 1000 });

    const results = page.locator(QUICK_INPUT_LIST_ROW);
    const resultCount = await results.count();
    let foundMatch = false;
    let matchIndex = 0;
    for (let i = 0; i < resultCount; i++) {
      const resultText = await results.nth(i).textContent();
      if (
        resultText &&
        (resultText.includes(`/${fileName}`) ||
          resultText.includes(`\\${fileName}`) ||
          resultText.startsWith(fileName))
      ) {
        matchIndex = i;
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      const allResults: string[] = [];
      for (let i = 0; i < Math.min(resultCount, 10); i++) {
        const text = await results.nth(i).textContent();
        if (text) allResults.push(text.trim());
      }
      const firstResult = allResults[0] || '';
      if (
        firstResult.toLowerCase().includes('similar commands') ||
        firstResult.toLowerCase().includes('no matching')
      ) {
        throw new Error(
          'Quick Open appears to be showing command palette results instead of files. ' +
            `Found ${resultCount} results. First few: ${allResults.join(' | ')}`,
        );
      }
      throw new Error(
        `No exact match found for "${fileName}" in Quick Open. ` +
          `Found ${resultCount} results. First few: ${allResults.join(' | ')}`,
      );
    }

    for (let i = 0; i < matchIndex; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');
  } else {
    // On web, use the Explorer sidebar — it shows all workspace files regardless
    // of whether they have been opened before in this session.
    const explorerView = page.locator('[id="workbench.view.explorer"]');
    await explorerView.waitFor({ state: 'visible', timeout: 10_000 });

    const fileRow = explorerView
      .locator('.monaco-list-row')
      .filter({ hasText: fileName });

    const rowCount = await fileRow.count();
    if (rowCount === 0) {
      throw new Error(
        `File "${fileName}" not found in Explorer sidebar. ` +
          'Ensure the file exists in the workspace.',
      );
    }

    await fileRow.first().click();
  }

  await page.locator(EDITOR_WITH_URI).first().waitFor({
    state: 'visible',
    timeout: 10_000,
  });
};

/** Edit the currently open file by adding a comment at the top */
export const editAndSaveOpenFile = async (
  page: Page,
  comment: string,
): Promise<void> => {
  const editor = page.locator(EDITOR_WITH_URI).first();
  await editor.waitFor({ state: 'visible' });

  await editor.locator('.view-line').first().waitFor({
    state: 'visible',
    timeout: 5000,
  });

  await editor.click();
  await page.keyboard.press(getGoToStartShortcut());
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(`// ${comment}`);

  await executeCommandWithCommandPalette(page, 'File: Save');
  await expect(page.locator(DIRTY_EDITOR).first()).not.toBeVisible({
    timeout: 5000,
  });
};
