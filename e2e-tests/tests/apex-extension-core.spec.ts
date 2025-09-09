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
  validateAllErrorsInAllowList,
  validateAllNetworkErrorsInAllowList,
  verifyApexFileContentLoaded,
} from '../utils/test-helpers';

import { setupTestWorkspace } from '../utils/setup';

import {
  findAndActivateOutlineView,
  validateApexSymbolsInOutline,
  captureOutlineViewScreenshot,
} from '../utils/outline-helpers';

import { SELECTORS, EXPECTED_APEX_SYMBOLS } from '../utils/constants';

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
    // Setup test workspace
    await setupTestWorkspace();

    // Set up monitoring using utilities
    const consoleErrors = setupConsoleMonitoring(page);
    const networkErrors = setupNetworkMonitoring(page);

    // Execute test steps using helper functions
    await startVSCodeWeb(page);
    const fileCount = await verifyWorkspaceFiles(page);
    await activateExtension(page);
    await waitForLSPInitialization(page);

    // Validate all errors are in allowList (strict validation)
    const errorValidation = validateAllErrorsInAllowList(consoleErrors);

    // Report findings
    console.log('📊 Console error validation:');
    console.log(`   - Total errors: ${errorValidation.totalErrors}`);
    console.log(`   - Allowed errors: ${errorValidation.allowedErrors}`);
    console.log(
      `   - Non-allowed errors: ${errorValidation.nonAllowedErrors.length}`,
    );

    if (!errorValidation.allErrorsAllowed) {
      console.log('❌ NON-ALLOWED console errors found:');
      errorValidation.nonAllowedErrors.forEach((error, index) => {
        console.log(
          `  ${index + 1}. "${error.text}" (URL: ${error.url || 'no URL'})`,
        );
      });
    } else {
      console.log('✅ All console errors are in allowList');
    }

    // Validate all network errors are in allowList (strict validation)
    const networkValidation =
      validateAllNetworkErrorsInAllowList(networkErrors);

    if (!networkValidation.allErrorsAllowed) {
      console.log('❌ NON-ALLOWED network errors found:');
      networkValidation.nonAllowedErrors.forEach((error, index) => {
        console.log(
          `  ${index + 1}. HTTP ${error.status} ${error.url} (${error.description})`,
        );
      });
    } else {
      console.log('✅ All network errors are in allowList');
    }

    // Verify extension in extensions list
    console.log('📋 Checking extension list...');
    await page.keyboard.press('Control+Shift+X');
    await page.waitForSelector(SELECTORS.EXTENSIONS_VIEW, { timeout: 30_000 });

    const installedSection = page.locator('text=INSTALLED').first();
    if (await installedSection.isVisible()) {
      await installedSection.click();
      await page.waitForSelector('.extensions-list', { timeout: 5000 });
      console.log('✅ Found INSTALLED extensions section');
    }

    // Final stability verification
    await verifyVSCodeStability(page);

    // Assert success criteria - STRICT validation: all errors must be in allowList
    expect(errorValidation.allErrorsAllowed).toBe(true);
    expect(networkValidation.allErrorsAllowed).toBe(true);
    expect(fileCount).toBeGreaterThan(0); // find at least one Apex file

    // Report final results
    console.log(
      `🎉 Core functionality test PASSED - ${fileCount} Apex files loaded, all errors validated`,
    );
  });

  /**
   * Tests comprehensive outline view integration with Apex class symbol parsing.
   *
   * Verifies:
   * - Apex file opens correctly in editor
   * - Extension activates and LSP initializes
   * - Outline view loads and is accessible
   * - LSP parses file and generates outline structure with specific symbols
   * - Expected Apex symbols are populated (class, methods, fields)
   * - Complex symbol hierarchy and nesting is correctly displayed
   * - Both basic and advanced Apex language features are recognized
   */
  test('should open Apex class file and populate outline view with comprehensive symbol parsing', async ({
    page,
  }) => {
    // Setup test workspace
    await setupTestWorkspace();

    // Set up monitoring
    const consoleErrors = setupConsoleMonitoring(page);

    // Execute core test steps
    await startVSCodeWeb(page);

    // Ensure explorer view is accessible
    const explorer = page.locator(SELECTORS.EXPLORER);
    await expect(explorer).toBeVisible({ timeout: 30_000 });

    // Open Apex file and activate extension
    await activateExtension(page);

    // Wait for LSP to parse file and generate outline
    await waitForLSPInitialization(page);

    // Verify that Apex file content is loaded in the editor
    await verifyApexFileContentLoaded(page, 'ApexClassExample');

    // Find and activate outline view
    await findAndActivateOutlineView(page);

    // Validate that specific Apex symbols are populated in the outline
    const symbolValidation = await validateApexSymbolsInOutline(
      page,
      EXPECTED_APEX_SYMBOLS,
    );

    // Assert exact matches instead of loose counting
    expect(symbolValidation.classFound).toBe(true);
    expect(symbolValidation.allExpectedMethodsFound).toBe(true);
    expect(symbolValidation.exactMatch).toBe(true);

    // Additionally check for complex symbols that may be present in the comprehensive class
    console.log('🏗️ Validating comprehensive symbol hierarchy...');

    // Expected additional symbols in ApexClassExample.cls (beyond the basic ones)
    const additionalSymbols = [
      'DEFAULT_STATUS', // Static field
      'configCache', // Static field
      'instanceId', // Instance field
      'accounts', // Instance field
      'processAccounts', // Public method
      'Configuration', // Inner class
    ];

    let additionalSymbolsFound = 0;
    const foundAdditionalSymbols: string[] = [];

    for (const symbol of additionalSymbols) {
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
          additionalSymbolsFound++;
          foundAdditionalSymbols.push(symbol);
          symbolFound = true;
          console.log(`✅ Found additional symbol: ${symbol}`);
          break;
        }
      }

      if (!symbolFound) {
        console.log(`⚪ Additional symbol not found: ${symbol}`);
      }
    }

    // Count total outline items
    const outlineItems = page.locator(
      '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
    );
    const totalItems = await outlineItems.count();

    // Validate all errors are in allowList (strict validation)
    const errorValidation = validateAllErrorsInAllowList(consoleErrors);

    // Report findings
    console.log('📊 Outline test - Console error validation:');
    console.log(`   - Total errors: ${errorValidation.totalErrors}`);
    console.log(`   - Allowed errors: ${errorValidation.allowedErrors}`);
    console.log(
      `   - Non-allowed errors: ${errorValidation.nonAllowedErrors.length}`,
    );

    if (!errorValidation.allErrorsAllowed) {
      console.log('❌ NON-ALLOWED console errors found:');
      errorValidation.nonAllowedErrors.forEach((error, index) => {
        console.log(
          `  ${index + 1}. "${error.text}" (URL: ${error.url || 'no URL'})`,
        );
      });
    } else {
      console.log('✅ All console errors are in allowList');
    }

    // Capture screenshot for debugging
    await captureOutlineViewScreenshot(page, 'comprehensive-outline-test.png');

    // Assert comprehensive success criteria - STRICT validation with exact matching
    expect(errorValidation.allErrorsAllowed).toBe(true);
    expect(symbolValidation.exactMatch).toBe(true);
    expect(symbolValidation.missingMethods).toHaveLength(0);
    expect(totalItems).toBeGreaterThan(0);

    // Verify all specific methods are found (exact matching)
    expect(symbolValidation.exactMethodsFound).toEqual(
      expect.arrayContaining(EXPECTED_APEX_SYMBOLS.methods.map((m) => m.name)),
    );

    // Report comprehensive results combining both basic and advanced symbol detection
    console.log('🎉 Comprehensive outline view test COMPLETED');
    console.log('   - File: ✅ ApexClassExample.cls opened and loaded');
    console.log('   - Extension: ✅ Language features activated');
    console.log('   - Outline: ✅ Outline view loaded and accessible');

    // Basic symbols (required) - exact matching
    console.log('   - Basic symbols: ✅ All expected symbols found');
    console.log(
      `     • Class: ${symbolValidation.classFound ? '✅' : '❌'} ${EXPECTED_APEX_SYMBOLS.className}`,
    );
    console.log(
      `     • Methods: ${symbolValidation.exactMethodsFound.length}/${
        EXPECTED_APEX_SYMBOLS.methods.length
      } (${symbolValidation.exactMethodsFound.join(', ')})`,
    );

    // Additional symbols (nice to have)
    console.log(
      `   - Advanced symbols: ${additionalSymbolsFound}/${additionalSymbols.length} found`,
    );
    if (foundAdditionalSymbols.length > 0) {
      console.log(`     • Found: ${foundAdditionalSymbols.join(', ')}`);
    }

    console.log(`   - Total outline elements: ${totalItems}`);
    console.log(
      `   - Errors: ✅ ${errorValidation.nonAllowedErrors.length} non-allowed errors (strict validation: must be 0)`,
    );
    console.log(
      '   ✨ This test validates comprehensive LSP symbol parsing and outline population',
    );
  });
});
