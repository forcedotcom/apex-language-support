/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Locator, Page, expect } from '@playwright/test';
import { closeWelcomeTabs, getModifierShortcut } from '../utils/helpers';
import { WORKBENCH, SETTINGS_SEARCH_INPUT } from '../utils/locators';

const settingsLocator = (page: Page): Locator =>
  page.locator(SETTINGS_SEARCH_INPUT.join(','));

export const openSettingsUI = async (page: Page): Promise<void> => {
  await closeWelcomeTabs(page);
  await page.locator(WORKBENCH).click({ timeout: 60_000 });
  await page.keyboard.press(getModifierShortcut(','));
  await settingsLocator(page).first().waitFor({ timeout: 3000 });
  const workspaceTab = page.getByRole('tab', { name: 'Workspace' });
  await workspaceTab.click();
  await expect(workspaceTab).toHaveAttribute('aria-selected', 'true', {
    timeout: 3000,
  });
};

const performSearch =
  (page: Page) =>
  async (query: string): Promise<void> => {
    const searchMonaco = settingsLocator(page).first();
    await searchMonaco.waitFor({ timeout: 3000 });
    await searchMonaco.click();
    await page.waitForTimeout(200);
    await searchMonaco.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);
    const textarea = searchMonaco.locator('textarea').first();
    await expect(textarea).toHaveValue('', { timeout: 2000 });
    await page.keyboard.type(query);
  };

/** Upsert settings using Settings (UI) search and fill of each id. */
export const upsertSettings = async (
  page: Page,
  settings: Record<string, string>,
): Promise<void> => {
  await openSettingsUI(page);

  for (const [id, value] of Object.entries(settings)) {
    await settingsLocator(page).first().waitFor({ timeout: 3000 });
    await performSearch(page)(id);

    await page
      .locator('[data-id^="searchResultModel_"]')
      .first()
      .waitFor({ state: 'attached', timeout: 15_000 });

    const searchResultId = `searchResultModel_${id.replace(/\./, '_')}`;
    const row = page.locator(`[data-id="${searchResultId}"]`).first();

    await row.waitFor({ state: 'attached', timeout: 15_000 });
    await row.waitFor({ state: 'visible', timeout: 30_000 });

    const checkbox = row.getByRole('checkbox').first();
    const isCheckboxSetting =
      (value === 'true' || value === 'false') && (await checkbox.count()) > 0;

    if (isCheckboxSetting) {
      await checkbox.waitFor({ timeout: 30_000 });
      const isChecked = await checkbox.isChecked();
      const desiredChecked = value === 'true';
      if (isChecked !== desiredChecked) {
        await checkbox.click();
        await expect(checkbox).toHaveAttribute(
          'aria-checked',
          desiredChecked ? 'true' : 'false',
          { timeout: 10_000 },
        );
      }
    } else {
      const combobox = row.getByRole('combobox').first();
      const comboboxCount = await combobox.count();

      if (comboboxCount > 0) {
        await combobox.waitFor({ timeout: 30_000 });
        const isNativeSelect =
          (await combobox.evaluate((el) => el.tagName)) === 'SELECT';

        if (isNativeSelect) {
          await combobox.selectOption(value);
        } else {
          await combobox.click({ timeout: 5000 });
          const option = page
            .locator('.monaco-list-row[role="option"]')
            .filter({ hasText: new RegExp(`^${value}$`, 'i') });
          await option.waitFor({ state: 'visible', timeout: 10_000 });
          await option.click();
        }
        await expect(combobox).toHaveValue(value, { timeout: 10_000 });
      } else {
        const roleTextbox = row.getByRole('textbox').first();
        const roleSpinbutton = row.getByRole('spinbutton').first();
        const textboxCount = await roleTextbox.count();
        const inputElement = textboxCount > 0 ? roleTextbox : roleSpinbutton;
        await inputElement.waitFor({ timeout: 30_000 });
        await inputElement.click({ timeout: 5000 });
        await inputElement.clear();
        await expect(inputElement).toBeEmpty({ timeout: 10_000 });
        await inputElement.fill(value);
        await inputElement.blur();
        await expect(inputElement).toHaveValue(value, { timeout: 10_000 });
      }
    }
  }
};
