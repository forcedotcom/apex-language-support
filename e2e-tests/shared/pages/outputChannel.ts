/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, type Page } from '@playwright/test';
import { saveScreenshot } from '../screenshotUtils';
import { isMacDesktop } from '../utils/helpers';
import {
  EDITOR,
  CONTEXT_MENU,
  EDITOR_WITH_URI,
  TAB,
  QUICK_INPUT_WIDGET,
  QUICK_INPUT_LIST_ROW,
} from '../utils/locators';
import { openCommandPalette } from './commands';

const OUTPUT_PANEL_ID = '[id="workbench.panel.output"]';
const outputPanel = (page: Page) => page.locator(OUTPUT_PANEL_ID);
const outputPanelCodeArea = (page: Page) =>
  outputPanel(page).locator(`${EDITOR} .view-lines`);
const filterInput = (page: Page) =>
  page.getByPlaceholder(/Filter \(e\.g\./i).first();

const ensureOutputFilterReady = async (
  page: Page,
  timeout: number,
): Promise<ReturnType<Page['locator']>> => {
  const panel = outputPanel(page);
  const outputTab = panel.getByRole('tab', { name: /Output/i }).first();
  const tabVisible = await outputTab.isVisible().catch(() => false);
  if (tabVisible) await outputTab.hover({ force: true });
  const input = filterInput(page);
  await expect(input, 'Output filter should be visible and usable').toBeVisible(
    { timeout },
  );
  return input;
};

const withOutputFilter = async <T>(
  page: Page,
  searchText: string,
  fn: () => Promise<T>,
  opts?: { timeout?: number },
): Promise<T> => {
  const { timeout = 10_000 } = opts ?? {};
  const input = await ensureOutputFilterReady(page, Math.min(timeout, 15_000));
  await input.click({ force: true });
  await input.fill(searchText, { force: true });
  await expect(input).toHaveValue(searchText, { timeout: 5000 });
  await page.keyboard.press('Enter');
  try {
    return await fn();
  } finally {
    await input.click({ force: true });
    await input.fill('', { force: true });
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('', { timeout: 5000 });
  }
};

const getAllOutputText = async (page: Page): Promise<string> => {
  const codeArea = outputPanelCodeArea(page);
  const text = await codeArea.textContent();
  return (text ?? '').replaceAll('\u00A0', ' ');
};

const waitForOutputContent = async (
  page: Page,
  timeout: number,
): Promise<boolean> => {
  const codeArea = outputPanelCodeArea(page);
  try {
    await expect(async () => {
      const text = await codeArea.textContent();
      expect(text?.trim().length ?? 0).toBeGreaterThan(1);
    }).toPass({ timeout });
    return true;
  } catch {
    return false;
  }
};

/** Opens the Output panel (idempotent - safe to call if already open) */
export const ensureOutputPanelOpen = async (page: Page): Promise<void> => {
  const panel = outputPanel(page);

  if (await panel.isVisible()) {
    return;
  }

  await openCommandPalette(page);
  const widget = page.locator(QUICK_INPUT_WIDGET);
  const input = widget.locator('input.input');
  await input.waitFor({ state: 'attached', timeout: 5000 });
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill('>Output: Focus on Output View');
  await expect(widget.locator(QUICK_INPUT_LIST_ROW).first()).toBeAttached({
    timeout: 5000,
  });
  await page.keyboard.press('Enter');

  await expect(panel).toBeVisible({ timeout: 10_000 });
};

/** Selects a specific output channel from the dropdown */
export const selectOutputChannel = async (
  page: Page,
  channelName: string,
  timeout = 30_000,
): Promise<void> => {
  const panel = outputPanel(page);
  await panel.waitFor({ state: 'visible', timeout: 5000 });

  await expect(async () => {
    const dropdown = panel.locator('select.monaco-select-box');
    await dropdown.waitFor({ state: 'attached', timeout: 5000 });
    const currentValue = await dropdown.inputValue();
    if (currentValue === channelName) {
      return;
    }
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    let targetValue: string | undefined;
    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i);
      const text = await option.textContent();
      const value = await option.getAttribute('value');
      if (text?.trim() === channelName || value === channelName) {
        targetValue = value ?? text?.trim();
        break;
      }
    }
    if (!targetValue) {
      throw new Error(`Channel "${channelName}" not found in dropdown options`);
    }
    const targetOption = dropdown.locator(`option[value="${targetValue}"]`);
    await expect(targetOption).not.toHaveAttribute('disabled', '', {
      timeout: 5000,
    });
    await dropdown.selectOption({ value: targetValue }, { force: true });
    await expect(dropdown).toHaveValue(targetValue, { timeout: 5000 });
  }).toPass({ timeout });
};

