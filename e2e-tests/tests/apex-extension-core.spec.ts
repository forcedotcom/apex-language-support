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
   * This test focuses on validating that LCS language services are working
   * beyond basic integration, including completion, hover, and document symbols.
   *
   * Verifies:
   * - LCS completion services work
   * - Document symbol functionality
   * - Editor remains responsive during LCS operations
   * - No fallback to stub implementation
   * - Language service message flow works correctly
   */
  test('should demonstrate advanced LCS language services functionality', async ({
    page,
  }) => {
    // Intercept worker messages if possible
    await page.addInitScript(() => {
      // Override worker creation to intercept messages
      const originalWorker = (window as any).Worker;
      if (originalWorker) {
        (window as any).Worker = class extends originalWorker {
          constructor(scriptURL: string | URL, options?: WorkerOptions) {
            super(scriptURL, options);
            console.log('🔧 Worker created:', scriptURL);

            this.addEventListener('message', (event: { data: any }) => {
              console.log('📨 Worker message:', event.data);
            });
          }
        };
      }
    });

    // Setup complete test session
    const { consoleErrors, networkErrors } = await setupFullTestSession(page);

    // Wait for LCS services to be ready
    await waitForLCSReady(page);

    // Test advanced LSP functionality
    const lspFunctionality = await testLSPFunctionality(page);

    // Test additional completion scenarios
    console.log('🔍 Testing advanced completion scenarios...');
    const editor = page.locator(SELECTORS.MONACO_EDITOR);
    await editor.click();

    // Test different completion contexts within the constructor
    const completionScenarios = [
      { text: 'System.', description: 'System class completion' },
      { text: 'String.', description: 'String class completion' },
      {
        text: 'Account testAcc = new ',
        description: 'Constructor completion',
      },
    ];

    let advancedCompletionsWorking = 0;

    for (const scenario of completionScenarios) {
      try {
        await positionCursorInConstructor(page);
        await page.keyboard.type(scenario.text);
        await page.waitForTimeout(1500);

        const completionWidget = page.locator(
          '.suggest-widget, .monaco-list, [id*="suggest"]',
        );
        const hasCompletion = await completionWidget
          .isVisible()
          .catch(() => false);

        if (hasCompletion) {
          advancedCompletionsWorking++;
          console.log(`✅ ${scenario.description}: Working`);
          await page.keyboard.press('Escape'); // Close completion
        } else {
          console.log(`ℹ️ ${scenario.description}: Not detected`);
        }

        // Clean up
        await page.keyboard.press('Control+Z');
      } catch (_error) {
        console.log(`⚠️ ${scenario.description}: Error during test`);
        await page.keyboard.press('Control+Z'); // Ensure cleanup
      }
    }

    // Detect LCS integration
    const lcsDetection = await detectLCSIntegration(page);
    console.log(lcsDetection.summary);

    // Perform validation
    const validation = performStrictValidation(consoleErrors, networkErrors);
    console.log(validation.summary);

    // Verify system stability
    await verifyVSCodeStability(page);

    console.log('🔧 Advanced LCS Functionality Results:');
    console.log(
      `   - Basic Editor: ${lspFunctionality.editorResponsive ? '✅' : '❌'}`,
    );
    console.log(
      `   - Completion Services: ${lspFunctionality.completionTested ? '✅' : '❌'}`,
    );
    console.log(
      `   - Symbol Services: ${lspFunctionality.symbolsTested ? '✅' : '❌'}`,
    );
    console.log(
      `   - Advanced Completions: ${advancedCompletionsWorking}/${completionScenarios.length} scenarios`,
    );
    console.log(
      `   - LCS Integration: ${lcsDetection.lcsIntegrationActive ? '✅ ACTIVE' : '❌ INACTIVE'}`,
    );

    // Assert advanced functionality criteria
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(lcsDetection.lcsIntegrationActive).toBe(true);
    expect(lcsDetection.hasStubFallback).toBe(false); // Should not fall back to stub
    expect(lcsDetection.hasErrorIndicators).toBe(false);
    expect(lspFunctionality.editorResponsive).toBe(true);

    // At least basic completion should work
    expect(
      lspFunctionality.completionTested || advancedCompletionsWorking > 0,
    ).toBe(true);

    console.log('🎉 Advanced LCS Language Services test PASSED');
    console.log(
      '   ✨ This test validates comprehensive LCS language service functionality',
    );
  });
});
