/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Main test helpers module - re-exports all utilities from focused sub-modules.
 *
 * This file maintains backward compatibility while providing access to the new
 * modular architecture. All existing imports should continue to work unchanged.
 *
 * Module Structure:
 * - error-handling.ts: Error validation, handling, and monitoring utilities
 * - worker-detection.ts: LCS worker detection and analysis
 * - vscode-interaction.ts: VS Code UI interaction and navigation
 * - lsp-testing.ts: Language Server Protocol testing utilities
 * - test-reporting.ts: Test result reporting and configuration
 * - test-orchestration.ts: High-level test coordination and setup
 */

// Re-export everything from error handling module
export {
  ErrorValidator,
  ErrorHandler,
  WaitingStrategies,
  setupConsoleMonitoring,
  setupNetworkMonitoring,
  filterCriticalErrors,
  validateAllErrorsInAllowList,
  validateAllNetworkErrorsInAllowList,
  type ErrorValidationConfig,
  type ErrorValidationResult,
  type WaitOptions,
  type ErrorHandlingOptions,
} from './error-handling';

// Re-export everything from worker detection module
export {
  WorkerDetectionService,
  detectLCSIntegration,
  setupWorkerResponseHook,
  type WorkerInfo,
  type PerformanceResourceEntry,
  type LCSDetectionResult,
} from './worker-detection';

// Re-export everything from VS Code interaction module
export {
  startVSCodeWeb,
  verifyWorkspaceFiles,
  activateExtension,
  waitForLSPInitialization,
  verifyVSCodeStability,
  verifyApexFileContentLoaded,
  ALL_SAMPLE_FILES,
  type SampleFile,
  type TestSessionResult,
} from './vscode-interaction';

// Re-export everything from LSP testing module
export {
  waitForLCSReady,
  testLSPFunctionality,
  positionCursorOnWord,
  triggerHover,
  testHoverScenario,
  executeHoverTestScenarios,
  detectOutlineSymbols,
  type HoverTestScenario,
  type HoverTestResult,
  type LSPFunctionalityResult,
} from './lsp-testing';

// Re-export everything from test reporting module
export {
  TestConfiguration,
  TestResultReporter,
  performStrictValidation,
  type ValidationResult,
} from './test-reporting';

// Re-export everything from test orchestration module
export {
  setupFullTestSession,
  setupApexTestEnvironment,
  type ExtendedTestSessionResult,
  type TestSessionOptions,
} from './test-orchestration';

/**
 * @deprecated Use the new modular imports for better organization.
 * This main file will continue to work but consider importing from specific modules:
 *
 * @example
 * // Instead of:
 * import { ErrorHandler, TestConfiguration } from './test-helpers';
 *
 * // Consider:
 * import { ErrorHandler } from './error-handling';
 * import { TestConfiguration } from './test-reporting';
 *
 * This provides better code organization and clearer dependencies.
 */
