/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, Page } from '@playwright/test';
import { closeWelcomeTabs, dismissAllQuickInputWidgets } from '../utils/helpers';
import { QUICK_INPUT_WIDGET, QUICK_INPUT_LIST_ROW, WORKBENCH } from '../utils/locators';

export const openCommandPalette = async (page: Page): Promise<void> => {
  const widget = page.locator(QUICK_INPUT_WIDGET);
  const workbench = page.locator(WORKBENCH);

  await closeWelcomeTabs(page);
  await dismissAllQuickInputWidgets(page);

  await expect(async () => {
    // Bring page to front to ensure VS Code window is active (critical on Windows)
    await page.bringToFront();
    // Click workbench to ensure focus is not on walkthrough elements; Windows needs explicit focus before F1
    await workbench.click({ timeout: 5000 });
    // Small delay to allow Windows to process focus change before F1 keypress
    await page.waitForTimeout(100);
    await page.keyboard.press('F1');
    await expect(widget).toBeVisible({ timeout: 5000 });
    const input = widget.locator('input.input');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue(/^>/, { timeout: 5000 });
  }).toPass({ timeout: 20_000 });
};

const executeCommand = async (
  page: Page,
  command: string,
  hasNotText?: string
): Promise<void> => {
  const widget = page.locator(QUICK_INPUT_WIDGET);
  const input = widget.locator('input.input');

  await expect(widget).toBeVisible({ timeout: 5000 });
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.click({ timeout: 5000 });
  await expect(input).toHaveValue(/^>/, { timeout: 5000 });

  await page.keyboard.press('End');
  await input.pressSequentially(command, { delay: 5 });

  await expect(widget.locator(QUICK_INPUT_LIST_ROW).first()).toBeAttached({
    timeout: 10_000,
  });

  const escapedCommand = command.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const commandRow = widget
    .locator(QUICK_INPUT_LIST_ROW)
    .filter({
      hasText: new RegExp(`^${escapedCommand}`),
      hasNotText,
    })
    .first();

  await expect(commandRow).toBeAttached({ timeout: 2000 });

  await commandRow.evaluate(el => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    (el as HTMLElement).click();
  });

  await widget.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
};

export const executeCommandWithCommandPalette = async (
  page: Page,
  command: string,
  hasNotText?: string
): Promise<void> => {
  await openCommandPalette(page);
  await executeCommand(page, command, hasNotText);
};

/** Verify a command exists in the command palette using retry pattern */
export const verifyCommandExists = async (
  page: Page,
  commandText: string,
  timeoutMs = 10_000
): Promise<void> => {
  await expect(
    async () => {
      await dismissAllQuickInputWidgets(page);
      await openCommandPalette(page);
      const widget = page.locator(QUICK_INPUT_WIDGET);
      const input = widget.locator('input.input');

      await expect(input).toBeVisible({ timeout: 5000 });
      await input.click({ timeout: 5000 });
      await page.keyboard.press('End');
      await input.pressSequentially(commandText, { delay: 5 });

      await expect(widget.locator(QUICK_INPUT_LIST_ROW).first()).toBeAttached({
        timeout: 10_000,
      });

      const first20Rows = (await widget.locator(QUICK_INPUT_LIST_ROW).all()).slice(0, 20);
      for (const row of first20Rows) {
        const rowText = await row.textContent();
        if (rowText?.trim().toLowerCase().includes(commandText.toLowerCase())) {
          return;
        }
      }
      throw new Error(`Command "${commandText}" not found yet`);
    },
    `Waiting for command "${commandText}" to be available`
  ).toPass({ timeout: timeoutMs });

  await page.keyboard.press('Escape');
  await page.locator(QUICK_INPUT_WIDGET).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
};

/** Verify a command does not exist in the command palette */
export const verifyCommandDoesNotExist = async (
  page: Page,
  commandText: string
): Promise<void> => {
  await openCommandPalette(page);
  const widget = page.locator(QUICK_INPUT_WIDGET);
  const input = widget.locator('input.input');

  await expect(input).toBeVisible({ timeout: 5000 });
  await input.click({ timeout: 5000 });
  await input.pressSequentially(commandText, { delay: 5 });

  await expect(widget.locator(QUICK_INPUT_LIST_ROW).first()).toBeAttached({
    timeout: 10_000,
  });

  const listRows = widget.locator(QUICK_INPUT_LIST_ROW);
  const first20Rows = (await listRows.all()).slice(0, 20);

  for (const row of first20Rows) {
    const rowText = await row.textContent();
    if (rowText?.trim().toLowerCase().includes(commandText.toLowerCase())) {
      throw new Error(
        `Command "${commandText}" should not exist but was found in command palette`
      );
    }
  }

  await page.keyboard.press('Escape');
  await widget.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
};

/** Wait for a command to be available in the command palette (useful when waiting for extensions to load) */
export const waitForCommandToBeAvailable = async (
  page: Page,
  commandText: string,
  timeoutMs = 30_000
): Promise<void> => {
  await expect(
    async () => {
      await openCommandPalette(page);
      const widget = page.locator(QUICK_INPUT_WIDGET);
      const input = widget.locator('input.input');

      await expect(input).toBeVisible({ timeout: 5000 });
      await input.click({ timeout: 5000 });

      await page.keyboard.press('End');
      await input.pressSequentially(commandText, { delay: 5 });

      await expect(widget.locator(QUICK_INPUT_LIST_ROW).first()).toBeAttached({
        timeout: 10_000,
      });

      const escapedCommand = commandText.replaceAll(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      const commandRow = widget
        .locator(QUICK_INPUT_LIST_ROW)
        .filter({ hasText: new RegExp(`^${escapedCommand}`) })
        .first();

      await expect(
        commandRow,
        `Command "${commandText}" should be available`
      ).toBeAttached({ timeout: 2000 });

      await page.keyboard.press('Escape');
      await widget.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    },
    `Waiting for command "${commandText}" to be available`
  ).toPass({ timeout: timeoutMs });
};
