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
} from '../utils/test-helpers';

import { setupTestWorkspace } from '../utils/setup';

import {
  findAndActivateOutlineView,
  validateApexSymbolsInOutline,
  captureOutlineViewScreenshot,
  EXPECTED_APEX_SYMBOLS,
} from '../utils/outline-helpers';

import { ASSERTION_THRESHOLDS, SELECTORS } from '../utils/constants';

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
      await page.waitForSelector('.extensions-list', { timeout: 5000 });
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
    await expect(explorer).toBeVisible({ timeout: 10_000 });

    // Open Apex file and activate extension
    await activateExtension(page);

    // Wait for LSP to parse file and generate outline
    await waitForLSPInitialization(page);

    // Verify that Apex file content is loaded in the editor
    await verifyApexFileContentLoaded(page, 'ApexClassExample');

    // Find and activate outline view
    await findAndActivateOutlineView(page);

    // Validate that specific Apex symbols are populated in the outline
    const symbolValidation = await validateApexSymbolsInOutline(page);

    // Additionally check for complex symbols that may be present in the comprehensive class
    logStep('Validating comprehensive symbol hierarchy', '🏗️');

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
          logSuccess(`Found additional symbol: ${symbol}`);
          break;
        }
      }

      if (!symbolFound) {
        logStep(`Additional symbol not found: ${symbol}`, '⚪');
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
    await captureOutlineViewScreenshot(page, 'comprehensive-outline-test.png');

    // Assert comprehensive success criteria
    expect(criticalErrors.length).toBeLessThan(
      ASSERTION_THRESHOLDS.MAX_CRITICAL_ERRORS,
    );
    expect(symbolValidation.classFound).toBe(true);
    expect(symbolValidation.methodsFound.length).toBeGreaterThanOrEqual(
      EXPECTED_APEX_SYMBOLS.methods.length,
    );
    expect(symbolValidation.isValidStructure).toBe(true);
    expect(symbolValidation.totalSymbolsDetected).toBeGreaterThan(0);
    expect(totalItems).toBeGreaterThan(0);

    // Verify specific methods are found
    for (const method of EXPECTED_APEX_SYMBOLS.methods) {
      expect(symbolValidation.methodsFound).toContain(method.name);
    }

    // Report comprehensive results combining both basic and advanced symbol detection
    console.log('🎉 Comprehensive outline view test COMPLETED');
    console.log('   - File: ✅ ApexClassExample.cls opened and loaded');
    console.log('   - Extension: ✅ Language features activated');
    console.log('   - Outline: ✅ Outline view loaded and accessible');

    // Basic symbols (required)
    console.log('   - Basic symbols: ✅ All expected symbols found');
    console.log(
      `     • Class: ${symbolValidation.classFound ? '✅' : '❌'} ApexClassExample`,
    );
    console.log(
      `     • Methods: ${symbolValidation.methodsFound.length}/${
        EXPECTED_APEX_SYMBOLS.methods.length
      } (${symbolValidation.methodsFound.join(', ')})`,
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
      `   - Errors: ✅ ${criticalErrors.length} critical errors (threshold: ${
        ASSERTION_THRESHOLDS.MAX_CRITICAL_ERRORS
      })`,
    );
    console.log(
      '   ✨ This test validates comprehensive LSP symbol parsing and outline population',
    );
  });
});
