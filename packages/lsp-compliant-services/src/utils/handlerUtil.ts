/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-logging';

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
  const baseMessage = `Error in ${handlerName}${contextInfo}: ${error.message}`;

  let fullMessage = baseMessage;

  if (error.stack) {
    fullMessage += `\nStack trace:\n${error.stack}`;
  }

  if (context) {
    fullMessage += `\nError context: ${context}`;
  }

  logger.log('error', fullMessage);
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
 * @param options Optional configuration for diagnostic generation
 * @returns Array of diagnostics
 */
export function getDiagnosticsFromErrors(
  errors: ApexError[],
  options: {
    includeWarnings?: boolean;
    includeInfo?: boolean;
    maxDiagnostics?: number;
    includeCodes?: boolean;
  } = {},
): Diagnostic[] {
  const {
    includeWarnings = true,
    includeInfo = false,
    maxDiagnostics = 100,
    includeCodes = true,
  } = options;

  const logger = getLogger();

  // Filter errors based on severity settings
  const filteredErrors = errors.filter((error) => {
    switch (error.severity) {
      case 'error':
        return true; // Always include errors
      case 'warning':
        return includeWarnings;
      case 'info':
        return includeInfo;
      default:
        logger.warn(() => `Unknown error severity: ${error.severity}`);
        return true; // Include unknown severities as errors
    }
  });

  // Limit the number of diagnostics
  const limitedErrors = filteredErrors.slice(0, maxDiagnostics);

  if (filteredErrors.length > maxDiagnostics) {
    logger.warn(
      () =>
        `Diagnostics limited to ${maxDiagnostics} (${filteredErrors.length} total found)`,
    );
  }

  return limitedErrors.map((error) => {
    // Convert severity to LSP DiagnosticSeverity
    let severity: DiagnosticSeverity;
    switch (error.severity) {
      case 'error':
        severity = DiagnosticSeverity.Error;
        break;
      case 'warning':
        severity = DiagnosticSeverity.Warning;
        break;
      case 'info':
        severity = DiagnosticSeverity.Information;
        break;
      default:
        severity = DiagnosticSeverity.Error; // Default to error
        logger.warn(
          () => `Unknown severity ${error.severity}, defaulting to error`,
        );
    }

    // Calculate range with proper bounds checking
    const startLine = Math.max(0, error.line - 1);
    const startCharacter = Math.max(0, error.column - 1);

    // Use endLine and endColumn if available, otherwise calculate reasonable end
    let endLine = startLine;
    let endCharacter = startCharacter + 1; // Default to 1 character width

    if (error.endLine !== undefined && error.endColumn !== undefined) {
      endLine = Math.max(0, error.endLine - 1);
      endCharacter = Math.max(0, error.endColumn - 1);
    } else if (error.source) {
      // Estimate end position based on source text
      const lines = error.source.split('\n');
      if (lines.length > 1) {
        endLine = startLine + lines.length - 1;
        endCharacter = lines[lines.length - 1].length;
      } else {
        endCharacter = startCharacter + error.source.length;
      }
    }

    // Create diagnostic code if enabled
    let code: string | number | undefined;
    if (includeCodes) {
      code = `${error.type.toUpperCase()}_${error.severity.toUpperCase()}`;
    }

    // Create diagnostic with enhanced information
    const diagnostic: Diagnostic = {
      range: {
        start: { line: startLine, character: startCharacter },
        end: { line: endLine, character: endCharacter },
      },
      message: error.message,
      severity,
      source: 'apex-parser',
      ...(code && { code }),
      ...(error.filePath && {
        relatedInformation: [
          {
            location: {
              uri: error.filePath,
              range: {
                start: { line: startLine, character: startCharacter },
                end: { line: endLine, character: endCharacter },
              },
            },
            message: error.message,
          },
        ],
      }),
    };

    return diagnostic;
  });
}
