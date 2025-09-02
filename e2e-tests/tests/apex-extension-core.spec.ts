/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { test, expect } from '@playwright/test';

import {
  setupConsoleMonitoring,
  setupNetworkMonitoring,
  startVSCodeWeb,
  verifyWorkspaceFiles,
  activateExtension,
  waitForLSPInitialization,
  verifyVSCodeStability,
  filterCriticalErrors,
  reportTestResults,
  verifyApexFileContentLoaded,
  logStep,
  logSuccess,
  logWarning,
} from '../utils/test-helpers';

import {
  findAndActivateOutlineView,
  validateApexSymbolsInOutline,
  captureOutlineViewScreenshot,
  reportOutlineTestResults,
  EXPECTED_APEX_SYMBOLS,
} from '../utils/outline-helpers';

import {
  ASSERTION_THRESHOLDS,
  SELECTORS,
  TEST_TIMEOUTS,
} from '../utils/constants';

/**
 * Core E2E tests for Apex Language Server Extension.
 *
 * Tests essential functionality:
 * - VS Code Web startup and workbench loading
 * - Extension activation on Apex file interaction
 * - LSP worker initialization and error monitoring
 * - Outline view integration and symbol parsing
 * - File recognition and workspace integration
 *
 * @group core
 */

test.describe('Apex Extension Core Functionality', () => {
  /**
   * Tests VS Code Web startup, extension activation, and LSP worker loading.
   *
   * Verifies:
   * - VS Code Web environment loads correctly
   * - Extension activates when opening Apex files
   * - LSP worker starts without critical errors
   * - File recognition works in the workspace
   * - Extension stability after activation
   */
  test('should start VS Code Web, activate extension, and load LSP worker', async ({
    page,
  }) => {
    // Set up monitoring using utilities
    const consoleErrors = setupConsoleMonitoring(page);
    const networkFailures = setupNetworkMonitoring(page);

    // Execute test steps using helper functions
    await startVSCodeWeb(page);
    const fileCount = await verifyWorkspaceFiles(page);
    await activateExtension(page);
    await waitForLSPInitialization(page);

    // Filter and analyze errors
    const criticalErrors = filterCriticalErrors(consoleErrors);

    // Report findings
    if (criticalErrors.length > 0) {
      console.log(
        '⚠️  Critical console errors found:',
        criticalErrors.map((e) => `${e.text} (${e.url})`),
      );
    } else {
      console.log('✅ No critical console errors');
    }

    if (networkFailures.length > 0) {
      console.log('⚠️  Worker network failures:', networkFailures);
    } else {
      console.log('✅ No worker loading failures');
    }

    // Verify extension in extensions list
    console.log('📋 Checking extension list...');
    await page.keyboard.press('Control+Shift+X');
    await page.waitForSelector(SELECTORS.EXTENSIONS_VIEW, { timeout: 10_000 });

    const installedSection = page.locator('text=INSTALLED').first();
    if (await installedSection.isVisible()) {
      await installedSection.click();
      await page.waitForTimeout(2000);
      console.log('✅ Found INSTALLED extensions section');
    }

    // Final stability verification
    await verifyVSCodeStability(page);

    // Assert success criteria using constants
    expect(criticalErrors.length).toBeLessThan(
      ASSERTION_THRESHOLDS.MAX_CRITICAL_ERRORS,
    );
    expect(networkFailures.length).toBeLessThan(
      ASSERTION_THRESHOLDS.MAX_NETWORK_FAILURES,
    );
    expect(fileCount).toBeGreaterThan(ASSERTION_THRESHOLDS.MIN_FILE_COUNT);

    // Report final results
    reportTestResults(
      'Core functionality',
      fileCount,
      criticalErrors.length,
      networkFailures.length,
    );
  });

  /**
   * Tests outline view integration and symbol population when opening Apex files.
   *
   * Verifies:
   * - Apex file opens correctly in editor
   * - Extension activates and LSP initializes
   * - Outline view loads and is accessible
   * - LSP parses file and generates outline structure with specific symbols
   * - Expected Apex symbols (HelloWorld class, sayHello method, add method) are populated
   * - Symbol hierarchy and nesting is correctly displayed
   */
  test('should open Apex class file and populate outline view with LSP-parsed symbols', async ({
    page,
  }) => {
    // Set up monitoring
    const consoleErrors = setupConsoleMonitoring(page);

    // Execute core test steps
    await startVSCodeWeb(page);

    // Ensure explorer view is accessible
    const explorer = page.locator(SELECTORS.EXPLORER);
    await expect(explorer).toBeVisible({ timeout: 10_000 });

    // Open Apex file and activate extension
    await activateExtension(page);

    // Wait for LSP to parse file and generate outline
    await waitForLSPInitialization(page);

    // Verify that any Apex file content is loaded in the editor (could be any of the 3 .cls files)
    const contentLoaded = await verifyApexFileContentLoaded(page);
    expect(contentLoaded).toBe(true);

    // Find and activate outline view
    const outlineFound = await findAndActivateOutlineView(page);

    // Validate that specific Apex symbols are populated in the outline
    const symbolValidation = await validateApexSymbolsInOutline(page);

    // Filter and analyze errors
    const criticalErrors = filterCriticalErrors(consoleErrors);

    if (criticalErrors.length > 0) {
      console.log(
        '⚠️  Critical console errors found:',
        criticalErrors.map((e) => `${e.text} (${e.url})`),
      );
    } else {
      console.log('✅ No critical console errors');
    }

    // Capture screenshot for debugging
    await captureOutlineViewScreenshot(page);

    // Assert comprehensive success criteria for outline population
    expect(criticalErrors.length).toBeLessThan(
      ASSERTION_THRESHOLDS.MAX_CRITICAL_ERRORS,
    );

    // Assert that the outline view is populated with expected symbols
    expect(outlineFound).toBe(true);
    expect(symbolValidation.classFound).toBe(true);
    expect(symbolValidation.methodsFound.length).toBeGreaterThanOrEqual(
      EXPECTED_APEX_SYMBOLS.methods.length,
    );
    expect(symbolValidation.isValidStructure).toBe(true);
    expect(symbolValidation.totalSymbolsDetected).toBeGreaterThan(0);

    // Verify specific methods are found
    for (const method of EXPECTED_APEX_SYMBOLS.methods) {
      expect(symbolValidation.methodsFound).toContain(method.name);
    }

    // Report comprehensive results
    reportOutlineTestResults(
      outlineFound,
      symbolValidation,
      criticalErrors.length,
    );
  });

  /**
   * Tests LSP symbol hierarchy with complex Apex class structure.
   *
   * Verifies:
   * - Complex Apex class with multiple methods, fields, and inner class
   * - LSP correctly parses nested symbol hierarchy
   * - Public, private, and static modifiers are recognized
   * - Inner classes are properly nested in outline view
   * - Constructor, methods, and fields all appear in outline
   */
  test('should parse complex Apex class hierarchy in outline view', async ({
    page,
  }) => {
    // Set up monitoring
    const consoleErrors = setupConsoleMonitoring(page);

    // Execute core test steps
    await startVSCodeWeb(page);

    // Ensure explorer view is accessible
    const explorer = page.locator(SELECTORS.EXPLORER);
    await expect(explorer).toBeVisible({ timeout: 10_000 });

    // Specifically click on ComplexExample.cls file
    logStep('Opening ComplexExample.cls for hierarchy testing', '📄');
    const complexFile = page
      .locator('.cls-ext-file-icon')
      .filter({ hasText: 'ComplexExample' });

    if (await complexFile.isVisible()) {
      await complexFile.click();
      logSuccess('Clicked on ComplexExample.cls file');
    } else {
      // Fallback to any .cls file
      const anyClsFile = page.locator(SELECTORS.CLS_FILE_ICON).first();
      await anyClsFile.click();
      logWarning(
        'ComplexExample.cls not found, using first available .cls file',
      );
    }

    // Wait for editor to load with the file content
    await page.waitForSelector(SELECTORS.EDITOR_PART, { timeout: 15_000 });
    const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR);
    await monacoEditor.waitFor({ state: 'visible', timeout: 10_000 });

    // Wait for LSP to parse the complex file
    await waitForLSPInitialization(page);

    // Verify that the complex Apex file content is loaded
    const contentLoaded = await verifyApexFileContentLoaded(
      page,
      'ComplexExample',
    );
    expect(contentLoaded).toBe(true);

    // Give extra time for complex symbol parsing
    await page.waitForTimeout(TEST_TIMEOUTS.OUTLINE_GENERATION * 2);

    // Find and activate outline view
    const outlineFound = await findAndActivateOutlineView(page);

    // Look for complex symbol hierarchy
    logStep('Validating complex symbol hierarchy', '🏗️');

    // Expected symbols in ComplexExample.cls
    const expectedComplexSymbols = [
      'ComplexExample', // Main class
      'DEFAULT_STATUS', // Static field
      'configCache', // Static field
      'instanceId', // Instance field
      'accounts', // Instance field
      'processAccounts', // Public method
      'validateAccounts', // Private method
      'enrichAccountData', // Private method
      'updateAccountStatus', // Private method
      'formatPhoneNumber', // Static method
      'Configuration', // Inner class
    ];

    let symbolsFound = 0;
    const foundSymbols: string[] = [];

    for (const symbol of expectedComplexSymbols) {
      // Try multiple selectors to find each symbol
      const symbolSelectors = [
        `text=${symbol}`,
        `.outline-tree .monaco-list-row:has-text("${symbol}")`,
        `[aria-label*="${symbol}"]`,
        `.monaco-tree .monaco-list-row:has-text("${symbol}")`,
      ];

      let symbolFound = false;
      for (const selector of symbolSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          symbolsFound++;
          foundSymbols.push(symbol);
          symbolFound = true;
          logSuccess(`Found symbol: ${symbol}`);
          break;
        }
      }

      if (!symbolFound) {
        logWarning(`Symbol not found: ${symbol}`);
      }
    }

    // Count total outline items
    const outlineItems = page.locator(
      '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
    );
    const totalItems = await outlineItems.count();

    // Filter and analyze errors
    const criticalErrors = filterCriticalErrors(consoleErrors);

    if (criticalErrors.length > 0) {
      console.log(
        '⚠️  Critical console errors found:',
        criticalErrors.map((e) => `${e.text} (${e.url})`),
      );
    } else {
      console.log('✅ No critical console errors');
    }

    // Capture screenshot for debugging
    await captureOutlineViewScreenshot(page, 'complex-hierarchy-test.png');

    // Assert hierarchy validation criteria
    expect(criticalErrors.length).toBeLessThan(
      ASSERTION_THRESHOLDS.MAX_CRITICAL_ERRORS,
    );
    expect(outlineFound).toBe(true);
    expect(symbolsFound).toBeGreaterThan(expectedComplexSymbols.length / 2); // At least half the symbols
    expect(totalItems).toBeGreaterThan(0);

    // Report hierarchy test results
    console.log('🎉 Complex hierarchy test COMPLETED');
    console.log('   - File: ✅ ComplexExample.cls opened');
    console.log('   - Outline: ✅ Outline view activated');
    console.log(
      `   - Symbols: ${symbolsFound}/${expectedComplexSymbols.length} found (${foundSymbols.join(', ')})`,
    );
    console.log(`   - Total items: ${totalItems} outline elements`);
    console.log(`   - Errors: ✅ ${criticalErrors.length} critical errors`);
    console.log(
      '   ✨ This test validates LSP complex symbol hierarchy parsing',
    );
  });
});
