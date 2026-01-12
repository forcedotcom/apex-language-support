/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  HoverParams,
  Hover,
  MarkupContent,
  MarkupKind,
  Position,
} from 'vscode-languageserver';
import {
  ApexCapabilitiesManager,
  LoggerInterface,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  isMethodSymbol,
  isClassSymbol,
  isInterfaceSymbol,
  isEnumSymbol,
  isTriggerSymbol,
  isConstructorSymbol,
  isVariableSymbol,
  VariableSymbol,
  inTypeSymbolGroup,
  isApexKeyword,
  ReferenceContext,
  SymbolKind,
} from '@salesforce/apex-lsp-parser-ast';
import { MissingArtifactUtils } from '../utils/missingArtifactUtils';
import { calculateDisplayFQN } from '../utils/displayFQNUtils';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import { isWorkspaceLoaded } from './WorkspaceLoadCoordinator';

import {
  transformLspToParserPosition,
  formatPosition,
} from '../utils/positionUtils';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Effect } from 'effect';

/**
 * Interface for hover processing functionality
 */
export interface IHoverProcessor {
  /**
   * Process a hover request
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  processHover(params: HoverParams): Promise<Hover | null>;
}

/**
 * Service for processing hover requests using ApexSymbolManager
 *
 * This service leverages the modern symbol manager capabilities for:
 * - Strategy-based symbol resolution
 * - Precise position-based lookup
 * - Cross-file resolution via TypeReferences
 * - Context-aware symbol disambiguation
 */
export class HoverProcessingService implements IHoverProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly capabilitiesManager: ApexCapabilitiesManager;
  private readonly missingArtifactUtils: MissingArtifactUtils;
  private layerEnrichmentService: LayerEnrichmentService | null = null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    // Use the passed symbol manager or fall back to the singleton
    this.symbolManager =
      symbolManager ??
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    this.capabilitiesManager = ApexCapabilitiesManager.getInstance();
    // MissingArtifactUtils will create the service on-demand
    this.missingArtifactUtils = new MissingArtifactUtils(
      logger,
      this.symbolManager,
    );
  }

  /**
   * Set the layer enrichment service for on-demand SymbolTable enrichment
   */
  setLayerEnrichmentService(service: LayerEnrichmentService): void {
    this.logger.debug(
      () =>
        `[HoverProcessingService] LayerEnrichmentService set: ${service ? 'yes' : 'no'}`,
    );
    this.layerEnrichmentService = service;
  }

  /**
   * Process a hover request using modern symbol manager capabilities
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async processHover(params: HoverParams): Promise<Hover | null> {
    const hoverStartTime = Date.now();
    this.logger.debug(
      () =>
        `Symbols in file ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
    );

    try {
      // Early keyword check: if position is on a keyword, return null immediately
      // This prevents hover from processing keywords
      const keywordCheckStartTime = Date.now();
      const storage = ApexStorageManager.getInstance().getStorage();
      const document = await storage.getDocument(params.textDocument.uri);
      if (document) {
        const wordAtPosition = this.extractWordAtPosition(
          document,
          params.position,
        );
        if (wordAtPosition && isApexKeyword(wordAtPosition)) {
          const keywordCheckTime = Date.now() - keywordCheckStartTime;
          this.logger.debug(
            () =>
              `[HOVER-DIAG] Position is on keyword "${wordAtPosition}", ` +
              `returning null (keyword check: ${keywordCheckTime}ms)`,
          );
          return null;
        }
      }
      const keywordCheckTime = Date.now() - keywordCheckStartTime;

      // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
      const parserPosition = transformLspToParserPosition(params.position);

      // Get TypeReferences at position first
      // This tells us if there's a parsed identifier at this position
      const referencesStartTime = Date.now();
      const references = this.symbolManager.getReferencesAtPosition(
        params.textDocument.uri,
        parserPosition,
      );
      const referencesTime = Date.now() - referencesStartTime;
      
      // Debug: Log all references at position
      if (references && references.length > 0) {
        this.logger.debug(
          () =>
            `[HOVER-DEBUG] Found ${references.length} reference(s) at position ${parserPosition.line}:${parserPosition.character}: ` +
            references.map(
              (ref) =>
                `${ref.name} (${ReferenceContext[ref.context]}) at ${ref.location.identifierRange.startLine}:${ref.location.identifierRange.startColumn}-${ref.location.identifierRange.endColumn}`,
            ).join(', '),
        );
      } else {
        this.logger.debug(
          () =>
            `[HOVER-DEBUG] No references found at position ${parserPosition.line}:${parserPosition.character}`,
        );
      }

      // Check if file has symbols indexed before lookup
      const fileSymbolsStartTime = Date.now();
      const fileSymbols = this.symbolManager.findSymbolsInFile(
        params.textDocument.uri,
      );
      const fileSymbolsTime = Date.now() - fileSymbolsStartTime;
      this.logger.debug(
        () =>
          `Symbols in file ${params.textDocument.uri}: ${fileSymbols.length} symbols found` +
          `${fileSymbols.map((s) => s.name).join(', ')}`,
      );

      // PRIORITY: Check for METHOD_CALL references FIRST before calling getSymbolAtPosition
      // Even though getSymbolAtPosition prioritizes METHOD_CALL, if resolution fails it falls back
      // to direct symbol lookup which can find variables. We need to ensure METHOD_CALL references
      // are resolved even if it requires enrichment.
      const symbolResolutionStartTime = Date.now();
      let symbol: ApexSymbol | null = null;
      
      if (references && references.length > 0) {
        const methodCallRef = references.find(
          (ref) =>
            ref.context === ReferenceContext.METHOD_CALL &&
            ref.location.identifierRange.startLine === parserPosition.line &&
            ref.location.identifierRange.startColumn <= parserPosition.character &&
            ref.location.identifierRange.endColumn >= parserPosition.character,
        );

        if (methodCallRef) {
          // Try to resolve the METHOD_CALL reference first
          // This may require enrichment if standard library classes aren't loaded yet
          symbol = await this.symbolManager.getSymbolAtPosition(
            params.textDocument.uri,
            parserPosition,
            'precise',
          );

          // If we got a symbol but it's not a method, and we have a METHOD_CALL reference,
          // reject the variable symbol and try enrichment to resolve the method call
          if (symbol && !isMethodSymbol(symbol) && methodCallRef.name) {
            const symbolKind = symbol.kind;
            this.logger.debug(
              () =>
                `[HOVER] Found ${symbolKind} symbol but METHOD_CALL reference exists for "${methodCallRef.name}". ` +
                `Rejecting ${symbolKind} symbol and attempting enrichment to resolve method call.`,
            );

            // Reject the variable symbol - we need to resolve the METHOD_CALL
            symbol = null;

            // Try enrichment to resolve the method call
            const storage = ApexStorageManager.getInstance().getStorage();
            const document = await storage.getDocument(params.textDocument.uri);
            if (document) {
              const documentText = document.getText();
              const enrichedSymbol = await Effect.runPromise(
                this.symbolManager.resolveWithEnrichment(
                  params.textDocument.uri,
                  documentText,
                  async () => {
                    // After enrichment, try getSymbolAtPosition again
                    // This should now resolve the METHOD_CALL since standard library classes are loaded
                    const resolvedSymbol = await this.symbolManager.getSymbolAtPosition(
                      params.textDocument.uri,
                      parserPosition,
                      'precise',
                    );
                    // Only accept method symbols - reject variables
                    if (resolvedSymbol && isMethodSymbol(resolvedSymbol)) {
                      return resolvedSymbol;
                    }
                    return null;
                  },
                ),
              );

              if (enrichedSymbol && isMethodSymbol(enrichedSymbol)) {
                symbol = enrichedSymbol;
                this.logger.debug(
                  () =>
                    `[HOVER] Successfully resolved METHOD_CALL "${methodCallRef.name}" after enrichment.`,
                );
              } else {
                this.logger.debug(
                  () =>
                    `[HOVER] Enrichment did not resolve METHOD_CALL "${methodCallRef.name}".`,
                );
              }
            }
          } else if (symbol && isMethodSymbol(symbol)) {
            this.logger.debug(
              () =>
                `[HOVER] Successfully resolved METHOD_CALL "${methodCallRef.name}" without enrichment.`,
            );
          } else if (!symbol) {
            // No symbol found - try enrichment to resolve the METHOD_CALL
            this.logger.debug(
              () =>
                `[HOVER] No symbol found but METHOD_CALL reference exists for "${methodCallRef.name}". ` +
                `Attempting enrichment to resolve method call.`,
            );

            const storage = ApexStorageManager.getInstance().getStorage();
            const document = await storage.getDocument(params.textDocument.uri);
            if (document) {
              const documentText = document.getText();
              const enrichedSymbol = await Effect.runPromise(
                this.symbolManager.resolveWithEnrichment(
                  params.textDocument.uri,
                  documentText,
                  async () => {
                    const resolvedSymbol = await this.symbolManager.getSymbolAtPosition(
                      params.textDocument.uri,
                      parserPosition,
                      'precise',
                    );
                    // Only accept method symbols
                    if (resolvedSymbol && isMethodSymbol(resolvedSymbol)) {
                      return resolvedSymbol;
                    }
                    return null;
                  },
                ),
              );

              if (enrichedSymbol && isMethodSymbol(enrichedSymbol)) {
                symbol = enrichedSymbol;
                this.logger.debug(
                  () =>
                    `[HOVER] Successfully resolved METHOD_CALL "${methodCallRef.name}" after enrichment.`,
                );
              }
            }
          }
        }
      }

      // If no symbol found yet (or METHOD_CALL wasn't found), use getSymbolAtPosition
      if (!symbol) {
        symbol = await this.symbolManager.getSymbolAtPosition(
          params.textDocument.uri,
          parserPosition,
          'precise',
        );
      }
      
      const symbolResolutionTime = Date.now() - symbolResolutionStartTime;

      if (symbol) {
        // Symbol found - check if we're hovering over a class name in a constructor call context
        // If so, try to find the constructor symbol instead
        let symbolToUse = symbol;
        if (isClassSymbol(symbol) && references && references.length > 0) {
          // Check if there's a CONSTRUCTOR_CALL reference at this position
          const constructorCallRef = references.find(
            (ref) =>
              ref.context === ReferenceContext.CONSTRUCTOR_CALL &&
              ref.name === symbol.name &&
              ref.location.identifierRange.startLine === parserPosition.line &&
              ref.location.identifierRange.startColumn <=
                parserPosition.character &&
              ref.location.identifierRange.endColumn >=
                parserPosition.character,
          );

          if (constructorCallRef) {
            // Try to find the constructor symbol for this class
            const fileSymbols = this.symbolManager.findSymbolsInFile(
              params.textDocument.uri,
            );
            const constructorSymbol = fileSymbols.find(
              (s) =>
                s.name === symbol.name &&
                s.kind === SymbolKind.Constructor &&
                s.parentId === symbol.id,
            );

            if (constructorSymbol) {
              this.logger.debug(
                () =>
                  `Found constructor symbol for class ${symbol.name} in constructor call context`,
              );
              symbolToUse = constructorSymbol;
            } else {
              // No explicit constructor found - Apex has implicit default constructor
              // We'll handle this in createHoverInformation by checking for constructor call context
              this.logger.debug(
                () =>
                  `No explicit constructor found for class ${symbol.name}, will show default constructor signature`,
              );
            }
          }
        }

        // Symbol found - return hover information
        this.logger.debug(
          () =>
            `Found symbol: ${symbolToUse.name} (${symbolToUse.kind}) at position ` +
            `${parserPosition.line}:${parserPosition.character}`,
        );

        const hoverCreationStartTime = Date.now();
        const hover = await this.createHoverInformation(
          symbolToUse,
          symbol,
          references,
          parserPosition,
        );
        const hoverCreationTime = Date.now() - hoverCreationStartTime;
        const totalTime = Date.now() - hoverStartTime;

        if (
          totalTime > 50 ||
          symbolResolutionTime > 30 ||
          hoverCreationTime > 20
        ) {
          this.logger.debug(
            () =>
              `[HOVER-DIAG] Hover completed in ${totalTime}ms ` +
              `(keyword=${keywordCheckTime}ms, references=${referencesTime}ms, ` +
              `fileSymbols=${fileSymbolsTime}ms, symbolResolution=${symbolResolutionTime}ms, ` +
              `hoverCreation=${hoverCreationTime}ms)`,
          );
        }

        this.logger.debug(
          () => `Hover creation result: ${hover ? 'success' : 'null'}`,
        );

        return hover;
      }

      // No symbol found - first check if there's a variable/field/property symbol at this position
      // This handles cases where hovering over a variable name in its declaration
      // doesn't create a reference but the symbol exists in fileSymbols
      if (!symbol && fileSymbols.length > 0) {
        const variableAtPosition = fileSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Variable ||
              s.kind === SymbolKind.Field ||
              s.kind === SymbolKind.Property) &&
            s.location?.symbolRange &&
            s.location.symbolRange.startLine === parserPosition.line &&
            s.location.symbolRange.startColumn <= parserPosition.character &&
            s.location.symbolRange.endColumn >= parserPosition.character,
        );

        if (variableAtPosition) {
          this.logger.debug(
            () =>
              'Found variable/field/property symbol at position: ' +
              `${variableAtPosition.name} (${variableAtPosition.kind})`,
          );

          const hoverCreationStartTime = Date.now();
          const hover = await this.createHoverInformation(
            variableAtPosition,
            undefined,
            references,
            parserPosition,
          );
          const hoverCreationTime = Date.now() - hoverCreationStartTime;
          const totalTime = Date.now() - hoverStartTime;

          if (totalTime > 50) {
            this.logger.debug(
              () =>
                `[HOVER-DIAG] Variable declaration hover completed in ${totalTime}ms ` +
                `(hoverCreation=${hoverCreationTime}ms)`,
            );
          }

          return hover;
        }
      }

      // No symbol found - use iterative enrichment via ISymbolManager API
      // This enriches layer by layer (public-api -> protected -> private -> full)
      // with resolution attempts between each layer
      if (references && references.length > 0) {
        this.logger.debug(
          () =>
            '[HOVER] TypeReference exists but no symbol found. ' +
            'Using iterative enrichment via symbolManager.resolveWithEnrichment',
        );

        const storage = ApexStorageManager.getInstance().getStorage();
        const document = await storage.getDocument(params.textDocument.uri);

        if (document) {
          const documentText = document.getText();

          // Use the new ISymbolManager API for iterative enrichment
          const symbolAfterEnrichment = await Effect.runPromise(
            this.symbolManager.resolveWithEnrichment(
              params.textDocument.uri,
              documentText,
              () => {
                // Resolution function: try to find symbol at position
                // This is called after each enrichment layer
                const symbols = this.symbolManager.findSymbolsInFile(
                  params.textDocument.uri,
                );

                // First try exact position match
                const symbolAtPos = symbols.find(
                  (s) =>
                    s.location?.symbolRange &&
                    s.location.symbolRange.startLine === parserPosition.line &&
                    s.location.symbolRange.startColumn <=
                      parserPosition.character &&
                    s.location.symbolRange.endColumn >=
                      parserPosition.character,
                );

                if (symbolAtPos) {
                  return symbolAtPos;
                }

                // Try identifier range match
                const symbolAtIdRange = symbols.find(
                  (s) =>
                    s.location?.identifierRange &&
                    this.isPositionInRange(
                      parserPosition,
                      s.location.identifierRange,
                    ),
                );

                if (symbolAtIdRange) {
                  return symbolAtIdRange;
                }

                // Check for METHOD_CALL references first (prioritize method calls over variables)
                // Find METHOD_CALL references on the same line, allowing for slight position variance
                const methodCallRef = references.find(
                  (ref) =>
                    ref.context === ReferenceContext.METHOD_CALL &&
                    ref.location.identifierRange.startLine === parserPosition.line &&
                    // Allow position to be within or very close to the reference range
                    ((ref.location.identifierRange.startColumn <=
                      parserPosition.character &&
                      ref.location.identifierRange.endColumn >=
                        parserPosition.character) ||
                      // Also check if position is just before the reference (within 5 characters)
                      (parserPosition.character >=
                        ref.location.identifierRange.startColumn - 5 &&
                        parserPosition.character <
                          ref.location.identifierRange.startColumn)),
                );

                if (methodCallRef) {
                  // If the reference is already resolved, use the resolved symbol
                  if (methodCallRef.resolvedSymbolId) {
                    const resolvedSymbol = this.symbolManager.getSymbol(
                      methodCallRef.resolvedSymbolId,
                    );
                    if (resolvedSymbol && isMethodSymbol(resolvedSymbol)) {
                      return resolvedSymbol;
                    }
                  }

                  // If not resolved, try to find the method symbol by name
                  // This might be in the current file or in a standard library class
                  if (methodCallRef.name) {
                    const methodSymbols = this.symbolManager.findSymbolByName(
                      methodCallRef.name,
                    );
                    // Filter for method symbols
                    const methodCandidates = methodSymbols.filter((s) =>
                      isMethodSymbol(s),
                    );

                    // If we have a parent context (e.g., "EncodingUtil"), try to match it
                    // parentContext is a string representing the type name
                    if (
                      methodCallRef.parentContext &&
                      methodCandidates.length > 0
                    ) {
                      const parentClassSymbols = this.symbolManager.findSymbolByName(
                        methodCallRef.parentContext,
                      );
                      const parentClass = parentClassSymbols.find((c) =>
                        isClassSymbol(c),
                      );

                      if (parentClass) {
                        // Find method in the parent class
                        const methodInParent = methodCandidates.find(
                          (m) => m.parentId === parentClass.id,
                        );
                        if (methodInParent) {
                          return methodInParent;
                        }
                      }
                    }

                    // Fallback: return first method symbol if found
                    if (methodCandidates.length > 0) {
                      return methodCandidates[0];
                    }
                  }
                }

                // Check for VARIABLE_USAGE or VARIABLE_DECLARATION references
                const variableRef =
                  references.find(
                    (ref) =>
                      ref.context === ReferenceContext.VARIABLE_DECLARATION,
                  ) ||
                  references.find(
                    (ref) =>
                      ref.context === ReferenceContext.VARIABLE_USAGE &&
                      ref.name,
                  );

                if (variableRef && variableRef.name) {
                  const variableSymbol = symbols.find(
                    (s) =>
                      (s.kind === SymbolKind.Variable ||
                        s.kind === SymbolKind.Field ||
                        s.kind === SymbolKind.Property) &&
                      s.name === variableRef.name &&
                      s.fileUri === params.textDocument.uri,
                  );

                  if (variableSymbol) {
                    return variableSymbol;
                  }
                }

                return null;
              },
            ),
          );

          if (symbolAfterEnrichment) {
            this.logger.debug(
              () =>
                'Found symbol after iterative enrichment: ' +
                `${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`,
            );

            const hoverCreationStartTime = Date.now();
            const hover = await this.createHoverInformation(
              symbolAfterEnrichment,
              undefined,
              references,
              parserPosition,
            );
            const hoverCreationTime = Date.now() - hoverCreationStartTime;
            const totalTime = Date.now() - hoverStartTime;

            if (totalTime > 50) {
              this.logger.debug(
                () =>
                  `[HOVER-DIAG] Hover completed after iterative enrichment in ${totalTime}ms ` +
                  `(hoverCreation=${hoverCreationTime}ms)`,
              );
            }

            return hover;
          }
        }

        // Check if this is a variable reference - skip missing artifact resolution
        const variableRef =
          references.find(
            (ref) => ref.context === ReferenceContext.VARIABLE_DECLARATION,
          ) ||
          references.find(
            (ref) =>
              ref.context === ReferenceContext.VARIABLE_USAGE && ref.name,
          );

        if (variableRef) {
          this.logger.debug(
            () =>
              'Skipping missing artifact resolution for variable reference - ' +
              'symbol should be in same file',
          );
          return null;
        }

        // Fall back to missing artifact resolution for cross-file references
        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return (
            `No symbol found after enrichment at parser position ${parserPos} ` +
            '- triggering missing artifact resolution'
          );
        });

        const settings = ApexSettingsManager.getInstance().getSettings();
        if (settings?.apex?.findMissingArtifact?.enabled) {
          this.missingArtifactUtils.tryResolveMissingArtifactBackground(
            params.textDocument.uri,
            params.position,
            'hover',
          );

          const searchingHover = await this.createSearchingHover(params);
          return searchingHover;
        }

        return null;
      } else if (!symbol) {
        // No references found - try iterative enrichment for suppressed references
        this.logger.debug(
          () =>
            '[HOVER] No references found at position, ' +
            'using iterative enrichment via symbolManager.resolveWithEnrichment',
        );

        const storage = ApexStorageManager.getInstance().getStorage();
        const document = await storage.getDocument(params.textDocument.uri);

        if (document) {
          const documentText = document.getText();

          const symbolAfterEnrichment = await Effect.runPromise(
            this.symbolManager.resolveWithEnrichment(
              params.textDocument.uri,
              documentText,
              () => {
                const symbols = this.symbolManager.findSymbolsInFile(
                  params.textDocument.uri,
                );

                // Try identifier range match
                for (const candidateSymbol of symbols) {
                  if (candidateSymbol.location?.identifierRange) {
                    if (
                      this.isPositionInRange(
                        parserPosition,
                        candidateSymbol.location.identifierRange,
                      )
                    ) {
                      return candidateSymbol;
                    }
                  }
                }

                // Try symbol range match
                const symbolAtPos = symbols.find(
                  (s) =>
                    s.location?.symbolRange &&
                    s.location.symbolRange.startLine === parserPosition.line &&
                    s.location.symbolRange.startColumn <=
                      parserPosition.character &&
                    s.location.symbolRange.endColumn >=
                      parserPosition.character,
                );

                return symbolAtPos || null;
              },
            ),
          );

          if (symbolAfterEnrichment) {
            this.logger.debug(
              () =>
                'Found symbol after iterative enrichment (no refs): ' +
                `${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`,
            );

            const hover = await this.createHoverInformation(
              symbolAfterEnrichment,
              undefined,
              references,
              parserPosition,
            );
            return hover;
          }
        }
      }

      // If workspace is not loaded and no references found, try missing artifact resolution
      if (!isWorkspaceLoaded() && (!references || references.length === 0)) {
        this.logger.debug(
          () =>
            'Workspace not loaded and no references found - ' +
            'trying missing artifact resolution',
        );

        const settings = ApexSettingsManager.getInstance().getSettings();
        if (settings?.apex?.findMissingArtifact?.enabled) {
          this.missingArtifactUtils.tryResolveMissingArtifactBackground(
            params.textDocument.uri,
            params.position,
            'hover',
          );

          return await this.createSearchingHover(params);
        }
      }

      // No symbol AND no TypeReference = nothing of interest (keyword, whitespace, etc.)
      const totalTime = Date.now() - hoverStartTime;
      this.logger.debug(() => {
        const parserPos = formatPosition(parserPosition, 'parser');
        return (
          `No symbol and no TypeReference at parser position ${parserPos} - nothing of interest ` +
          `(total time: ${totalTime}ms)`
        );
      });

      return null;
    } catch (error) {
      const totalTime = Date.now() - hoverStartTime;
      this.logger.error(
        () =>
          `[HOVER-DIAG] Error processing hover after ${totalTime}ms: ${error}`,
      );
      return null;
    }
  }

  /**
   * Check if a position is within a range
   */
  private isPositionInRange(
    position: { line: number; character: number },
    range: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    },
  ): boolean {
    return (
      position.line >= range.startLine &&
      position.line <= range.endLine &&
      position.character >= range.startColumn &&
      position.character <= range.endColumn
    );
  }

  /**
   * Extract word at the given position from the document
   * Similar to ReferencesProcessingService.getWordRangeAtPosition
   */
  private extractWordAtPosition(
    document: TextDocument,
    position: Position,
  ): string | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Simple word boundary detection
    const wordRegex = /\b\w+\b/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (offset >= start && offset < end) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Create hover information for a symbol
   * @param symbol The symbol to create hover for
   * @param originalSymbol The original symbol found (may differ if we're showing constructor for class)
   * @param references Optional references at the position (for detecting constructor call context)
   * @param position Optional position (for detecting constructor call context)
   */
  private async createHoverInformation(
    symbol: ApexSymbol,
    originalSymbol?: ApexSymbol,
    references?: any[],
    position?: { line: number; character: number },
  ): Promise<Hover> {
    const content: string[] = [];

    // Construct display FQN (semantic hierarchy without block symbols) with original casing preserved
    // Always construct a new FQN with normalizeCase: false for display purposes,
    // even if symbol.fqn exists (which may be normalized to lowercase)
    const fqn = calculateDisplayFQN(symbol, this.symbolManager, {
      normalizeCase: false,
    });

    // Header: IDE-style signature for all symbol kinds
    content.push('');
    content.push('```apex');
    if (isMethodSymbol(symbol)) {
      const returnType = this.formatTypeDisplay(symbol.returnType) ?? 'void';
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${this.formatTypeDisplay(p.type) ?? 'any'} ${p.name}`)
        .join(', ');

      // Prefer a containing type-qualified name to make hover clearer for chained calls
      const containingTypeName = this.findContainingTypeName(symbol);
      const methodName = containingTypeName
        ? `${containingTypeName}.${symbol.name}`
        : fqn || symbol.name;

      content.push(`${returnType} ${methodName}(${paramsSig})`);
    } else if (isConstructorSymbol(symbol)) {
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${p.type?.name ?? 'any'} ${p.name}`)
        .join(', ');
      const ctorName = fqn || symbol.name;
      content.push(`${ctorName}(${paramsSig})`);
    } else if (isClassSymbol(symbol)) {
      // Check if we're in a constructor call context (hovering over class name in "new ClassName()")
      const isConstructorCallContext =
        originalSymbol &&
        isClassSymbol(originalSymbol) &&
        references &&
        position &&
        references.some(
          (ref) =>
            ref.context === ReferenceContext.CONSTRUCTOR_CALL &&
            ref.name === symbol.name &&
            ref.location.identifierRange.startLine === position.line &&
            ref.location.identifierRange.startColumn <= position.character &&
            ref.location.identifierRange.endColumn >= position.character,
        );

      if (isConstructorCallContext) {
        // Show constructor signature format (default constructor if no explicit constructor exists)
        const className = fqn || symbol.name;
        content.push(`${className}()`);
      } else {
        content.push(`class ${fqn || symbol.name}`);
      }
    } else if (isInterfaceSymbol(symbol)) {
      content.push(`interface ${fqn || symbol.name}`);
    } else if (isEnumSymbol(symbol)) {
      content.push(`enum ${fqn || symbol.name}`);
    } else if (isTriggerSymbol(symbol)) {
      content.push(`trigger ${fqn || symbol.name}`);
    } else if (isVariableSymbol(symbol)) {
      const variableSymbol = symbol as VariableSymbol;
      const type = this.formatTypeDisplay(variableSymbol.type) ?? 'unknown';
      content.push(`${type} ${fqn || symbol.name}`);
    } else {
      content.push(fqn || symbol.name);
    }
    content.push('```');

    // Add modifiers
    if (symbol.modifiers) {
      const modifiers = [];
      if (symbol.modifiers.isStatic) modifiers.push('static');
      if (symbol.modifiers.visibility)
        modifiers.push(symbol.modifiers.visibility);
      if (symbol.modifiers.isFinal) modifiers.push('final');
      if (symbol.modifiers.isAbstract) modifiers.push('abstract');
      // TODO: Add support for sharing modifiers (with sharing, without sharing)
      // This requires extending SymbolModifiers interface and updating symbol collector
      if (modifiers.length > 0) {
        content.push(`**Modifiers:** ${modifiers.join(', ')}`);
      }
    }
    // Add metrics information only in development mode
    if (this.capabilitiesManager.getMode() === 'development') {
      // Add type information (compact) for value-like symbols
      const isTypeLike = inTypeSymbolGroup(symbol);
      if (!isMethodSymbol(symbol) && !isTypeLike && isVariableSymbol(symbol)) {
        const variableSymbol = symbol as VariableSymbol;
        if (variableSymbol.type?.name) {
          content.push(
            `**Type:** ${this.formatTypeDisplay(variableSymbol.type)}`,
          );
        }
      }

      if (isMethodSymbol(symbol)) {
        // Method details already shown in signature; skip verbose duplication
      }

      // Add inheritance information
      if (isClassSymbol(symbol)) {
        if (symbol.superClass) {
          content.push(`**Extends:** ${symbol.superClass}`);
        }

        if (symbol.interfaces && symbol.interfaces.length > 0) {
          content.push(`**Implements:** ${symbol.interfaces.join(', ')}`);
        }
      }

      if (isInterfaceSymbol(symbol)) {
        if (symbol.interfaces && symbol.interfaces.length > 0) {
          content.push(`**Extends:** ${symbol.interfaces.join(', ')}`);
        }
      }

      try {
        const referencesTo = this.symbolManager.findReferencesTo(symbol);
        const referencesFrom = this.symbolManager.findReferencesFrom(symbol);
        const dependencyAnalysis =
          this.symbolManager.analyzeDependencies(symbol);
        const totalReferences = referencesTo.length + referencesFrom.length;

        if (
          totalReferences > 0 ||
          dependencyAnalysis.dependencies.length > 0 ||
          dependencyAnalysis.dependents.length > 0
        ) {
          content.push('');
          content.push('**Metrics:**');
          content.push(`- Reference count: ${totalReferences}`);
          content.push(
            `- Dependency count: ${dependencyAnalysis.dependencies.length}`,
          );
          content.push(
            `- Dependents count: ${dependencyAnalysis.dependents.length}`,
          );
          content.push(
            `- Impact score: ${dependencyAnalysis.impactScore.toFixed(2)}`,
          );
        }
      } catch (error) {
        this.logger.debug(() => `Error getting metrics: ${error}`);
      }
    }

    // Add file location
    if (symbol.fileUri) {
      content.push('');
      content.push(`**File:** ${symbol.fileUri}`);
    }

    const markupContent: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: content.join('\n'),
    };

    return {
      contents: markupContent,
    };
  }

  /**
   * Create a hover that shows the user we're searching for a missing artifact
   */
  private async createSearchingHover(params: HoverParams): Promise<Hover> {
    const content: string[] = [];

    // Extract the symbol name from the text at the hover position
    const symbolName = await this.extractSymbolNameAtPosition(params);

    content.push('🔍 **Searching for symbol...**');
    content.push('');
    content.push(`Looking for: \`${symbolName}\``);
    content.push('');
    content.push(
      '*The Apex Language Server is searching for this symbol in your workspace and standard libraries.*',
    );
    content.push('');
    content.push('⏳ *This may take a moment...*');

    const markupContent: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: content.join('\n'),
    };

    return {
      contents: markupContent,
    };
  }

  /**
   * Extract the symbol name at the hover position for display purposes
   */
  private async extractSymbolNameAtPosition(
    params: HoverParams,
  ): Promise<string> {
    try {
      // Get the document from storage to extract the symbol name
      const storage = ApexStorageManager.getInstance().getStorage();
      const document = await storage.getDocument(params.textDocument.uri);

      if (!document) {
        return 'Unknown Symbol';
      }

      const position = params.position;
      const line = document.getText().split('\n')[position.line] || '';

      // Simple word extraction at the cursor position
      const words = line.split(/\W+/);
      const charIndex = position.character;

      // Find the word that contains the cursor position
      let currentPos = 0;
      for (const word of words) {
        const wordStart = line.indexOf(word, currentPos);
        const wordEnd = wordStart + word.length;

        if (charIndex >= wordStart && charIndex <= wordEnd && word.length > 0) {
          return word;
        }
        currentPos = wordEnd;
      }

      // Fallback: try to extract a simple identifier
      const match = line
        .substring(Math.max(0, charIndex - 20), charIndex + 20)
        .match(/([a-zA-Z_][a-zA-Z0-9_]*)/);

      return match ? match[1] : 'Unknown Symbol';
    } catch (error) {
      this.logger.debug(() => `Error extracting symbol name: ${error}`);
      return 'Unknown Symbol';
    }
  }

  /**
   * Render a type with generic arguments for hover display.
   * Handles TypeInfo structure with keyType (for Map) and typeParameters.
   */
  private formatTypeDisplay(type?: {
    name?: string;
    fqn?: string;
    typeArguments?: any[];
    typeParameters?: any[];
    keyType?: any;
    originalTypeString?: string;
  }): string | null {
    if (!type) return null;

    // If originalTypeString exists and contains generics, use it (most reliable)
    if ((type as any).originalTypeString) {
      const original = (type as any).originalTypeString;
      // Check if it already has generics (contains <)
      if (original.includes('<')) {
        return original;
      }
    }

    const base = type.name || type.fqn || 'any';

    // Handle Map types: Map<KeyType, ValueType>
    // Map types have keyType and typeParameters[0] = valueType
    if (base === 'Map' && (type as any).keyType) {
      const keyType =
        this.formatTypeDisplay((type as any).keyType) ||
        (type as any).keyType?.name ||
        'any';
      const valueType =
        (type as any).typeParameters && (type as any).typeParameters.length > 0
          ? this.formatTypeDisplay((type as any).typeParameters[0]) ||
            (type as any).typeParameters[0]?.name ||
            'any'
          : 'any';
      return `${base}<${keyType}, ${valueType}>`;
    }

    // Handle other generic types with typeParameters
    if (
      (type as any).typeParameters &&
      (type as any).typeParameters.length > 0
    ) {
      const renderedArgs = (type as any).typeParameters
        .map((arg: any) => this.formatTypeDisplay(arg) || arg.name || 'any')
        .join(', ');
      return `${base}<${renderedArgs}>`;
    }

    // Fallback to typeArguments for backward compatibility
    if (type.typeArguments && type.typeArguments.length > 0) {
      const renderedArgs = type.typeArguments
        .map((arg) => this.formatTypeDisplay(arg) || arg.name || 'any')
        .join(', ');
      return `${base}<${renderedArgs}>`;
    }

    return base;
  }

  /**
   * Walk parentId chain to find the containing type name (class/interface/enum).
   * Returns the FQN (including namespace) of the containing type for proper display.
   * symbol.parent may point to a block; this climbs until it finds a type.
   */
  private findContainingTypeName(symbol: ApexSymbol): string | null {
    try {
      // Fast path: try symbolManager helper first
      const containing = this.symbolManager.getContainingType(symbol);
      if (containing) {
        // Use FQN to include namespace (e.g., "System.Assert" instead of just "Assert")
        const containingFQN = calculateDisplayFQN(
          containing,
          this.symbolManager,
          {
            normalizeCase: false,
          },
        );
        return containingFQN || containing.name || null;
      }

      // Manual walk up the parentId chain
      let current: ApexSymbol | null = symbol;
      const visited = new Set<string>();
      while (current?.parentId) {
        if (visited.has(current.parentId)) break;
        visited.add(current.parentId);
        const parent = this.symbolManager.getSymbol(current.parentId);
        if (!parent) break;

        if (
          isClassSymbol(parent) ||
          isInterfaceSymbol(parent) ||
          isEnumSymbol(parent)
        ) {
          // Use FQN to include namespace
          const parentFQN = calculateDisplayFQN(parent, this.symbolManager, {
            normalizeCase: false,
          });
          return parentFQN || parent.name || null;
        }

        current = parent;
      }

      // Fallback: use file symbols + range containment to locate enclosing type
      if (symbol.fileUri && symbol.location?.symbolRange) {
        const { startLine, endLine, startColumn, endColumn } =
          symbol.location.symbolRange;
        const candidates = this.symbolManager
          .findSymbolsInFile(symbol.fileUri)
          .filter(
            (s) =>
              (isClassSymbol(s) || isInterfaceSymbol(s) || isEnumSymbol(s)) &&
              s.location?.symbolRange &&
              s.location.symbolRange.startLine <= startLine &&
              s.location.symbolRange.endLine >= endLine &&
              s.location.symbolRange.startColumn <= startColumn &&
              s.location.symbolRange.endColumn >= endColumn,
          );

        if (candidates.length > 0) {
          // Choose the smallest enclosing range (most specific containing type)
          const best = candidates.reduce((bestSoFar, current) => {
            const bestRange = bestSoFar.location!.symbolRange;
            const currRange = current.location!.symbolRange;
            const bestSize =
              (bestRange.endLine - bestRange.startLine) * 1000 +
              (bestRange.endColumn - bestRange.startColumn);
            const currSize =
              (currRange.endLine - currRange.startLine) * 1000 +
              (currRange.endColumn - currRange.startColumn);
            return currSize < bestSize ? current : bestSoFar;
          }, candidates[0]);

          if (best) {
            // Use FQN to include namespace
            const bestFQN = calculateDisplayFQN(best, this.symbolManager, {
              normalizeCase: false,
            });
            return bestFQN || best.name || null;
          }
        }
      }
    } catch (_e) {
      // ignore and return null
    }
    return null;
  }
}
