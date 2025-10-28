/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentDiagnosticParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  SymbolTable,
  ApexSymbolCollectorListener,
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

import {
  getDiagnosticsFromErrors,
  shouldSuppressDiagnostics,
} from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getParseResultCache } from './ParseResultCache';

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
 * Service for processing LSP diagnostic requests using ApexSymbolManager.
 *
 * This service handles the core logic for generating diagnostics from Apex
 * source code. It retrieves documents from storage, parses them using the
 * Apex parser, and converts any parsing errors into LSP diagnostic format.
 * Additionally, it uses ApexSymbolManager for cross-file analysis and
 * relationship-based error detection.
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
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  /**
   * Creates a new DiagnosticProcessingService instance.
   */
  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a diagnostic request for a specific document.
   *
   * This method performs the following steps:
   * 1. Retrieves the document from storage using the provided URI
   * 2. Creates a symbol collector listener for parsing
   * 3. Compiles the document using the Apex parser
   * 4. Converts any parsing errors to LSP diagnostics
   * 5. Enhances diagnostics with cross-file analysis using ApexSymbolManager
   * 6. Returns the enhanced diagnostics array
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
   */
  public async processDiagnostic(
    params: DocumentDiagnosticParams,
  ): Promise<Diagnostic[]> {
    this.logger.debug(
      () => `Processing diagnostic request for: ${params.textDocument.uri}`,
    );

    // Suppress diagnostics for standard Apex library classes
    if (shouldSuppressDiagnostics(params.textDocument.uri)) {
      this.logger.debug(
        () =>
          `Suppressing diagnostics for standard Apex library: ${params.textDocument.uri}`,
      );
      return [];
    }

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Get the document from storage
      const document = await storage.getDocument(params.textDocument.uri);

      if (!document) {
        this.logger.warn(
          () => `Document not found in storage: ${params.textDocument.uri}`,
        );
        return [];
      }

      // Check parse result cache first
      const parseCache = getParseResultCache();
      const cached = parseCache.getSymbolResult(document.uri, document.version);

      if (cached) {
        this.logger.debug(
          () =>
            `Using cached parse result for diagnostics ${document.uri} (version ${document.version})`,
        );
        // Convert cached errors to diagnostics and enhance
        return this.enhanceDiagnosticsWithGraphAnalysis(
          cached.diagnostics,
          params.textDocument.uri,
          [],
        );
      }

      // Create a symbol collector listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const compilerService = new CompilerService();

      // Parse the document
      const result = compilerService.compile(
        document.getText(),
        document.uri,
        listener,
        {},
      );

      // Get diagnostics from errors
      const diagnostics = getDiagnosticsFromErrors(result.errors);

      // Cache the parse result
      parseCache.merge(document.uri, {
        symbolTable: table,
        diagnostics,
        documentVersion: document.version,
        documentLength: document.getText().length,
      });

      // Enhance diagnostics with cross-file analysis using ApexSymbolManager
      return this.enhanceDiagnosticsWithGraphAnalysis(
        diagnostics,
        params.textDocument.uri,
        result.errors,
      ).then((enhancedDiagnostics) => {
        this.logger.debug(
          () =>
            `Returning ${enhancedDiagnostics.length} diagnostics for: ${params.textDocument.uri}`,
        );
        return enhancedDiagnostics;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        () =>
          `Error processing diagnostic request for ${params.textDocument.uri}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Enhance diagnostics with cross-file analysis using ApexSymbolManager
   */
  private async enhanceDiagnosticsWithGraphAnalysis(
    diagnostics: Diagnostic[],
    documentUri: string,
    parsingErrors: any[],
  ): Promise<Diagnostic[]> {
    try {
      const enhancedDiagnostics = [...diagnostics];

      // Get symbols from ApexSymbolManager for this file
      const fileSymbols = this.symbolManager.findSymbolsInFile(documentUri);

      if (fileSymbols.length === 0) {
        return diagnostics; // Return original diagnostics if no graph data available
      }

      // Add cross-file dependency warnings
      for (const symbol of fileSymbols) {
        try {
          const dependencyAnalysis =
            this.symbolManager.analyzeDependencies(symbol);

          // Check for circular dependencies
          if (dependencyAnalysis.circularDependencies.length > 0) {
            const circularDepDiagnostic: Diagnostic = {
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
              },
              message: `Circular dependency detected for ${symbol.name}`,
              severity: 2, // Warning
              code: 'CIRCULAR_DEPENDENCY',
              source: 'apex-symbol-manager',
            };
            enhancedDiagnostics.push(circularDepDiagnostic);
          }

          // Check for high impact symbols
          if (dependencyAnalysis.impactScore > 0.8) {
            const highImpactDiagnostic: Diagnostic = {
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
              },
              message: `High impact symbol: ${symbol.name} affects ${dependencyAnalysis.dependents.length} symbols`,
              severity: 1, // Information
              code: 'HIGH_IMPACT_SYMBOL',
              source: 'apex-symbol-manager',
            };
            enhancedDiagnostics.push(highImpactDiagnostic);
          }
        } catch (error) {
          this.logger.debug(
            () => `Error analyzing symbol ${symbol.name}: ${error}`,
          );
        }
      }

      return enhancedDiagnostics;
    } catch (error) {
      this.logger.debug(
        () => `Error enhancing diagnostics with graph analysis: ${error}`,
      );
      return diagnostics; // Return original diagnostics on error
    }
  }
}
