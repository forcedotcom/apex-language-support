/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type Page } from '@playwright/test';
import type { ConsoleError, NetworkError } from './constants';
import {
  NON_CRITICAL_ERROR_PATTERNS,
  NON_CRITICAL_NETWORK_PATTERNS,
  SELECTORS,
} from './constants';

/**
 * Configuration for error validation.
 */
export interface ErrorValidationConfig<T> {
  readonly patterns: readonly string[];
  readonly getErrorText: (error: T) => string;
  readonly getErrorUrl?: (error: T) => string;
  readonly includeWarnings?: boolean;
}

/**
 * Result of error validation.
 */
export interface ErrorValidationResult<T> {
  readonly allErrorsAllowed: boolean;
  readonly nonAllowedErrors: T[];
  readonly totalErrors: number;
  readonly allowedErrors: number;
}

/**
 * Options for waiting operations.
 */
export interface WaitOptions {
  readonly timeout?: number;
  readonly interval?: number;
  readonly retries?: number;
}

/**
 * Error handling options.
 */
export interface ErrorHandlingOptions {
  readonly logError?: boolean;
  readonly throwError?: boolean;
  readonly defaultValue?: any;
  readonly context?: string;
}

/**
 * Generic error validation utility.
 */
export class ErrorValidator {
  /**
   * Validates errors against allowed patterns.
   */
  static validateErrors<T>(
    errors: T[],
    config: ErrorValidationConfig<T>,
  ): ErrorValidationResult<T> {
    const nonAllowedErrors: T[] = [];
    let allowedErrors = 0;

    errors.forEach((error) => {
      const text = config.getErrorText(error).toLowerCase();
      const url = config.getErrorUrl?.(error)?.toLowerCase() || '';

      const isAllowed = config.patterns.some(
        (pattern) =>
          text.includes(pattern.toLowerCase()) ||
          url.includes(pattern.toLowerCase()) ||
          (config.includeWarnings && text.includes('warning')),
      );

      if (isAllowed) {
        allowedErrors++;
      } else {
        nonAllowedErrors.push(error);
      }
    });

    return {
      allErrorsAllowed: nonAllowedErrors.length === 0,
      nonAllowedErrors,
      totalErrors: errors.length,
      allowedErrors,
    };
  }

  /**
   * Filters errors to exclude non-critical patterns.
   */
  static filterCriticalErrors<T>(
    errors: T[],
    config: ErrorValidationConfig<T>,
  ): T[] {
    return errors.filter((error) => {
      const text = config.getErrorText(error).toLowerCase();
      const url = config.getErrorUrl?.(error)?.toLowerCase() || '';

      return !config.patterns.some(
        (pattern) =>
          text.includes(pattern.toLowerCase()) ||
          url.includes(pattern.toLowerCase()) ||
          (config.includeWarnings && text.includes('warning')),
      );
    });
  }
}

/**
 * Standardized error handling utility.
 */
export class ErrorHandler {
  /**
   * Handles errors with consistent logging and behavior.
   */
  static handle<T>(
    error: unknown,
    options: ErrorHandlingOptions = {},
  ): T | undefined {
    const {
      logError = true,
      throwError = false,
      defaultValue,
      context = 'Operation',
    } = options;

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (logError) {
      console.log(`⚠️ ${context} failed: ${errorMessage}`);
    }

    if (throwError) {
      throw error instanceof Error ? error : new Error(errorMessage);
    }

    return defaultValue;
  }

  /**
   * Safely executes an async operation with error handling.
   */
  static async safeExecute<T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions = {},
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      return this.handle<T>(error, options);
    }
  }

  /**
   * Safely executes a sync operation with error handling.
   */
  static safeExecuteSync<T>(
    operation: () => T,
    options: ErrorHandlingOptions = {},
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      return this.handle<T>(error, options);
    }
  }
}

/**
 * Utility class for standardized waiting strategies.
 */
export class WaitingStrategies {
  /**
   * Waits for a condition to be true with configurable timeout and interval.
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    options: WaitOptions = {},
  ): Promise<void> {
    const {
      timeout = 10000,
      interval = 100,
      retries = Math.floor(timeout / interval),
    } = options;

    for (let i = 0; i < retries; i++) {
      try {
        if (await condition()) {
          return;
        }
      } catch (_error) {
        // Continue trying
      }

      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Waits for LSP server to be responsive by checking editor functionality.
   */
  static async waitForLSPResponsive(
    page: Page,
    options: WaitOptions = {},
  ): Promise<void> {
    const { timeout = 15000 } = options;

    await this.waitForCondition(
      async () => {
        try {
          // Check if editor is responsive to basic operations
          const monacoEditor = page.locator(SELECTORS.MONACO_EDITOR);
          if (!(await monacoEditor.isVisible())) return false;

          // Try to focus the editor as a responsiveness test
          await monacoEditor.click({ timeout: 1000 });
          return true;
        } catch {
          return false;
        }
      },
      { timeout },
    );
  }
}

/**
 * Sets up console error monitoring for a page.
 *
 * @param page - Playwright page instance
 * @returns Array to collect console errors
 */
export const setupConsoleMonitoring = (page: Page): ConsoleError[] => {
  const consoleErrors: ConsoleError[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        url: msg.location()?.url || '',
      });
    }
  });

  return consoleErrors;
};

/**
 * Sets up network error monitoring for all failed requests.
 *
 * @param page - Playwright page instance
 * @returns Array to collect network errors
 */
export const setupNetworkMonitoring = (page: Page): NetworkError[] => {
  const networkErrors: NetworkError[] = [];

  page.on('response', (response) => {
    if (!response.ok()) {
      networkErrors.push({
        status: response.status(),
        url: response.url(),
        description: `HTTP ${response.status()} ${response.statusText()}`,
      });
    }
  });

  return networkErrors;
};

/**
 * Filters console errors to exclude non-critical patterns.
 *
 * @param errors - Array of console errors to filter
 * @returns Filtered array of critical errors only
 */
export const filterCriticalErrors = (errors: ConsoleError[]): ConsoleError[] =>
  ErrorValidator.filterCriticalErrors(errors, {
    patterns: NON_CRITICAL_ERROR_PATTERNS,
    getErrorText: (error) => error.text,
    getErrorUrl: (error) => error.url || '',
    includeWarnings: true,
  });

/**
 * Validates that all console errors are in the allowList.
 * Returns detailed information about any errors that are NOT allowed.
 *
 * @param errors - Array of console errors to validate
 * @returns Object with validation results and details about non-allowed errors
 */
export const validateAllErrorsInAllowList = (
  errors: ConsoleError[],
): ErrorValidationResult<ConsoleError> =>
  ErrorValidator.validateErrors(errors, {
    patterns: NON_CRITICAL_ERROR_PATTERNS,
    getErrorText: (error) => error.text,
    getErrorUrl: (error) => error.url || '',
    includeWarnings: true,
  });

/**
 * Validates that all network errors are in the allowList.
 * Returns detailed information about any errors that are NOT allowed.
 *
 * @param errors - Array of network errors to validate
 * @returns Object with validation results and details about non-allowed errors
 */
export const validateAllNetworkErrorsInAllowList = (
  errors: NetworkError[],
): ErrorValidationResult<NetworkError> =>
  ErrorValidator.validateErrors(errors, {
    patterns: NON_CRITICAL_NETWORK_PATTERNS,
    getErrorText: (error) => error.description,
    getErrorUrl: (error) => error.url,
    includeWarnings: false,
  });
