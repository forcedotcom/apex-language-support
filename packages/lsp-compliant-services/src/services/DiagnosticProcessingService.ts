/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentDiagnosticParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { Priority } from '@salesforce/apex-lsp-shared';
import { DocumentProcessingService } from './DocumentProcessingService';
import {
  CompilerService,
  SymbolTable,
  ApexSymbolCollectorListener,
  ApexSymbolProcessingManager,
  ISymbolManager,
  type CompilationResult,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

import {
  getDiagnosticsFromErrors,
  shouldSuppressDiagnostics,
} from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getDocumentStateCache } from './DocumentStateCache';

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
   * Compile document (pure Effect, can be queued)
   * Wraps compilerService.compile() in Effect for non-blocking operation
   */
  private compileDocumentEffect(
    document: any,
    listener: ApexSymbolCollectorListener,
  ): Effect.Effect<CompilationResult<SymbolTable>, never, never> {
    const logger = this.logger;
    return Effect.gen(function* () {
      // Yield control before starting compilation
      yield* Effect.yieldNow();

      const compilerService = new CompilerService();
      let result: CompilationResult<SymbolTable>;

      try {
        result = yield* Effect.sync(() =>
          compilerService.compile(
            document.getText(),
            document.uri,
            listener,
            {},
          ),
        );
      } catch (error: unknown) {
        logger.error(
          () => `Failed to compile document ${document.uri}: ${error}`,
        );
        // Return error result
        result = {
          fileName: document.uri,
          result: null,
          errors: [
            {
              type: 'semantic' as any,
              severity: 'error' as any,
              message: error instanceof Error ? error.message : String(error),
              line: 0,
              column: 0,
              fileUri: document.uri,
            },
          ],
          warnings: [],
        } as CompilationResult<SymbolTable>;
      }

      logger.debug(
        () =>
          `Compilation completed for ${document.uri}: ${result.errors.length} errors, ` +
          `${result.warnings.length} warnings`,
      );

      return result;
    });
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

      // Ensure full analysis is performed (this handles caching and compilation)
      const processingService = DocumentProcessingService.getInstance(
        this.logger,
      );
      const diagnostics = await processingService.ensureFullAnalysis(
        params.textDocument.uri,
        document.version,
        {
          priority: Priority.Normal,
          reason: 'diagnostic request',
        },
      );

      // Enhance diagnostics with cross-file analysis using ApexSymbolManager (with yielding)
      const enhancedDiagnostics = await Effect.runPromise(
        this.enhanceDiagnosticsWithGraphAnalysisEffect(
          diagnostics || [],
          params.textDocument.uri,
          [], // We don't have the raw parsing errors here anymore, but enhanceDiagnosticsWithGraphAnalysisEffect doesn't seem to use them for anything other than a signature
        ),
      );
      this.logger.debug(
        () =>
          `Returning ${enhancedDiagnostics.length} diagnostics for: ${params.textDocument.uri}`,
      );
      return enhancedDiagnostics;
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
    return await Effect.runPromise(
      this.enhanceDiagnosticsWithGraphAnalysisEffect(
        diagnostics,
        documentUri,
        parsingErrors,
      ),
    );
  }

  /**
   * Enhance diagnostics with cross-file analysis using ApexSymbolManager (Effect-based with yielding)
   */
  private enhanceDiagnosticsWithGraphAnalysisEffect(
    diagnostics: Diagnostic[],
    documentUri: string,
    parsingErrors: any[],
  ): Effect.Effect<Diagnostic[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      try {
        const enhancedDiagnostics = [...diagnostics];

        // Get symbols from ApexSymbolManager for this file
        const fileSymbols = self.symbolManager.findSymbolsInFile(documentUri);

        if (fileSymbols.length === 0) {
          return diagnostics; // Return original diagnostics if no graph data available
        }

        // Add cross-file dependency warnings
        const batchSize = 50;
        for (let i = 0; i < fileSymbols.length; i++) {
          const symbol = fileSymbols[i];
          try {
            const dependencyAnalysis =
              self.symbolManager.analyzeDependencies(symbol);

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
            self.logger.debug(
              () => `Error analyzing symbol ${symbol.name}: ${error}`,
            );
          }

          // Yield after every batchSize symbols
          if ((i + 1) % batchSize === 0 && i + 1 < fileSymbols.length) {
            yield* Effect.yieldNow();
          }
        }

        return enhancedDiagnostics;
      } catch (error) {
        self.logger.debug(
          () => `Error enhancing diagnostics with graph analysis: ${error}`,
        );
        return diagnostics; // Return original diagnostics on error
      }
    });
  }
}
