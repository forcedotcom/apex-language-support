/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentDiagnosticParams } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-logging';
import {
  CompilerService,
  SymbolTable,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';

import { getDiagnosticsFromErrors } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';

/**
 * Interface for diagnostic processing functionality to make handlers more testable.
 *
 * This interface defines the contract for diagnostic processing, allowing
 * for dependency injection and easier testing of diagnostic handlers.
 *
 * @see {@link DiagnosticProcessingService} - Default implementation
 */
export interface IDiagnosticProcessor {
  /**
   * Process a diagnostic request for a specific document.
   *
   * @param params - The diagnostic parameters containing the document URI
   * @returns Promise resolving to an array of diagnostics for the document
   */
  processDiagnostic(params: DocumentDiagnosticParams): Promise<Diagnostic[]>;
}

/**
 * Service for processing LSP diagnostic requests.
 *
 * This service handles the core logic for generating diagnostics from Apex
 * source code. It retrieves documents from storage, parses them using the
 * Apex parser, and converts any parsing errors into LSP diagnostic format.
 *
 * The service implements the pull-based diagnostic model where diagnostics
 * are generated on-demand when requested by the client.
 *
 * @example
 * ```typescript
 * const service = new DiagnosticProcessingService(logger);
 * const diagnostics = await service.processDiagnostic({
 *   textDocument: { uri: 'file:///path/to/document.cls' }
 * });
 * ```
 *
 * @see {@link IDiagnosticProcessor} - The interface this service implements
 * @see {@link getDiagnosticsFromErrors} - Utility for converting parser errors to diagnostics
 */
export class DiagnosticProcessingService implements IDiagnosticProcessor {
  /**
   * Creates a new DiagnosticProcessingService instance.
   */
  constructor() {}

  /**
   * Process a diagnostic request for a specific document.
   *
   * This method performs the following steps:
   * 1. Retrieves the document from storage using the provided URI
   * 2. Creates a symbol collector listener for parsing
   * 3. Compiles the document using the Apex parser
   * 4. Converts any parsing errors to LSP diagnostics
   * 5. Returns the diagnostics array
   *
   * If the document is not found in storage, an empty array is returned.
   * If compilation succeeds without errors, an empty array is returned.
   *
   * @param params - The diagnostic parameters containing the document URI
   * @returns Promise resolving to an array of diagnostics for the document
   *
   * @example
   * ```typescript
   * const diagnostics = await service.processDiagnostic({
   *   textDocument: { uri: 'file:///path/to/MyClass.cls' }
   * });
   *
   * // diagnostics will contain parsing errors converted to LSP format:
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
   * @see {@link DocumentDiagnosticParams} - The request parameters interface
   * @see {@link Diagnostic} - The diagnostic result interface
   * @see {@link ApexStorageManager} - For document retrieval
   * @see {@link CompilerService} - For document parsing
   * @see {@link getDiagnosticsFromErrors} - For error conversion
   */
  public async processDiagnostic(
    params: DocumentDiagnosticParams,
  ): Promise<Diagnostic[]> {
    const logger = getLogger();
    logger.debug(
      () =>
        `Common Apex Language Server diagnostic handler invoked with: ${params}`,
    );

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Get the document from storage
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        logger.warn(
          () =>
            `Document not found for diagnostic request: ${params.textDocument.uri}`,
        );
        return [];
      }

      // Create a symbol collector listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const compilerService = new CompilerService();

      // Parse the document
      const options = {
        includeComments: false,
        includeSingleLineComments: false,
        associateComments: false,
      };

      const result = compilerService.compile(
        document.getText(),
        document.uri,
        listener,
        options,
      );

      if (result.errors.length > 0) {
        logger.debug(() => `Errors parsing document: ${result.errors}`);
        const diagnostics = getDiagnosticsFromErrors(result.errors);
        return diagnostics;
      }

      // No errors found
      return [];
    } catch (error) {
      logger.error(() => `Error processing diagnostic: ${error}`);
      return [];
    }
  }
}
