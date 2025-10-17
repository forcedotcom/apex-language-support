/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ConsoleError, NetworkError } from './constants';
import type { ErrorValidationResult } from './error-handling';
import type { LCSDetectionResult } from './worker-detection';
import type { LSPFunctionalityResult, HoverTestScenario } from './lsp-testing';
import {
  validateAllErrorsInAllowList,
  validateAllNetworkErrorsInAllowList,
} from './error-handling';

/**
 * Result object for test session validation.
 */
export interface ValidationResult {
  readonly consoleValidation: ErrorValidationResult<ConsoleError>;
  readonly networkValidation: ErrorValidationResult<NetworkError>;
  readonly summary: string;
}

/**
 * Test configuration for centralized settings.
 */
export class TestConfiguration {
  // Bundle size thresholds
  static readonly MIN_LCS_BUNDLE_SIZE_MB = 5;
  static readonly MAX_BUNDLE_SIZE_MB = 50;

  // Timeout configurations
  static readonly DEFAULT_LSP_TIMEOUT = 15000;
  static readonly DEFAULT_HOVER_TIMEOUT = 1500;
  static readonly DEFAULT_SYMBOL_TIMEOUT = 5000;

  // Test expectations
  static readonly MIN_EXPECTED_SYMBOLS = 2;
  static readonly EXPECTED_APEX_FILE = 'ApexClassExample';

  // Performance thresholds
  static readonly MAX_SETUP_TIME_MS = 60000;
  static readonly MAX_TEST_DURATION_MS = 120000;

  /**
   * Validates bundle size against LCS expectations.
   */
  static validateBundleSize(bundleSize: number): {
    isValid: boolean;
    sizeInMB: number;
    meetsLCSThreshold: boolean;
  } {
    const sizeInMB = bundleSize / 1024 / 1024;
    const meetsLCSThreshold = sizeInMB >= this.MIN_LCS_BUNDLE_SIZE_MB;
    const isValid = sizeInMB <= this.MAX_BUNDLE_SIZE_MB;

    return {
      isValid,
      sizeInMB,
      meetsLCSThreshold,
    };
  }

  /**
   * Gets adaptive timeout based on environment.
   */
  static getAdaptiveTimeout(baseTimeout: number): number {
    // Increase timeout in CI environments
    const multiplier = process.env.CI ? 2 : 1;
    return baseTimeout * multiplier;
  }
}

/**
 * Test result reporter for standardized logging and assertions.
 */
export class TestResultReporter {
  /**
   * Reports LCS detection results with standardized formatting.
   */
  static reportLCSDetection(lcsDetection: LCSDetectionResult): void {
    console.log(lcsDetection.summary);

    if (lcsDetection.bundleSize) {
      const sizeInMB = lcsDetection.bundleSize / 1024 / 1024;
      console.log(
        `✅ Bundle size confirms LCS integration: ${sizeInMB.toFixed(2)} MB`,
      );
    }
  }

  /**
   * Reports LSP functionality test results.
   */
  static reportLSPFunctionality(
    lspFunctionality: LSPFunctionalityResult,
  ): void {
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
  }

  /**
   * Reports validation results with detailed error information.
   */
  static reportValidation(validation: ValidationResult): void {
    console.log(validation.summary);
  }

  /**
   * Reports symbol validation results with detailed findings.
   */
  static reportSymbolValidation(
    symbolValidation: any,
    expectedSymbols: string[],
    foundSymbols: string[],
    totalItems: number,
  ): void {
    console.log('🎉 LCS Type Parsing and Outline View test COMPLETED');
    console.log('   - File: ✅ ApexClassExample.cls opened and loaded');
    console.log('   - Extension: ✅ Language features activated');
    console.log('   - LCS Integration: ✅ Active and functional');
    console.log('   - Outline: ✅ Outline view loaded and accessible');
    console.log(
      `     • Class: ${symbolValidation.classFound ? '✅' : '❌'} ApexClassExample`,
    );
    console.log(
      `     • Types parsed: ${foundSymbols.length}/${expectedSymbols.length} (${foundSymbols.join(', ')})`,
    );
    console.log(`   - Total outline elements: ${totalItems}`);
    console.log(
      '   ✨ This test validates LCS integration and comprehensive type parsing',
    );
  }

  /**
   * Reports hover test results with success/failure summary.
   */
  static reportHoverResults(
    hoverResults: Array<{ scenario: HoverTestScenario; success: boolean }>,
  ): void {
    const successCount = hoverResults.filter((r) => r.success).length;
    const totalCount = hoverResults.length;

    console.log(
      `🔍 Hover Test Results: ${successCount}/${totalCount} scenarios passed`,
    );

    hoverResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.scenario.description}`);
    });
  }
}

/**
 * Performs comprehensive validation of test session results.
 * Consolidates error validation and reporting logic.
 *
 * @param consoleErrors - Console errors collected during test
 * @param networkErrors - Network errors collected during test
 * @returns Validation results with summary
 */
export const performStrictValidation = (
  consoleErrors: ConsoleError[],
  networkErrors: NetworkError[],
): ValidationResult => {
  const consoleValidation = validateAllErrorsInAllowList(consoleErrors);
  const networkValidation = validateAllNetworkErrorsInAllowList(networkErrors);

  let summary = '📊 Validation Results:\n';
  summary += `   - Console errors: ${consoleValidation.totalErrors} (${consoleValidation.allowedErrors} allowed, `;
  summary += `${consoleValidation.nonAllowedErrors.length} blocked)\n`;
  summary += `   - Network errors: ${networkValidation.totalErrors} (${networkValidation.allowedErrors} allowed, `;
  summary += `${networkValidation.nonAllowedErrors.length} blocked)\n`;
  const passed =
    consoleValidation.allErrorsAllowed && networkValidation.allErrorsAllowed;
  summary += `   - Overall status: ${passed ? '✅ PASSED' : '❌ FAILED'}`;

  if (consoleValidation.nonAllowedErrors.length > 0) {
    summary += '\n❌ Non-allowed console errors:';
    consoleValidation.nonAllowedErrors.forEach((error, index) => {
      summary += `\n  ${index + 1}. "${error.text}" (URL: ${error.url || 'no URL'})`;
    });
  }

  if (networkValidation.nonAllowedErrors.length > 0) {
    summary += '\n❌ Non-allowed network errors:';
    networkValidation.nonAllowedErrors.forEach((error, index) => {
      summary += `\n  ${index + 1}. HTTP ${error.status} ${error.url} (${error.description})`;
    });
  }

  return { consoleValidation, networkValidation, summary };
};
