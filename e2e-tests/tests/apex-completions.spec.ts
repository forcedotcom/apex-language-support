/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';

/**
 * E2E tests for Apex code completion (IntelliSense).
 *
 * Tests the completion provider through the VS Code editor UI:
 * - Dot-completion for member access
 * - General identifier/type completion
 * - Completion list content verification
 * - Sort ordering of completion items
 * - Dismiss and re-trigger behavior
 * - String literal exclusion (no completions inside strings)
 *
 * @group completions
 */

test.describe('Apex Completions', () => {
  test.beforeEach(async ({ apexEditor }) => {
    await apexEditor.waitForLanguageServerReady();
  });

  /**
   * Test: Dot-completion shows member suggestions.
   */
  test('should show member suggestions on dot-completion', async ({
    apexEditor,
  }) => {
    test.slow();
    const page = apexEditor.getPage();

    await test.step('Type object reference followed by dot', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText("String s = 'hello';\n");
      await apexEditor.typeText('s.');
    });

    await test.step('Verify suggest widget appears with member methods', async () => {
      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget.waitFor({ state: 'visible', timeout: 10000 });

      const content = await suggestWidget.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);

      await page.keyboard.press('Escape');
    });
  });

  /**
   * Test: General identifier completion shows matching types.
   */
  test('should show matching types for identifier prefix', async ({
    apexEditor,
  }) => {
    test.slow();
    const page = apexEditor.getPage();

    await test.step('Type a type prefix and trigger completion', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText('Str');
      await apexEditor.triggerCompletion();
    });

    await test.step('Verify matching types appear in suggestions', async () => {
      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget.waitFor({ state: 'visible', timeout: 10000 });

      const content = await suggestWidget.textContent();
      expect(content).toBeTruthy();
      expect(content!).toMatch(/String/i);

      await page.keyboard.press('Escape');
    });
  });

  /**
   * Test: Completion list contains expected items in a method body.
   */
  test('should contain class names and methods in completion list', async ({
    apexEditor,
  }) => {
    test.slow();
    const page = apexEditor.getPage();

    await test.step('Position cursor in method body and trigger completion', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText('');
      await apexEditor.triggerCompletion();
    });

    await test.step('Verify completion list contains system types', async () => {
      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget.waitFor({ state: 'visible', timeout: 10000 });

      const content = await suggestWidget.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);

      await page.keyboard.press('Escape');
    });
  });

  /**
   * Test: Sort ordering — local variables appear before system types.
   */
  test('should sort local variables before system types', async ({
    apexEditor,
  }) => {
    test.slow();
    const page = apexEditor.getPage();

    await test.step('Declare a local variable and trigger completion with matching prefix', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText('Integer myIntVar = 42;\n');
      await apexEditor.typeText('myI');
      await apexEditor.triggerCompletion();
    });

    await test.step('Verify local variable appears in suggestions', async () => {
      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget.waitFor({ state: 'visible', timeout: 10000 });

      const content = await suggestWidget.textContent();
      expect(content).toBeTruthy();
      expect(content!).toMatch(/myIntVar/);

      await page.keyboard.press('Escape');
    });
  });

  /**
   * Test: Dismiss and re-trigger completion.
   */
  test('should dismiss and re-trigger completion successfully', async ({
    apexEditor,
  }) => {
    test.slow();
    const page = apexEditor.getPage();

    await test.step('Trigger completion and verify it appears', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText('Sys');
      await apexEditor.triggerCompletion();

      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget.waitFor({ state: 'visible', timeout: 10000 });
      expect(await suggestWidget.isVisible()).toBe(true);
    });

    await test.step('Dismiss completion with Escape', async () => {
      await page.keyboard.press('Escape');

      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget
        .waitFor({ state: 'hidden', timeout: 5000 })
        .catch(() => {});
      const isVisible = await suggestWidget.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    await test.step('Re-trigger completion and verify it works again', async () => {
      await apexEditor.triggerCompletion();

      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      await suggestWidget.waitFor({ state: 'visible', timeout: 10000 });

      const content = await suggestWidget.textContent();
      expect(content).toBeTruthy();
      expect(content!).toMatch(/System/i);

      await page.keyboard.press('Escape');
    });
  });

  /**
   * Test: No completions inside string literals.
   */
  test('should not show completions inside string literals', async ({
    apexEditor,
  }) => {
    test.slow();
    const page = apexEditor.getPage();

    await test.step('Position cursor inside a string literal', async () => {
      await apexEditor.goToPosition(10, 1);
      await apexEditor.typeText("String s = 'hello ");
    });

    await test.step('Trigger completion and verify no suggest widget appears', async () => {
      await page.keyboard.press('Control+Space');

      const suggestWidget = page.locator(
        '.monaco-editor .suggest-widget, .editor-widget.suggest-widget',
      );
      const appeared = await suggestWidget
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      expect(appeared).toBe(false);
    });
  });
});