/** Checks if the output channel contains specific text */
export const outputChannelContains = async (
  page: Page,
  searchText: string,
  opts?: { timeout?: number },
): Promise<boolean> => {
  const { timeout = 10_000 } = opts ?? {};

  if (!(await waitForOutputContent(page, timeout))) return false;

  try {
    await withOutputFilter(
      page,
      searchText,
      async () => {
        await expect(async () => {
          const combinedText = await getAllOutputText(page);
          expect(
            combinedText.includes(searchText),
            `Expected "${searchText}" in output`,
          ).toBe(true);
        }).toPass({ timeout });
      },
      { timeout },
    );
    const safeName = searchText.replaceAll(/[^a-zA-Z0-9]/g, '_');
    await page.screenshot({ path: `test-results/filter-${safeName}.png` });
    return true;
  } catch {
    const safeName = searchText.replaceAll(/[^a-zA-Z0-9]/g, '_');
    await page.screenshot({ path: `test-results/filter-${safeName}.png` });
    return false;
  }
};

/** Clears the output channel by clicking the clear button */
export const clearOutputChannel = async (page: Page): Promise<void> => {
  const clearButton = page
    .getByRole('button', { name: 'Clear Output' })
    .first();
  await clearButton.click({ force: true });

  const codeArea = outputPanelCodeArea(page);
  await expect(async () => {
    const text = await codeArea.textContent();
    expect(
      text?.trim().length ?? 0,
      'Output channel should be completely cleared',
    ).toBe(0);
  }).toPass({ timeout: 2000 });
};

/** Wait for output channel to contain specific text */
export const waitForOutputChannelText = async (
  page: Page,
  opts: { expectedText: string; timeout?: number },
): Promise<void> => {
  const { expectedText, timeout = 30_000 } = opts;

  if (!(await waitForOutputContent(page, timeout))) {
    throw new Error(`Output channel did not have content within ${timeout}ms`);
  }

  const input = await ensureOutputFilterReady(page, Math.min(timeout, 15_000));
  try {
    await expect(async () => {
      await input.click({ force: true });
      await input.fill('', { force: true });
      await expect(input).toHaveValue('', { timeout: 5000 });
      await page.keyboard.press('Enter');
      await input.fill(expectedText, { force: true });
      await expect(input).toHaveValue(expectedText, { timeout: 5000 });
      await page.keyboard.press('Enter');
      const combinedText = await getAllOutputText(page);
      expect(
        combinedText.includes(expectedText),
        `Expected "${expectedText}" in output`,
      ).toBe(true);
    }).toPass({ timeout });
  } finally {
    await input.click({ force: true }).catch(() => {});
    await input.fill('', { force: true }).catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
  }
};

/** Opens output channel and captures screenshot for debugging */
export const captureOutputChannelDetails = async (
  page: Page,
  channelName: string,
  screenshotName?: string,
): Promise<void> => {
  const safeChannelName = channelName.replaceAll(/[^a-zA-Z0-9]/g, '_');
  const screenshotFileName =
    screenshotName ?? `output-channel-${safeChannelName}.png`;

  if (isMacDesktop()) {
    console.log(
      'Skipping "Open Output in Editor" on Mac Desktop (context menus not supported)',
    );
    await ensureOutputPanelOpen(page);
    await selectOutputChannel(page, channelName);
    await saveScreenshot(page, `test-results/${screenshotFileName}`, true);
    return;
  }

  await ensureOutputPanelOpen(page);
  await selectOutputChannel(page, channelName);

  try {
    const outputPanelToolbar = outputPanel(page).locator('.monaco-toolbar');
    const moreActionsButton = outputPanelToolbar
      .getByRole('button', { name: /More Actions|\.\.\./i })
      .last();

    await moreActionsButton.waitFor({ state: 'visible', timeout: 5000 });
    await moreActionsButton.click({ button: 'right' });

    const contextMenu = page.locator(CONTEXT_MENU);
    await contextMenu.waitFor({ state: 'visible', timeout: 5000 });
    const openInEditorOption = contextMenu.getByRole('menuitem', {
      name: /Open Output in Editor/i,
    });
    await openInEditorOption.click();

    const outputTab = page
      .locator(TAB)
      .filter({ hasText: new RegExp(channelName, 'i') });
    await outputTab.waitFor({ state: 'visible', timeout: 10_000 });

    const editor = page.locator(EDITOR_WITH_URI).last();
    await editor.waitFor({ state: 'visible', timeout: 10_000 });

    await saveScreenshot(page, `test-results/${screenshotFileName}`, true);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(
      `Failed to open output in editor (${errMsg}), falling back to output panel screenshot`,
    );
    await saveScreenshot(page, `test-results/${screenshotFileName}`, true);
  }
};
