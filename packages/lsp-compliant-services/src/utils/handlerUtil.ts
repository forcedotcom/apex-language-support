/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic } from 'vscode-languageserver';
import { getLogger, LogMessageType } from '@salesforce/apex-lsp-logging';

import { ApexError } from '@salesforce/apex-lsp-parser-ast';

/**
 * Utility function to log handler errors consistently
 * @param handlerName The name of the handler that encountered the error
 * @param error The error that occurred
 * @param context Optional context information about the error
 */
export function logHandlerError(
  handlerName: string,
  error: Error,
  context?: string,
): void {
  const logger = getLogger();
  const contextInfo = context ? ` (${context})` : '';

  logger.log(
    LogMessageType.Error,
    `Error in ${handlerName}${contextInfo}: ${error.message}`,
  );

  // Log additional error details if available
  if (error.stack) {
    logger.log(
      LogMessageType.Debug,
      () => `Stack trace for ${handlerName} error:\n${error.stack}`,
    );
  }

  // Log additional context if provided
  if (context) {
    logger.debug(`Error context: ${context}`);
  }
}

/**
 * Dispatch a promise and handle errors consistently
 * @param promise The promise to dispatch
 * @param errorContext The context for error logging
 * @returns The result of the promise
 */
export async function dispatch<T>(
  promise: Promise<T>,
  errorContext: string,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    logHandlerError('dispatch', error as Error, errorContext);
    throw error;
  }
}

/**
 * Convert compilation errors to diagnostics
 * @param errors The compilation errors
 * @returns Array of diagnostics
 */
export function getDiagnosticsFromErrors(errors: ApexError[]): Diagnostic[] {
  return errors.map((error) => ({
    range: {
      start: { line: error.line - 1, character: error.column - 1 },
      end: { line: error.line - 1, character: error.column },
    },
    message: error.message,
    severity: 1, // Error
  }));
}
