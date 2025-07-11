/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentSymbolParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';
import { IDiagnosticProcessor } from '../services/DiagnosticProcessingService';

/**
 * Handler for LSP diagnostic requests (`textDocument/diagnostic`).
 *
 * This handler processes diagnostic requests from LSP clients and returns
 * diagnostics for the specified document. It implements the pull-based
 * diagnostic model where clients explicitly request diagnostics.
 *
 * @example
 * ```typescript
 * const handler = new DiagnosticHandler(logger, diagnosticProcessor);
 * const diagnostics = await handler.handleDiagnostic({
 *   textDocument: { uri: 'file:///path/to/document.cls' }
 * });
 * ```
 *
 * @see {@link IDiagnosticProcessor} - The interface for diagnostic processing
 * @see {@link DiagnosticProcessingService} - Default implementation of diagnostic processing
 */
export class DiagnosticHandler {
  /**
   * Creates a new DiagnosticHandler instance.
   *
   * @param logger - Logger interface for debug and error logging
   * @param diagnosticProcessor - Processor for handling diagnostic logic
   */
  constructor(
    private readonly logger: LoggerInterface,
    private readonly diagnosticProcessor: IDiagnosticProcessor,
  ) {}

  /**
   * Handles a diagnostic request for a specific document.
   *
   * This method processes the diagnostic request by:
   * 1. Logging the request for debugging purposes
   * 2. Delegating to the diagnostic processor
   * 3. Handling any errors that occur during processing
   * 4. Returning the diagnostics array
   *
   * @param params - The diagnostic request parameters containing the document URI
   * @returns Promise resolving to an array of diagnostics for the document
   * @throws {Error} When diagnostic processing fails
   *
   * @example
   * ```typescript
   * const diagnostics = await handler.handleDiagnostic({
   *   textDocument: { uri: 'file:///path/to/MyClass.cls' }
   * });
   *
   * // diagnostics will contain an array of Diagnostic objects:
   * // [
   * //   {
   * //     range: { start: { line: 4, character: 9 }, end: { line: 4, character: 10 } },
   * //     message: "Syntax error: unexpected token",
   * //     severity: DiagnosticSeverity.Error,
   * //     code: "SYNTAX_ERROR",
   * //     source: "apex-parser"
   * //   }
   * // ]
   * ```
   *
   * @see {@link DocumentSymbolParams} - The request parameters interface
   * @see {@link Diagnostic} - The diagnostic result interface
   * @see {@link IDiagnosticProcessor.processDiagnostic} - The underlying processing method
   */
  public async handleDiagnostic(
    params: DocumentSymbolParams,
  ): Promise<Diagnostic[]> {
    this.logger.debug(
      () => `Processing diagnostic request: ${params.textDocument.uri}`,
    );

    try {
      return await dispatch(
        this.diagnosticProcessor.processDiagnostic(params),
        'Error processing diagnostic request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing diagnostic request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
