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
  testHoverScenario,
  type HoverTestScenario,
} from '../utils/test-helpers';

import {
  findAndActivateOutlineView,
  validateApexSymbolsInOutline,
  captureOutlineViewScreenshot,
} from '../utils/outline-helpers';

import {
  SELECTORS,
  EXPECTED_APEX_SYMBOLS,
  HOVER_TEST_SCENARIOS,
} from '../utils/constants';

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
      {
        text: 'System.',
        description: 'System class completion',
        expectedItems: ['System.debug'],
      },
      {
        text: 'String.',
        description: 'String class completion',
        expectedItems: ['String.valueOf'],
      },
      {
        text: 'Account testAcc = new ',
        description: 'Constructor completion',
        expectedItems: ['Account'],
      },
    ];

    let advancedCompletionsWorking = 0;

    for (const scenario of completionScenarios) {
      try {
        await positionCursorInConstructor(page);
        await page.keyboard.type(scenario.text);

        // Manually trigger completion if it didn't appear automatically
        // Use ControlOrMeta for cross-platform compatibility
        await page.keyboard.press('ControlOrMeta+Space');

        // Wait for completion widget to appear or timeout
        await page
          .waitForSelector(
            '.suggest-widget.visible, .monaco-list[aria-label*="suggest"], [aria-label*="IntelliSense"]',
            {
              timeout: 3000,
              state: 'visible',
            },
          )
          .catch(() => {});

        const completionWidget = page.locator(
          '.suggest-widget.visible, .monaco-list[aria-label*="suggest"], [aria-label*="IntelliSense"]',
        );
        const hasCompletion = await completionWidget
          .isVisible()
          .catch(() => false);

        // Additional check for completion items and content
        const completionItems = page.locator('.monaco-list-row');
        const itemCount = await completionItems.count();
        const hasCompletionItems = hasCompletion && itemCount > 0;

        // Look for specific expected completion items
        let hasExpectedItems = false;
        if (hasCompletionItems && scenario.expectedItems) {
          for (const expectedItem of scenario.expectedItems) {
            const itemExists =
              (await page
                .locator(`.monaco-list-row:has-text("${expectedItem}")`)
                .count()) > 0;
            if (itemExists) {
              hasExpectedItems = true;
              break;
            }
          }
        }

        if (hasCompletion || hasCompletionItems || hasExpectedItems) {
          advancedCompletionsWorking++;
          const detail = hasExpectedItems
            ? 'with expected items'
            : hasCompletionItems
              ? `with ${itemCount} items`
              : 'detected';
          console.log(`✅ ${scenario.description}: Working (${detail})`);
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

  /**
   * Comprehensive hover functionality test with LCS integration.
   *
   * This test validates that hover functionality works correctly for various
   * Apex symbols including classes, methods, variables, and built-in types.
   *
   * Verifies:
   * - Hover functionality is active and responsive
   * - Different symbol types provide appropriate hover information
   * - Hover content includes type information and signatures
   * - LCS integration provides rich hover data
   * - No fallback to stub implementation for hovers
   */
  test('should provide comprehensive hover information for Apex symbols', async ({
    page,
  }) => {
    // Setup complete test session
    const { consoleErrors, networkErrors } = await setupFullTestSession(page);

    // Verify that Apex file content is loaded in the editor
    await verifyApexFileContentLoaded(page, 'ApexClassExample');

    // Wait for LCS services to be ready
    await waitForLCSReady(page);

    console.log('🔍 Testing hover functionality for various Apex symbols...');

    // Test hover scenarios
    const hoverResults: Array<{
      scenario: HoverTestScenario;
      success: boolean;
      hoverContent: string | null;
    }> = [];

    let successfulHovers = 0;
    let totalHovers = 0;

    // Test a subset of hover scenarios to keep test time reasonable
    const testScenarios = HOVER_TEST_SCENARIOS.slice(0, 8); // Test first 8 scenarios

    for (const scenario of testScenarios) {
      totalHovers++;
      const result = await testHoverScenario(page, scenario);

      hoverResults.push({
        scenario,
        success: result.success,
        hoverContent: result.hoverContent,
      });

      if (result.success) {
        successfulHovers++;
      }

      // Small delay between hover tests to avoid interference
      await page.waitForTimeout(200);
    }

    // Test additional hover scenarios for critical symbols
    console.log('🎯 Testing critical hover scenarios...');
    const criticalScenarios: HoverTestScenario[] = [
      {
        description: 'Built-in System class hover',
        searchText: 'System.debug',
        expectedPatterns: ['System'],
      },
      {
        description: 'Built-in String class hover',
        searchText: 'String.isBlank',
        expectedPatterns: ['String'],
      },
      {
        description: 'Variable type hover',
        searchText: 'private String instanceId',
        expectedPatterns: ['String'],
      },
    ];

    for (const scenario of criticalScenarios) {
      totalHovers++;
      const result = await testHoverScenario(page, scenario);

      hoverResults.push({
        scenario,
        success: result.success,
        hoverContent: result.hoverContent,
      });

      if (result.success) {
        successfulHovers++;
      }

      await page.waitForTimeout(200);
    }

    // Detect LCS integration
    const lcsDetection = await detectLCSIntegration(page);
    console.log(lcsDetection.summary);

    // Perform validation
    const validation = performStrictValidation(consoleErrors, networkErrors);
    console.log(validation.summary);

    // Verify system stability
    await verifyVSCodeStability(page);

    // Report comprehensive results
    console.log('🎯 Hover Functionality Test Results:');
    console.log(`   - Total hover tests: ${totalHovers}`);
    console.log(`   - Successful hovers: ${successfulHovers}`);
    console.log(
      `   - Success rate: ${Math.round((successfulHovers / totalHovers) * 100)}%`,
    );
    console.log(
      `   - LCS Integration: ${lcsDetection.lcsIntegrationActive ? '✅ ACTIVE' : '❌ INACTIVE'}`,
    );

    // Log details of failed hovers for debugging
    const failedHovers = hoverResults.filter((r) => !r.success);
    if (failedHovers.length > 0) {
      console.log('❌ Failed hover scenarios:');
      failedHovers.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.scenario.description}`);
        console.log(`     Search text: "${result.scenario.searchText}"`);
        console.log(
          `     Expected: ${result.scenario.expectedPatterns.join(', ')}`,
        );
        console.log(
          `     Content: ${result.hoverContent ? result.hoverContent.substring(0, 50) + '...' : 'No content'}`,
        );
      });
    }

    // Log successful hovers for verification
    const successfulHoverResults = hoverResults.filter((r) => r.success);
    if (successfulHoverResults.length > 0) {
      console.log('✅ Successful hover scenarios:');
      successfulHoverResults.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.scenario.description}`);
        console.log(
          `     Content preview: ${result.hoverContent?.substring(0, 60)}...`,
        );
      });
    }

    // Assert success criteria
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(lcsDetection.lcsIntegrationActive).toBe(true);
    expect(lcsDetection.hasStubFallback).toBe(false); // Should not fall back to stub
    expect(lcsDetection.hasErrorIndicators).toBe(false);

    // Hover functionality assertions
    expect(successfulHovers).toBeGreaterThan(0); // At least some hovers should work
    expect(successfulHovers / totalHovers).toBeGreaterThan(0.3); // At least 30% success rate

    // Verify that at least one critical hover works
    const criticalHoverSuccess = hoverResults
      .filter((r) =>
        criticalScenarios.some(
          (cs) => cs.description === r.scenario.description,
        ),
      )
      .some((r) => r.success);
    expect(criticalHoverSuccess).toBe(true);

    console.log('🎉 Hover Functionality test COMPLETED');
    console.log('   - File: ✅ ApexClassExample.cls opened and loaded');
    console.log('   - Extension: ✅ Language features activated');
    console.log('   - LCS Integration: ✅ Active and functional');
    console.log(
      `   - Hover Tests: ✅ ${successfulHovers}/${totalHovers} scenarios passed`,
    );
    console.log(
      '   ✨ This test validates comprehensive hover functionality with LCS integration',
    );
  });
});
