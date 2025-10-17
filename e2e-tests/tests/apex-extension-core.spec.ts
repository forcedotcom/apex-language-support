/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { test, expect } from '@playwright/test';

import {
  setupApexTestEnvironment,
  performStrictValidation,
  testLSPFunctionality,
  verifyVSCodeStability,
  executeHoverTestScenarios,
  detectOutlineSymbols,
  TestResultReporter,
  TestConfiguration,
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
    // Setup complete Apex test environment with LCS detection
    const { consoleErrors, networkErrors, lcsDetection } =
      await setupApexTestEnvironment(page, {
        includeLCSDetection: true,
        expectedContent: TestConfiguration.EXPECTED_APEX_FILE,
      });

    // Report LCS detection results
    TestResultReporter.reportLCSDetection(lcsDetection!);

    // Test basic LSP functionality
    const lspFunctionality = await testLSPFunctionality(page);
    TestResultReporter.reportLSPFunctionality(lspFunctionality);

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
    TestResultReporter.reportValidation(validation);

    // Assert success criteria with LCS validation
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(lcsDetection!.lcsIntegrationActive).toBe(true);
    expect(lcsDetection!.hasErrorIndicators).toBe(false);
    expect(lspFunctionality.editorResponsive).toBe(true);

    // Bundle size validation using configuration
    if (lcsDetection!.bundleSize) {
      const bundleValidation = TestConfiguration.validateBundleSize(
        lcsDetection!.bundleSize,
      );
      expect(bundleValidation.meetsLCSThreshold).toBe(true);
      expect(bundleValidation.isValid).toBe(true);
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
    // Setup complete Apex test environment with LCS detection
    const { consoleErrors, networkErrors, lcsDetection } =
      await setupApexTestEnvironment(page, {
        includeLCSDetection: true,
        expectedContent: TestConfiguration.EXPECTED_APEX_FILE,
      });

    // Ensure explorer view is accessible
    const explorer = page.locator(SELECTORS.EXPLORER);
    await expect(explorer).toBeVisible({ timeout: 30_000 });

    // Find and activate outline view
    await findAndActivateOutlineView(page);

    // Validate that specific Apex symbols are populated in the outline
    const symbolValidation = await validateApexSymbolsInOutline(
      page,
      EXPECTED_APEX_SYMBOLS,
    );

    // Assert LCS type parsing capabilities
    expect(symbolValidation.classFound).toBe(true);

    // Validate LCS type parsing capabilities using optimized symbol detection
    console.log('🏗️ Validating LCS type parsing capabilities...');
    const expectedLCSSymbols = [
      'ApexClassExample', // Main class
      'Configuration', // Inner class
      'StatusType', // Inner enum
    ];

    const { foundSymbols, foundCount } = await detectOutlineSymbols(
      page,
      expectedLCSSymbols,
    );

    // Count total outline items
    const outlineItems = page.locator(
      '.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row',
    );
    const totalItems = await outlineItems.count();

    // Report LCS detection results
    TestResultReporter.reportLCSDetection(lcsDetection!);

    // Perform validation
    const validation = performStrictValidation(consoleErrors, networkErrors);
    TestResultReporter.reportValidation(validation);

    // Capture screenshot for debugging
    await captureOutlineViewScreenshot(page, 'lcs-outline-parsing-test.png');

    // Assert comprehensive success criteria for LCS type parsing
    expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
    expect(validation.networkValidation.allErrorsAllowed).toBe(true);
    expect(symbolValidation.classFound).toBe(true); // Main class must be found
    expect(totalItems).toBeGreaterThan(0);
    expect(foundCount).toBeGreaterThanOrEqual(
      TestConfiguration.MIN_EXPECTED_SYMBOLS,
    );
    expect(lcsDetection!.lcsIntegrationActive).toBe(true);

    // Verify LCS type parsing capabilities
    expect(foundSymbols).toContain('ApexClassExample'); // Main class
    expect(foundSymbols.length).toBeGreaterThanOrEqual(
      TestConfiguration.MIN_EXPECTED_SYMBOLS,
    );

    // Report comprehensive results using standardized reporter
    TestResultReporter.reportSymbolValidation(
      symbolValidation,
      expectedLCSSymbols,
      foundSymbols,
      totalItems,
    );
  });

  /**
   * Comprehensive hover functionality test with LCS integration.
   *
   * This test validates that hover functionality works correctly for various
   * Apex symbols including classes, methods, variables, and built-in types.
   *
   * Note: This test excludes standard Apex library classes (System, UserInfo, String methods)
   * as the standard apex library is currently not working. The test focuses on user-defined
   * classes and built-in types that should work with the current implementation.
   *
   * Verifies:
   * - Hover functionality is active and responsive for user-defined symbols
   * - Different symbol types provide appropriate hover information
   * - Hover content includes type information and signatures
   * - LCS integration provides rich hover data
   */
  test('should provide comprehensive hover information for Apex symbols', async ({
    page,
  }) => {
    // Setup complete Apex test environment (no LCS detection needed for hover test)
    await setupApexTestEnvironment(page, {
      includeLCSDetection: false,
      expectedContent: TestConfiguration.EXPECTED_APEX_FILE,
    });

    console.log('🔍 Testing hover functionality for subset of Apex symbols...');
    console.log(
      '   Note: Standard Apex library (System, UserInfo, String methods) currently excluded',
    );

    // Execute all hover scenarios with optimized batch processing
    const hoverResults = await executeHoverTestScenarios(
      page,
      HOVER_TEST_SCENARIOS,
    );

    // Report results using standardized reporter
    TestResultReporter.reportHoverResults(hoverResults);

    // Assert all hover scenarios passed
    expect(hoverResults.length).toBe(HOVER_TEST_SCENARIOS.length);
    expect(hoverResults.every((result) => result.success)).toBe(true);

    console.log('🎉 Hover Functionality test PASSED');
  });
});
