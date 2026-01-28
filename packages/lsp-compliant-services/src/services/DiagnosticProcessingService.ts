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
  DiagnosticSeverity,
  Position,
} from 'vscode-languageserver';
import {
  LoggerInterface,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  SymbolTable,
  VisibilitySymbolListener,
  ApexSymbolProcessingManager,
  type ISymbolManager,
  type CompilationResult,
  type CompilationResultWithComments,
  type CompilationResultWithAssociations,
  ValidationTier,
  ValidationOptions,
  ARTIFACT_LOADING_LIMITS,
  ValidatorRegistryLive,
  runValidatorsForTier,
  EffectLspLoggerLive,
  ArtifactLoadingHelperLive,
  ISymbolManagerTag,
  initializeValidators,
  ErrorType,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect, Layer } from 'effect';

import {
  getDiagnosticsFromErrors,
  shouldSuppressDiagnostics,
} from '../utils/handlerUtil';
import { transformParserToLspPosition } from '../utils/positionUtils';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getDocumentStateCache } from './DocumentStateCache';

import {
  createMissingArtifactResolutionService,
  type MissingArtifactResolutionService,
} from './MissingArtifactResolutionService';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import { LayerEnrichmentService } from './LayerEnrichmentService';

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
  private readonly artifactResolutionService: MissingArtifactResolutionService;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;
  private static validatorsInitialized = false;

  /**
   * Creates a new DiagnosticProcessingService instance.
   */
  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
    this.artifactResolutionService =
      createMissingArtifactResolutionService(logger);
    this.prerequisiteOrchestrationService =
      new PrerequisiteOrchestrationService(
        logger,
        this.symbolManager,
        new LayerEnrichmentService(logger, this.symbolManager),
      );

    // Initialize validators once (static initialization)
    if (!DiagnosticProcessingService.validatorsInitialized) {
      DiagnosticProcessingService.validatorsInitialized = true;
      // Initialize validators asynchronously (fire and forget)
      // This ensures validators are registered before first use
      Effect.runPromise(
        initializeValidators().pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              logger.warn(
                () =>
                  `Failed to initialize validators: ${error instanceof Error ? error.message : String(error)}`,
              );
            }),
          ),
        ),
      ).catch((error) => {
        logger.warn(
          () =>
            `Error initializing validators: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
  }

  /**
   * Compile document (pure Effect, can be queued)
   * Wraps compilerService.compile() in Effect for non-blocking operation
   */
  private compileDocumentEffect(
    document: any,
    listener: VisibilitySymbolListener,
  ): Effect.Effect<
    | CompilationResult<SymbolTable>
    | CompilationResultWithComments<SymbolTable>
    | CompilationResultWithAssociations<SymbolTable>,
    never,
    never
  > {
    const logger = this.logger;
    return Effect.gen(function* () {
      // Yield control before starting compilation
      yield* Effect.yieldNow();

      const compilerService = new CompilerService();
      let result:
        | CompilationResult<SymbolTable>
        | CompilationResultWithComments<SymbolTable>
        | CompilationResultWithAssociations<SymbolTable>;

      try {
        result = yield* Effect.sync(() =>
          compilerService.compile(document.getText(), document.uri, listener, {
            collectReferences: true,
            resolveReferences: true,
          }),
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

      // Check parse result cache first
      const parseCache = getDocumentStateCache();
      const cached = parseCache.getSymbolResult(document.uri, document.version);

      if (cached) {
        this.logger.debug(
          () =>
            `Using cached parse result for diagnostics ${document.uri} (version ${document.version})`,
        );
        // Run prerequisites for diagnostics request
        if (this.prerequisiteOrchestrationService) {
          try {
            await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
              'diagnostics',
              params.textDocument.uri,
              { workDoneToken: params.workDoneToken },
            );
          } catch (error) {
            this.logger.debug(
              () =>
                `Error running prerequisites for diagnostics ${params.textDocument.uri}: ${error}`,
            );
            // Continue with diagnostics even if prerequisites fail
          }
        }
        // Convert cached errors to diagnostics and enhance (with yielding)
        const enhancedCachedDiagnostics = await Effect.runPromise(
          this.enhanceDiagnosticsWithGraphAnalysisEffect(
            cached.diagnostics,
            params.textDocument.uri,
          ),
        );

        // Check for syntax errors in cached diagnostics
        const cachedSyntaxErrors = enhancedCachedDiagnostics.filter(
          (diagnostic) => diagnostic.code === 'SYNTAX_ERROR',
        );
        const hasCachedSyntaxErrors = cachedSyntaxErrors.length > 0;

        if (hasCachedSyntaxErrors) {
          this.logger.debug(() => {
            const errorDetails = cachedSyntaxErrors
              .map(
                (d) =>
                  `[${d.range.start.line}:${d.range.start.character}] ${d.message}`,
              )
              .join(', ');
            return (
              '[VALIDATION-DEBUG] Syntax errors detected in cached diagnostics ' +
              `for ${params.textDocument.uri}: ${cachedSyntaxErrors.length} ` +
              `syntax error(s). Errors: ${errorDetails}`
            );
          });
        }

        // Run semantic validation (always enabled)
        this.logger.debug(
          () =>
            `Running semantic validation for cached result: ${params.textDocument.uri}`,
        );

        // CRITICAL: Get SymbolTable AFTER prerequisites complete (including enrichment)
        // to ensure we have the enriched symbol table, not a stale reference
        const cachedTable = this.symbolManager.getSymbolTableForFile(
          params.textDocument.uri,
        );

        if (cachedTable) {
          // Check enrichment level before validation
          const detailLevel =
            (this.symbolManager as any).getDetailLevelForFile?.(
              params.textDocument.uri,
            ) ?? null;
          this.logger.debug(
            () =>
              `[VALIDATION-DEBUG] Running semantic validation for cached result ${params.textDocument.uri}: ` +
              `syntaxErrors=${hasCachedSyntaxErrors}, detailLevel=${detailLevel ?? 'unknown'}, ` +
              `symbolTableSize=${cachedTable.getAllSymbols().length}`,
          );

          // Verify detail level meets validator requirements after prerequisites
          // For THOROUGH tier diagnostics, we expect 'full' detail level
          const expectedDetailLevel = 'full';
          const actualDetailLevel = cachedTable.getDetailLevel();
          if (actualDetailLevel !== expectedDetailLevel) {
            this.logger.warn(
              () =>
                `[VALIDATION-WARNING] Symbol table for ${params.textDocument.uri} has detail level ` +
                `'${actualDetailLevel ?? 'unknown'}' but validators may require '${expectedDetailLevel}'. ` +
                'Some validators may be skipped.',
            );
          }

          // Get settings for artifact loading
          const settings = ApexSettingsManager.getInstance().getSettings();
          const allowArtifactLoading =
            settings.apex.findMissingArtifact.enabled ?? false;

          // Build validation options
          const validationOptions: ValidationOptions = {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading,
            maxDepth: ARTIFACT_LOADING_LIMITS.maxDepth,
            maxArtifacts: ARTIFACT_LOADING_LIMITS.maxArtifacts,
            timeout: ARTIFACT_LOADING_LIMITS.timeout,
            progressToken: params.workDoneToken,
            symbolManager: this.symbolManager,
            loadArtifactCallback: allowArtifactLoading
              ? this.createLoadArtifactCallback(params.textDocument.uri)
              : undefined,
          };

          // Run validators
          const immediateResults = await this.runSemanticValidators(
            ValidationTier.IMMEDIATE,
            cachedTable,
            { ...validationOptions, tier: ValidationTier.IMMEDIATE },
          );

          const thoroughResults = await this.runSemanticValidators(
            ValidationTier.THOROUGH,
            cachedTable,
            validationOptions,
          );

          // Combine all diagnostics
          return [
            ...enhancedCachedDiagnostics,
            ...immediateResults,
            ...thoroughResults,
          ];
        }

        return enhancedCachedDiagnostics;
      }

      // Create a symbol collector listener
      // Use VisibilitySymbolListener for diagnostics (syntax errors don't need private symbols)
      const table = new SymbolTable();
      const listener = new VisibilitySymbolListener('public-api', table);

      // Parse the document using Effect-based compilation (with yielding)
      const result = await Effect.runPromise(
        this.compileDocumentEffect(document, listener),
      );

      this.logger.debug(
        () =>
          `Compilation result for ${document.uri}: ${result.errors.length} errors, ` +
          `${result.warnings.length} warnings`,
      );

      // Check for syntax errors before semantic validation
      const syntaxErrors = result.errors.filter(
        (error) => error.type === ErrorType.Syntax,
      );
      const hasSyntaxErrors = syntaxErrors.length > 0;

      if (hasSyntaxErrors) {
        this.logger.debug(() => {
          const errorDetails = syntaxErrors
            .map((e) => `[${e.line}:${e.column}] ${e.message}`)
            .join(', ');
          return (
            '[VALIDATION-DEBUG] Syntax errors detected before semantic ' +
            `validation for ${document.uri}: ${syntaxErrors.length} ` +
            `syntax error(s). Errors: ${errorDetails}`
          );
        });
      }

      // Get diagnostics from errors
      const diagnostics = getDiagnosticsFromErrors(result.errors);

      this.logger.debug(
        () =>
          `Converted ${result.errors.length} errors to ${diagnostics.length} diagnostics for ${document.uri}`,
      );

      // Add SymbolTable to manager if not already present
      const existingSymbols = this.symbolManager.findSymbolsInFile(
        document.uri,
      );
      if (existingSymbols.length === 0 && table) {
        await Effect.runPromise(
          this.symbolManager.addSymbolTable(table, document.uri),
        );
        this.logger.debug(
          () =>
            `Added SymbolTable to manager for ${document.uri} during diagnostics`,
        );
      }

      // Cache diagnostics (SymbolTable is stored in ApexSymbolManager)
      parseCache.merge(document.uri, {
        diagnostics,
        documentVersion: document.version,
        documentLength: document.getText().length,
      });

      // Run prerequisites for diagnostics request
      if (this.prerequisiteOrchestrationService) {
        try {
          await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
            'diagnostics',
            params.textDocument.uri,
            { workDoneToken: params.workDoneToken },
          );
        } catch (error) {
          this.logger.debug(
            () =>
              `Error running prerequisites for diagnostics ${params.textDocument.uri}: ${error}`,
          );
          // Continue with diagnostics even if prerequisites fail
        }
      }

      // Enhance diagnostics with cross-file analysis using ApexSymbolManager (with yielding)
      const enhancedDiagnostics = await Effect.runPromise(
        this.enhanceDiagnosticsWithGraphAnalysisEffect(
          diagnostics,
          params.textDocument.uri,
        ),
      );

      // Run semantic validation (always enabled)
      // Wrap in try-catch to ensure syntax errors are still returned even if validators fail
      let validatorDiagnostics: Diagnostic[] = [];

      // CRITICAL: Re-fetch symbol table AFTER prerequisites complete (including enrichment)
      // to ensure we have the enriched symbol table, not the original public-api one
      const enrichedTable =
        this.symbolManager.getSymbolTableForFile(document.uri) || table;

      if (enrichedTable) {
        try {
          // Check enrichment level before validation
          const detailLevel =
            (this.symbolManager as any).getDetailLevelForFile?.(document.uri) ??
            null;
          this.logger.debug(
            () =>
              `[VALIDATION-DEBUG] Running semantic validation for ${params.textDocument.uri}: ` +
              `syntaxErrors=${hasSyntaxErrors}, detailLevel=${detailLevel ?? 'unknown'}, ` +
              `symbolTableSize=${enrichedTable.getAllSymbols().length}`,
          );

          this.logger.debug(
            () => `Running semantic validation for: ${params.textDocument.uri}`,
          );

          // Verify detail level meets validator requirements after prerequisites
          // For THOROUGH tier diagnostics, we expect 'full' detail level
          const expectedDetailLevel = 'full';
          const actualDetailLevel = enrichedTable.getDetailLevel();
          if (actualDetailLevel !== expectedDetailLevel) {
            this.logger.warn(
              () =>
                `[VALIDATION-WARNING] Symbol table for ${params.textDocument.uri} has detail level ` +
                `'${actualDetailLevel ?? 'unknown'}' but validators may require '${expectedDetailLevel}'. ` +
                'Some validators may be skipped.',
            );
          }

          // Get settings for artifact loading
          const settings = ApexSettingsManager.getInstance().getSettings();
          const allowArtifactLoading =
            settings.apex.findMissingArtifact.enabled ?? false;

          // Build validation options
          const validationOptions: ValidationOptions = {
            tier: ValidationTier.THOROUGH, // Pull diagnostics = thorough
            allowArtifactLoading,
            maxDepth: ARTIFACT_LOADING_LIMITS.maxDepth,
            maxArtifacts: ARTIFACT_LOADING_LIMITS.maxArtifacts,
            timeout: ARTIFACT_LOADING_LIMITS.timeout,
            progressToken: params.workDoneToken,
            symbolManager: this.symbolManager,
            loadArtifactCallback: allowArtifactLoading
              ? this.createLoadArtifactCallback(params.textDocument.uri)
              : undefined,
          };

          // Run validators (both IMMEDIATE and THOROUGH for pull diagnostics)
          const immediateResults = await this.runSemanticValidators(
            ValidationTier.IMMEDIATE,
            enrichedTable,
            { ...validationOptions, tier: ValidationTier.IMMEDIATE },
          );

          const thoroughResults = await this.runSemanticValidators(
            ValidationTier.THOROUGH,
            enrichedTable,
            validationOptions,
          );

          this.logger.debug(
            () =>
              `Semantic validation produced ${immediateResults.length} immediate ` +
              `+ ${thoroughResults.length} thorough diagnostics`,
          );

          validatorDiagnostics = [...immediateResults, ...thoroughResults];
        } catch (error) {
          // Log error but continue - syntax errors should still be returned
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            () =>
              `Error running semantic validators for ${params.textDocument.uri}: ${errorMessage}`,
          );
          // Continue with empty validator diagnostics - syntax errors will still be returned
        }
      }

      // Combine all diagnostics (syntax errors + validator diagnostics)
      const allDiagnostics = [...enhancedDiagnostics, ...validatorDiagnostics];

      this.logger.debug(
        () =>
          `Returning ${allDiagnostics.length} total diagnostics for: ${params.textDocument.uri}`,
      );
      return allDiagnostics;

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
   * Enhance diagnostics with cross-file analysis using ApexSymbolManager (Effect-based with yielding)
   */
  private enhanceDiagnosticsWithGraphAnalysisEffect(
    diagnostics: Diagnostic[],
    documentUri: string,
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

  /**
   * Run semantic validators for a specific tier (Effect-based)
   * This is the new layered validation system using ValidatorRegistry
   */
  private runSemanticValidatorsEffect(
    tier: ValidationTier,
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<Diagnostic[], never, never> {
    const effect = Effect.gen(function* () {
      try {
        // Run validators for this tier
        const tierName =
          tier === ValidationTier.IMMEDIATE ? 'TIER 1' : 'TIER 2';
        const hasSymbolManager = !!options.symbolManager;
        yield* Effect.logDebug(
          `[VALIDATION-DEBUG] Starting validators for tier ${tier} (${tierName}) ` +
            `with ${hasSymbolManager ? 'symbolManager' : 'no symbolManager'} ` +
            `for ${hasSymbolManager ? 'enrichment' : 'no enrichment'}`,
        );
        const results = yield* runValidatorsForTier(
          tier,
          symbolTable,
          options,
        ).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              yield* Effect.logError(
                `Error running validators for tier ${tier}: ${errorMessage}`,
              );
              // Log stack trace for debugging
              if (error instanceof Error && error.stack) {
                yield* Effect.logError(`Stack: ${error.stack}`);
              }
              return []; // Return empty results on error
            }),
          ),
        );
        yield* Effect.logDebug(
          `Validators for tier ${tier} completed with ${results.length} results`,
        );

        // Convert ValidationResult[] to Diagnostic[]
        const diagnostics: Diagnostic[] = [];
        // Track seen diagnostics to deduplicate (same code + location + message)
        const seenDiagnostics = new Set<string>();

        for (const result of results) {
          // Add errors (handle both string[] and ValidationError[] formats)
          for (const error of result.errors) {
            const errorMessage =
              typeof error === 'string' ? error : error.message;
            const errorCode =
              typeof error === 'string'
                ? 'SEMANTIC_ERROR'
                : error.code || 'SEMANTIC_ERROR';
            const errorLocation =
              typeof error === 'string' ? undefined : error.location;

            // Convert SymbolLocation to LSP Range if available
            let range: { start: Position; end: Position };
            if (errorLocation?.identifierRange) {
              // Use identifierRange for precise positioning
              range = {
                start: transformParserToLspPosition({
                  line: errorLocation.identifierRange.startLine,
                  character: errorLocation.identifierRange.startColumn,
                }),
                end: transformParserToLspPosition({
                  line: errorLocation.identifierRange.endLine,
                  character: errorLocation.identifierRange.endColumn,
                }),
              };
            } else if (errorLocation?.symbolRange) {
              // Fallback to symbolRange
              range = {
                start: transformParserToLspPosition({
                  line: errorLocation.symbolRange.startLine,
                  character: errorLocation.symbolRange.startColumn,
                }),
                end: transformParserToLspPosition({
                  line: errorLocation.symbolRange.endLine,
                  character: errorLocation.symbolRange.endColumn,
                }),
              };
            } else {
              // No location available - default to line 0
              range = {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
              };
            }

            // Create a unique key for deduplication: code + range + message
            const rangeStr = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
            const diagnosticKey = `${errorCode}|${rangeStr}|${errorMessage}`;

            // Skip if we've already seen this exact diagnostic
            if (seenDiagnostics.has(diagnosticKey)) {
              continue;
            }

            seenDiagnostics.add(diagnosticKey);

            diagnostics.push({
              range,
              message: errorMessage,
              severity: DiagnosticSeverity.Error,
              code: errorCode,
              source: 'apex-semantic-validator',
            });
          }

          // Add warnings (handle both string[] and ValidationWarning[] formats)
          for (const warning of result.warnings) {
            const warningMessage =
              typeof warning === 'string' ? warning : warning.message;
            const warningCode =
              typeof warning === 'string'
                ? 'SEMANTIC_WARNING'
                : warning.code || 'SEMANTIC_WARNING';
            const warningLocation =
              typeof warning === 'string' ? undefined : warning.location;

            // Convert SymbolLocation to LSP Range if available
            let range: { start: Position; end: Position };
            if (warningLocation?.identifierRange) {
              // Use identifierRange for precise positioning
              range = {
                start: transformParserToLspPosition({
                  line: warningLocation.identifierRange.startLine,
                  character: warningLocation.identifierRange.startColumn,
                }),
                end: transformParserToLspPosition({
                  line: warningLocation.identifierRange.endLine,
                  character: warningLocation.identifierRange.endColumn,
                }),
              };
            } else if (warningLocation?.symbolRange) {
              // Fallback to symbolRange
              range = {
                start: transformParserToLspPosition({
                  line: warningLocation.symbolRange.startLine,
                  character: warningLocation.symbolRange.startColumn,
                }),
                end: transformParserToLspPosition({
                  line: warningLocation.symbolRange.endLine,
                  character: warningLocation.symbolRange.endColumn,
                }),
              };
            } else {
              // No location available - default to line 0
              range = {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
              };
            }

            // Create a unique key for deduplication: code + range + message
            const rangeStr = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
            const diagnosticKey = `${warningCode}|${rangeStr}|${warningMessage}`;

            // Skip if we've already seen this exact diagnostic
            if (seenDiagnostics.has(diagnosticKey)) {
              continue;
            }

            seenDiagnostics.add(diagnosticKey);

            diagnostics.push({
              range,
              message: warningMessage,
              severity: DiagnosticSeverity.Warning,
              code: warningCode,
              source: 'apex-semantic-validator',
            });
          }
        }

        yield* Effect.logDebug(
          `Tier ${tier} validation produced ${diagnostics.length} diagnostics`,
        );

        return diagnostics;
      } catch (error) {
        yield* Effect.logError(
          `Unexpected error in semantic validation: ${error}`,
        );
        return [];
      }
    });

    // Symbol manager is always required - use instance symbolManager
    // Create base layer with ISymbolManager, ValidatorRegistry, and Logger
    const baseLayer = Layer.mergeAll(
      Layer.succeed(ISymbolManagerTag, this.symbolManager),
      ValidatorRegistryLive,
      EffectLspLoggerLive,
    );
    // Provide base layer to ArtifactLoadingHelperLive (which requires ISymbolManager)
    // This explicitly resolves the ISymbolManager dependency
    const artifactHelperLayer = Layer.provide(
      ArtifactLoadingHelperLive,
      baseLayer,
    );
    // Merge base layer with artifact helper layer to get complete layer stack
    const fullLayer = Layer.mergeAll(baseLayer, artifactHelperLayer);
    return effect.pipe(Effect.provide(fullLayer)) as Effect.Effect<
      Diagnostic[],
      never,
      never
    >;
  }

  /**
   * Run semantic validators for a specific tier (async wrapper)
   */
  private async runSemanticValidators(
    tier: ValidationTier,
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Promise<Diagnostic[]> {
    return await Effect.runPromise(
      this.runSemanticValidatorsEffect(tier, symbolTable, options),
    );
  }

  /**
   * Create a callback for loading missing artifacts during validation
   *
   * This callback is passed to validators via ValidationOptions and allows
   * them to trigger artifact loading using the existing MissingArtifactResolutionService.
   *
   * @param contextFile - The file URI that triggered validation (for context)
   * @returns Callback function that loads artifacts and returns loaded file URIs
   */
  private createLoadArtifactCallback(
    contextFile: string,
  ): (typeNames: string[]) => Promise<string[]> {
    return async (typeNames: string[]): Promise<string[]> => {
      this.logger.debug(
        () =>
          `Validator requesting to load ${typeNames.length} missing types: ${typeNames.join(', ')}`,
      );

      const loadedUris: string[] = [];

      // Try to load each type using the artifact resolution service
      for (const typeName of typeNames) {
        try {
          const result = await this.artifactResolutionService.resolveBlocking({
            identifier: typeName,
            origin: {
              uri: contextFile,
              requestKind: 'references', // Validation needs type references
            },
            mode: 'blocking',
            // Use shorter timeout for validator-triggered loads
            timeoutMsHint: 2000,
          });

          if (result === 'resolved') {
            // Type was successfully loaded
            // The resolution service will have already added symbols to the manager
            this.logger.debug(
              () => `Successfully loaded artifact for type: ${typeName}`,
            );
            // Note: We don't have the exact file URI from resolveBlocking,
            // but the type should now be available in symbolManager
            loadedUris.push(typeName); // Use type name as placeholder
          } else {
            this.logger.debug(
              () => `Failed to load artifact for type '${typeName}': ${result}`,
            );
          }
        } catch (error) {
          this.logger.debug(
            () => `Error loading artifact for type '${typeName}': ${error}`,
          );
        }
      }

      this.logger.debug(
        () =>
          `Artifact loading callback completed: ${loadedUris.length}/${typeNames.length} types loaded`,
      );

      return loadedUris;
    };
  }
}
