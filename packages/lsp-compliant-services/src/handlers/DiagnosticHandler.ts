/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentSymbolParams } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';
import { DiagnosticProcessingService } from '../services/DiagnosticProcessingService';
import { ApexSettingsManager } from '../settings/ApexSettingsManager';

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
  params: DocumentSymbolParams,
): Promise<Diagnostic[]> {
  const logger = getLogger();

  try {
    logger.debug(
      () => `Processing diagnostic request for: ${params.textDocument.uri}`,
    );

    // Check if pull-based diagnostics are enabled
    const settingsManager = ApexSettingsManager.getInstance();
    const settings = settingsManager.getSettings();

    if (!settings.diagnostics.enablePullDiagnostics) {
      logger.debug(
        () =>
          `Pull-based diagnostics disabled, returning empty array for: ${params.textDocument.uri}`,
      );
      return [];
    }

    const diagnosticProcessor = new DiagnosticProcessingService(logger);
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
  params: DocumentSymbolParams,
): Promise<Diagnostic[]> {
  return dispatch(
    processOnDiagnostic(params),
    'Error processing diagnostic request',
  );
}
