/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Diagnostic,
  DocumentDiagnosticParams,
} from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { DiagnosticProcessingService } from '../services/DiagnosticProcessingService';

/**
 * Process diagnostic request for Apex documents.
 *
 * This handler processes diagnostic requests and returns parsing errors
 * converted to LSP diagnostic format.
 *
 * @param params - The diagnostic request parameters
 * @returns Array of diagnostics for the document
 */
export async function processOnDiagnostic(
  params: DocumentDiagnosticParams,
): Promise<Diagnostic[]> {
  const logger = getLogger();

  try {
    logger.debug(
      () => `Processing diagnostic request for: ${params.textDocument.uri}`,
    );

    const diagnosticProcessor = new DiagnosticProcessingService();
    const diagnostics = await dispatch(
      diagnosticProcessor.processDiagnostic(params),
      'Error processing diagnostic request',
    );

    logger.debug(
      () =>
        `Returning ${diagnostics.length} diagnostics for: ${params.textDocument.uri}`,
    );
    return diagnostics;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      () =>
        `Error processing diagnostic request for ${params.textDocument.uri}: ${errorMessage}`,
    );
    return [];
  }
}

/**
 * Dispatch wrapper for diagnostic processing with error handling.
 *
 * @param params - The diagnostic request parameters
 * @returns Promise resolving to diagnostics array
 */
export function dispatchProcessOnDiagnostic(
  params: DocumentDiagnosticParams,
): Promise<Diagnostic[]> {
  return dispatch(
    processOnDiagnostic(params),
    'Error processing diagnostic request',
  );
}
