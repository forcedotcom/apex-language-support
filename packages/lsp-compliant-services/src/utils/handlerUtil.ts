/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { ApexError, isStandardApexUri } from '@salesforce/apex-lsp-parser-ast';
import { transformParserToLspPosition } from './positionUtils';

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
    includeCodes?: boolean;
  } = {},
): Diagnostic[] {
  const { includeCodes = true } = options;

  return errors.map((error) => {
    // Convert parser positions (1-based) to LSP positions (0-based)
    const startPosition = transformParserToLspPosition({
      line: Math.max(1, error.line), // Ensure minimum line 1
      character: Math.max(0, error.column - 1), // Convert 1-based column to 0-based
    });

    // Use endLine and endColumn if available, otherwise calculate reasonable end
    let endPosition = {
      line: startPosition.line,
      character: startPosition.character + 1,
    }; // Default to 1 character width

    if (error.endLine !== undefined && error.endColumn !== undefined) {
      endPosition = transformParserToLspPosition({
        line: Math.max(1, error.endLine), // Ensure minimum line 1
        character: Math.max(0, error.endColumn - 1), // Convert 1-based column to 0-based
      });
    } else if (error.source) {
      // Estimate end position based on source text
      const lines = error.source.split('\n');
      if (lines.length > 1) {
        endPosition = transformParserToLspPosition({
          line: Math.max(1, error.line + lines.length - 1),
          character: lines[lines.length - 1].length,
        });
      } else {
        endPosition = {
          line: startPosition.line,
          character: startPosition.character + error.source.length,
        };
      }
    }

    // Create diagnostic code if enabled
    // Use error.code (ErrorCode) when present (e.g. syntax errors), else generic
    let code: string | number | undefined;
    if (includeCodes) {
      code = error.code ?? `${error.type.toUpperCase()}_ERROR`;
    }

    // Create diagnostic with enhanced information
    const diagnostic: Diagnostic = {
      range: {
        start: { line: startPosition.line, character: startPosition.character },
        end: { line: endPosition.line, character: endPosition.character },
      },
      message: error.message,
      severity: DiagnosticSeverity.Error,
      source: 'apex-parser',
      ...(code && { code }),
      ...(error.fileUri && {
        relatedInformation: [
          {
            location: {
              uri: error.fileUri,
              range: {
                start: {
                  line: startPosition.line,
                  character: startPosition.character,
                },
                end: {
                  line: endPosition.line,
                  character: endPosition.character,
                },
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

/**
 * Check if diagnostics should be suppressed for a given URI
 * @param uri The document URI to check
 * @returns True if diagnostics should be suppressed
 */
export function shouldSuppressDiagnostics(uri: string): boolean {
  return isStandardApexUri(uri);
}

/**
 * Dispatch queue state processing request
 * @param params The queue state parameters
 * @returns Queue state response
 */
export async function dispatchProcessOnQueueState(params: any): Promise<any> {
  const { QueueStateHandler } = await import('../handlers/QueueStateHandler');
  const { QueueStateProcessingService } = await import(
    '../services/QueueStateProcessingService'
  );
  const { getLogger, ApexCapabilitiesManager } = await import(
    '@salesforce/apex-lsp-shared'
  );

  const logger = getLogger();
  const capabilitiesManager = ApexCapabilitiesManager.getInstance();
  const queueStateProcessor = new QueueStateProcessingService(logger);
  const handler = new QueueStateHandler(
    logger,
    queueStateProcessor,
    capabilitiesManager,
  );

  return await handler.handleQueueState(params);
}
