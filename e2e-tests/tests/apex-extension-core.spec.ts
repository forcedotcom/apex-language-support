/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { test, expect } from '@playwright/test';

import {
  setupFullTestSession,
  performStrictValidation,
  detectLCSIntegration,
  waitForLCSReady,
  testLSPFunctionality,
  verifyApexFileContentLoaded,
  verifyVSCodeStability,
  positionCursorInConstructor,
} from '../utils/test-helpers';

import {
  findAndActivateOutlineView,
  validateApexSymbolsInOutline,
  captureOutlineViewScreenshot,
} from '../utils/outline-helpers';

import { SELECTORS, EXPECTED_APEX_SYMBOLS } from '../utils/constants';

/**
 * Comprehensive E2E tests for Apex Language Server Extension with LCS Integration.
 *
 * This consolidated test suite covers:
 * - VS Code Web startup and workbench loading
 * - Extension activation and LSP worker initialization
 * - LCS (LSP-Compliant-Services) integration validation
 * - Outline view integration and symbol parsing
 * - Language service functionality (completion, symbols)
 * - Error monitoring and stability verification
 *
 * @group core
 */

test.describe('Apex Extension with LCS Integration', () => {
  /**
   * Core functionality test: VS Code startup, extension activation, and LCS integration.
   *
   * This test consolidates the functionality from:
   * - Basic extension activation
   * - LCS integration readiness
   * - Worker bundle validation
   *
   * Verifies:
   * - VS Code Web environment loads correctly
   * - Extension activates when opening Apex files
   * - LCS services are integrated (not using stub fallback)
   * - Worker loading and bundle size indicates LCS inclusion
   * - Extension stability after activation
   * - Strict error validation (all errors must be in allowList)
   */
  test('should start VS Code, activate extension, and validate LCS integration', async ({
    page,
  }) => {
    // Setup complete test session with monitoring
    const { consoleErrors, networkErrors } = await setupFullTestSession(page);

    // Verify that Apex file content is loaded in the editor
    await verifyApexFileContentLoaded(page, 'ApexClassExample');

    // Wait for LCS services to be ready
    await waitForLCSReady(page);

    // Detect and validate LCS integration
    const lcsDetection = await detectLCSIntegration(page);
    console.log(lcsDetection.summary);

    // Test basic LSP functionality
    const lspFunctionality = await testLSPFunctionality(page);
    console.log('🔧 LSP Functionality Test Results:');
    console.log(
      `   - Editor Responsive: ${lspFunctionality.editorResponsive ? '✅' : '❌'}`,
    );
    console.log(
      `   - Completion Tested: ${lspFunctionality.completionTested ? '✅' : '❌'}`,
    );
    console.log(
      `   - Symbols Tested: ${lspFunctionality.symbolsTested ? '✅' : '❌'}`,
    );

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

    // Perform comprehensive validation
    const validation = performStrictValidation(consoleErrors, networkErrors);
    console.log(validation.summary);

    // Assert success criteria with LCS validation
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(lcsDetection.lcsIntegrationActive).toBe(true);
    expect(lcsDetection.hasErrorIndicators).toBe(false);
    expect(lspFunctionality.editorResponsive).toBe(true);

    // Bundle size validation - LCS should produce larger bundles (>5MB)
    if (lcsDetection.bundleSize) {
      const sizeInMB = lcsDetection.bundleSize / 1024 / 1024;
      expect(sizeInMB).toBeGreaterThan(5);
      console.log(
        `✅ Bundle size confirms LCS integration: ${sizeInMB.toFixed(2)} MB`,
      );
    }

    console.log('🎉 Core functionality with LCS integration test PASSED');
  });

  /**
   * Comprehensive outline view and symbol parsing test.
   *
   * This test focuses on the LSP symbol parsing capabilities with LCS integration.
   *
   * Verifies:
   * - Apex file opens correctly in editor
   * - Extension activates and LCS initializes
   * - Outline view loads and is accessible
   * - LSP parses file and generates outline structure
   * - Expected Apex symbols are populated (class, nested types)
   * - LCS type parsing capabilities (classes, inner classes, enums)
   * - Complex symbol hierarchy and nesting is correctly displayed
   */
  test('should parse Apex symbols and populate outline view with LCS type parsing', async ({
    page,
  }) => {
    // Setup complete test session
    const { consoleErrors, networkErrors } = await setupFullTestSession(page);

    // Ensure explorer view is accessible
    const explorer = page.locator(SELECTORS.EXPLORER);
    await expect(explorer).toBeVisible({ timeout: 30_000 });

    // Verify that Apex file content is loaded in the editor
    await verifyApexFileContentLoaded(page, 'ApexClassExample');

    // Wait for LCS services to be ready
    await waitForLCSReady(page);

    // Find and activate outline view
    await findAndActivateOutlineView(page);

    // Validate that specific Apex symbols are populated in the outline
    const symbolValidation = await validateApexSymbolsInOutline(
      page,
      EXPECTED_APEX_SYMBOLS,
    );

    // Assert LCS type parsing capabilities
    expect(symbolValidation.classFound).toBe(true);

    // Validate LCS type parsing capabilities (nested types)
    console.log('🏗️ Validating LCS type parsing capabilities...');

    const expectedLCSSymbols = [
      'ApexClassExample', // Main class
      'Configuration', // Inner class
      'StatusType', // Inner enum
    ];

    let lcsSymbolsFound = 0;
    const foundLCSSymbols: string[] = [];

    for (const symbol of expectedLCSSymbols) {
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
          lcsSymbolsFound++;
          foundLCSSymbols.push(symbol);
          symbolFound = true;
          console.log(`✅ Found LCS symbol: ${symbol}`);
          break;
        }
      }

      if (!symbolFound) {
        console.log(`❌ LCS symbol not found: ${symbol}`);
      }
    }

    // Count total outline items
    const outlineItems = page.locator(
      '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
    );
    const totalItems = await outlineItems.count();

    // Detect LCS integration status
    const lcsDetection = await detectLCSIntegration(page);
    console.log(lcsDetection.summary);

    // Perform validation
    const validation = performStrictValidation(consoleErrors, networkErrors);
    console.log(validation.summary);

    // Capture screenshot for debugging
    await captureOutlineViewScreenshot(page, 'lcs-outline-parsing-test.png');

    // Assert comprehensive success criteria for LCS type parsing
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(symbolValidation.classFound).toBe(true); // Main class must be found
    expect(totalItems).toBeGreaterThan(0);
    expect(lcsSymbolsFound).toBeGreaterThanOrEqual(2); // At least main class + 1 nested type
    expect(lcsDetection.lcsIntegrationActive).toBe(true);

    // Verify LCS type parsing capabilities
    expect(foundLCSSymbols).toContain('ApexClassExample'); // Main class
    expect(foundLCSSymbols.length).toBeGreaterThanOrEqual(2); // At least 2 types parsed

    // Report comprehensive results
    console.log('🎉 LCS Type Parsing and Outline View test COMPLETED');
    console.log('   - File: ✅ ApexClassExample.cls opened and loaded');
    console.log('   - Extension: ✅ Language features activated');
    console.log('   - LCS Integration: ✅ Active and functional');
    console.log('   - Outline: ✅ Outline view loaded and accessible');
    console.log(
      `     • Class: ${symbolValidation.classFound ? '✅' : '❌'} ${EXPECTED_APEX_SYMBOLS.className}`,
    );
    console.log(
      `     • Types parsed: ${lcsSymbolsFound}/${expectedLCSSymbols.length} (${foundLCSSymbols.join(', ')})`,
    );
    console.log(`   - Total outline elements: ${totalItems}`);
    console.log(
      '   ✨ This test validates LCS integration and comprehensive type parsing',
    );
  });

  /**
   * Advanced LCS language services functionality test.
   *
   * This test validates that LCS language services are working correctly
   * by testing a single, reliable completion scenario.
   *
   * Verifies:
   * - LCS completion services work (System.debug completion)
   * - Document symbol functionality
   * - Editor remains responsive during LCS operations
   * - No fallback to stub implementation
   * - Language service message flow works correctly
   */
  test('should demonstrate advanced LCS language services functionality', async ({
    page,
  }) => {
    // Setup complete test session
    const { consoleErrors, networkErrors } = await setupFullTestSession(page);

    // Wait for LCS services to be ready
    await waitForLCSReady(page);

    // Test core completion functionality - System.debug should always work in Apex
    console.log('🔍 Testing System.debug completion...');
    const editor = page.locator(SELECTORS.MONACO_EDITOR);
    await editor.click();

    // Position cursor and test System.debug completion
    await positionCursorInConstructor(page);
    await page.keyboard.type('System.');

    // Trigger completion
    await page.keyboard.press('ControlOrMeta+Space');

    // Wait for completion widget to appear - fail if it doesn't
    await page.waitForSelector(
      '.suggest-widget.visible, .monaco-list[aria-label*="suggest"], [aria-label*="IntelliSense"]',
      {
        timeout: 5000,
        state: 'visible',
      },
    );

    const completionWidget = page.locator(
      '.suggest-widget.visible, .monaco-list[aria-label*="suggest"], [aria-label*="IntelliSense"]',
    );

    // Verify completion widget is visible
    expect(completionWidget).toBeVisible();

    // Verify completion items exist
    const completionItems = page.locator('.monaco-list-row');
    const itemCount = await completionItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Verify System.debug is available in completions
    const systemDebugItem = page.locator('.monaco-list-row:has-text("debug")');
    expect(systemDebugItem).toBeVisible();

    console.log(`✅ System.debug completion working with ${itemCount} items`);

    // Close completion and clean up
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Z'); // Undo typing

    // Test document symbols functionality
    console.log('🔍 Testing document symbols...');
    await page.keyboard.press('ControlOrMeta+Shift+O');

    const symbolPicker = page.locator(
      '.quick-input-widget, [id*="quickInput"]',
    );
    await symbolPicker.waitFor({ state: 'visible', timeout: 3000 });
    expect(symbolPicker).toBeVisible();

    // Verify symbols are available
    const symbolItems = page.locator('.quick-input-widget .monaco-list-row');
    const symbolCount = await symbolItems.count();
    expect(symbolCount).toBeGreaterThan(0);

    console.log(`✅ Document symbols working with ${symbolCount} symbols`);

    // Close symbol picker
    await page.keyboard.press('Escape');

    // Detect LCS integration
    const lcsDetection = await detectLCSIntegration(page);
    console.log(lcsDetection.summary);

    // Perform validation
    const validation = performStrictValidation(consoleErrors, networkErrors);
    console.log(validation.summary);

    // Verify system stability
    await verifyVSCodeStability(page);

    console.log('🔧 Advanced LCS Functionality Results:');
    console.log('   - System.debug Completion: ✅ WORKING');
    console.log('   - Document Symbols: ✅ WORKING');
    console.log(
      `   - LCS Integration: ${lcsDetection.lcsIntegrationActive ? '✅ ACTIVE' : '❌ INACTIVE'}`,
    );

    // Assert all functionality criteria - fail loudly if any component fails
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(lcsDetection.lcsIntegrationActive).toBe(true);
    expect(lcsDetection.hasStubFallback).toBe(false); // Must not fall back to stub
    expect(lcsDetection.hasErrorIndicators).toBe(false);

    console.log('🎉 Advanced LCS Language Services test PASSED');
    console.log(
      '   ✨ This test validates core LCS language service functionality without fallbacks',
    );
  });
});
