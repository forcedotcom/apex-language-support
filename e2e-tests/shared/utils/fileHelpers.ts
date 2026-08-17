/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, type Page } from '@playwright/test';
import { executeCommandWithCommandPalette } from '../pages/commands';
import { getGoToStartShortcut } from './helpers';
import {
  DIRTY_EDITOR,
  EDITOR_WITH_URI,
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
 * Uses the Explorer sidebar in both modes. Quick Open depends on VS Code's file
 * search provider having finished indexing the workspace; on fresh desktop CI
 * instances the widget can be ready while that provider still returns no rows.
 * The Explorer is backed directly by the loaded workspace and is deterministic
 * for the small E2E fixture.
 */
export const openFileByName = async (
  page: Page,
  fileName: string,
): Promise<void> => {
  const explorerView = page.locator('[id="workbench.view.explorer"]');
  if (!(await explorerView.isVisible().catch(() => false))) {
    await executeCommandWithCommandPalette(
      page,
      'File: Focus on Files Explorer',
    );
  }
  await explorerView.waitFor({ state: 'visible', timeout: 10_000 });
  await expandWorkspaceFolders(page);

  // Use an exact label match so Foo.cls never binds to Foo.cls-meta.xml.
  const fileLabel = explorerView.getByText(fileName, { exact: true });
  await expect(fileLabel.first()).toBeVisible({ timeout: 10_000 });
  await fileLabel.first().click();

  await page.locator(EDITOR_WITH_URI).first().waitFor({
    state: 'visible',
    timeout: 10_000,
  });
};

/** Expand nested workspace folders so files in a standard DX layout are visible. */
export const expandWorkspaceFolders = async (page: Page): Promise<void> => {
  const explorerView = page.locator('[id="workbench.view.explorer"]');
  await explorerView.waitFor({ state: 'visible', timeout: 10_000 });

  // Expand only the fixture's source path. Desktop workspaces also contain a
  // generated .vscode-test-user-data tree; expanding arbitrary folders can
  // disappear into that tree without ever exposing the Apex sources.
  for (const folderName of ['force-app', 'main', 'default', 'classes']) {
    const folderLabel = explorerView
      .getByText(folderName, { exact: true })
      .first();
    await folderLabel.waitFor({ state: 'visible', timeout: 10_000 });
    const folder = folderLabel.locator(
      'xpath=ancestor::*[@role="treeitem"][1]',
    );
    if ((await folder.getAttribute('aria-expanded')) === 'false') {
      await folder.locator('.monaco-tl-twistie').first().click();
    }
  }
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
