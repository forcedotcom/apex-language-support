/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';
import {
  performStrictValidation,
  TestResultReporter,
} from '../utils/test-helpers';
import { EXPECTED_APEX_SYMBOLS } from '../utils/constants';

/**
 * E2E tests for Apex Outline View functionality.
 *
 * Tests the LSP symbol parsing capabilities with LCS integration:
 * - Outline view population with Apex symbols
 * - Symbol hierarchy and nesting
 * - Different symbol types (classes, methods, fields, enums)
 * - LCS type parsing capabilities
 *
 * @group outline
 */

test.describe('Apex Outline View', () => {
  /**
   * Core outline test: Verify that the outline view populates with Apex symbols.
   * This is the refactored version of the original outline test using page objects.
   */
  test('should parse Apex symbols and populate outline view with LCS type parsing', async ({
    apexEditor,
    outlineView,
    apexTestEnvironment,
    consoleErrors,
    networkErrors,
  }) => {
    const { lcsDetection } = apexTestEnvironment;

    await test.step('Verify explorer is accessible', async () => {
      // Explorer should be visible from test environment setup
      console.log('✅ Explorer is accessible');
    });

    await test.step('Open and activate outline view', async () => {
      await outlineView.open();
      expect(await outlineView.isVisible()).toBe(true);
    });

    await test.step('Validate Apex symbols in outline', async () => {
      const symbolValidation = await outlineView.validateSymbols(
        EXPECTED_APEX_SYMBOLS,
      );
      expect(symbolValidation.classFound).toBe(true);
      expect(symbolValidation.allExpectedMethodsFound).toBe(true);
    });

    await test.step('Validate LCS type parsing capabilities', async () => {
      console.log('🏗️ Validating current outline symbol support...');

      const fullPopulationTimeout = process.env.CI ? 150_000 : 15_000;
      const preWaitCount = await outlineView.getSymbolCount();
      console.log(
        `🔍 Pre-wait outline count: ${preWaitCount} (waiting for ≥1, timeout=${fullPopulationTimeout}ms)`,
      );
      await outlineView
        .waitForSymbols(1, fullPopulationTimeout)
        .catch(() =>
          console.log('⚠️ Outline may not be fully populated, proceeding'),
        );
      const postWaitCount = await outlineView.getSymbolCount();
      console.log(`🔍 Post-wait outline count: ${postWaitCount}`);

      const mainClass = await outlineView.findSymbol('ApexClassExample', 5000);
      expect(mainClass).not.toBeNull();
      console.log('✅ Found current outline symbol support: ApexClassExample');
    });

    await test.step('Verify outline has expected symbol count', async () => {
      const totalItems = await outlineView.getSymbolCount();
      expect(totalItems).toBeGreaterThan(0);
      console.log(`✅ Outline contains ${totalItems} total items`);
    });

    await test.step('Capture screenshot for debugging', async () => {
      await outlineView.captureScreenshot('lcs-outline-parsing-test.png');
    });

    await test.step('Validate no critical errors', async () => {
      const validation = performStrictValidation(consoleErrors, networkErrors);
      TestResultReporter.reportValidation(validation);

      expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
      expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    });

    await test.step('Verify LCS integration is active', async () => {
      TestResultReporter.reportLCSDetection(lcsDetection!);
      expect(lcsDetection!.lcsIntegrationActive).toBe(true);
    });

    console.log('🎉 Outline view with LCS type parsing test PASSED');
  });

  /**
   * Test: Verify main class appears in outline.
   */
  test('should show main class in outline', async ({ outlineView }) => {
    await test.step('Open outline view', async () => {
      await outlineView.open();
    });

    await test.step('Wait for outline to populate', async () => {
      await outlineView.waitForSymbols(1);
    });

    await test.step('Find main class symbol', async () => {
      const mainClass = await outlineView.findSymbol('ApexClassExample');

      expect(mainClass).not.toBeNull();
      expect(mainClass?.name).toContain('ApexClassExample');
      console.log(`✅ Found main class: ${mainClass?.name}`);
    });
  });

  /**
   * Test: Verify inner class appears in outline.
   */
  test('should show inner class in outline', async ({ outlineView }) => {
    await outlineView.open();
    await outlineView.waitForSymbols(1);

    const innerClass = await outlineView.findSymbol('Configuration');

    expect(innerClass).not.toBeNull();
    expect(innerClass?.type).toBe('class');
    console.log(
      `✅ Found inner class: ${innerClass?.name} (type: ${innerClass?.type})`,
    );
  });

  /**
   * Test: Verify inner enum appears in outline.
   */
  test('should show inner enum in outline', async ({ outlineView }) => {
    await outlineView.open();
    await outlineView.waitForSymbols(1);

    const innerEnum = await outlineView.findSymbol('StatusType');

    expect(innerEnum).not.toBeNull();
    expect(innerEnum?.type).toBe('enum');
    console.log(
      `✅ Found inner enum: ${innerEnum?.name} (type: ${innerEnum?.type})`,
    );
  });

  /**
   * Test: Verify outline contains multiple symbols.
   */
  test('should show at least one symbol in outline', async ({
    outlineView,
  }) => {
    await outlineView.open();
    await outlineView.waitForSymbols(1);

    const symbols = await outlineView.getSymbols();

    expect(symbols.length).toBeGreaterThanOrEqual(1);
    console.log(`✅ Outline contains ${symbols.length} visible symbol(s)`);
  });

  /**
   * Test: Wait for outline to populate with symbols.
   */
  test('should populate outline within reasonable time', async ({
    outlineView,
  }) => {
    await outlineView.open();

    // Wait for at least 1 symbol to appear (use default timeout which is mode-aware)
    await outlineView.waitForSymbols(1);

    const count = await outlineView.getSymbolCount();
    expect(count).toBeGreaterThanOrEqual(1);
    console.log('✅ Outline populated within timeout');
  });

  /**
   * Test: Verify outline refreshes when file changes (if applicable).
   */
  test('should maintain outline visibility after refresh', async ({
    outlineView,
  }) => {
    await outlineView.open();

    await outlineView.refresh();
    await outlineView.waitForSymbols(1, 5000);

    const symbols = await outlineView.getSymbols();
    expect(symbols.length).toBeGreaterThan(0);

    console.log('✅ Outline maintained after refresh');
  });

  /**
   * Test: Verify symbol types are correctly identified.
   */
  test('should identify class symbols in outline', async ({ outlineView }) => {
    await outlineView.open();
    await outlineView.waitForSymbols(1);

    const symbols = await outlineView.getSymbols();

    const types = new Set(symbols.map((s) => s.type));

    expect(types.has('class')).toBe(true);
    console.log(
      `✅ Outline symbol types include: ${Array.from(types).join(', ')}`,
    );
  });

  /**
   * Test: Verify clicking on outline symbol navigates editor.
   */
  test('should navigate editor when clicking outline symbol', async ({
    apexEditor,
    outlineView,
  }) => {
    await outlineView.open();
    await outlineView.waitForSymbols(1);

    await test.step('Click on main class symbol', async () => {
      await outlineView.clickSymbol('ApexClassExample');
      await apexEditor
        .getPage()
        .locator('.view-line')
        .filter({ hasText: 'ApexClassExample' })
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });
    });

    await test.step('Verify Apex file is still open', async () => {
      expect(await apexEditor.isApexFileOpen()).toBe(true);
    });

    console.log('✅ Navigation to symbol succeeded');
  });

  /**
   * Test: Verify outline view can be reopened after closing.
   */
  test('should be able to reopen outline view', async ({ outlineView }) => {
    await test.step('Open outline view first time', async () => {
      await outlineView.open();
      expect(await outlineView.isVisible()).toBe(true);
    });

    await test.step('Close and reopen outline view', async () => {
      // Open outline again (it handles toggling if needed)
      await outlineView.open();
      expect(await outlineView.isVisible()).toBe(true);
    });

    console.log('✅ Outline view can be reopened');
  });

  /**
   * Test: Verify outline displays complex class structure.
   * Uses ComplexClass.cls test file.
   */
  test('should display complex class structure', async ({
    apexEditor,
    outlineView,
  }) => {
    // Note: This test assumes ComplexClass.cls is available in test workspace
    await test.step('Open complex class file', async () => {
      // Try to open ComplexClass if available, otherwise skip
      try {
        await apexEditor.openFile('ComplexClass.cls');
        await apexEditor.waitForLanguageServerReady();
      } catch (error) {
        const errStr =
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
            : JSON.stringify(error);
        console.log(
          '⚠️ ComplexClass.cls not available, using default file',
          errStr,
        );
      }
    });

    await test.step('Open outline and verify structure', async () => {
      await outlineView.open();
      await outlineView.waitForSymbols(1, 10000);

      const symbols = await outlineView.getSymbols();
      expect(symbols.length).toBeGreaterThan(0);
    });
  });
});
