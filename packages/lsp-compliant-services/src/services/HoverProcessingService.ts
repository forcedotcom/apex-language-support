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
} from '@salesforce/apex-lsp-parser-ast';
import { MissingArtifactUtils } from '../utils/missingArtifactUtils';
import { calculateDisplayFQN } from '../utils/displayFQNUtils';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import { getDocumentStateCache } from './DocumentStateCache';

import {
  transformLspToParserPosition,
  formatPosition,
} from '../utils/positionUtils';
import { TextDocument } from 'vscode-languageserver-textdocument';

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

      // Use precise symbol resolution only for hover
      const symbolResolutionStartTime = Date.now();
      const symbol = await this.symbolManager.getSymbolAtPosition(
        params.textDocument.uri,
        parserPosition,
        'precise',
      );
      const symbolResolutionTime = Date.now() - symbolResolutionStartTime;

      if (symbol) {
        // Symbol found - return hover information
        this.logger.debug(
          () =>
            `Found symbol: ${symbol.name} (${symbol.kind}) at position ` +
            `${parserPosition.line}:${parserPosition.character}`,
        );

        const hoverCreationStartTime = Date.now();
        const hover = await this.createHoverInformation(symbol);
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

      // No symbol found - check if TypeReference exists OR if we should try enrichment
      // Note: Assignment LHS references may be suppressed, so we should try enrichment
      // even when no references are found if we're at a lower detail level
      if (references && references.length > 0) {
        // TypeReference exists but no symbol = unresolved identifier
        // This could be because SymbolTable needs enrichment (private/protected symbols)
        // or it's a cross-file reference

        this.logger.debug(
          () =>
            '[HOVER] TypeReference exists but no symbol found. ' +
            `layerEnrichmentService: ${this.layerEnrichmentService ? 'present' : 'missing'}`,
        );

        // FIRST: Try enriching the SymbolTable if it's at a lower detail level
        if (this.layerEnrichmentService) {
          try {
            const cache = getDocumentStateCache();
            const storage = ApexStorageManager.getInstance().getStorage();
            const document = await storage.getDocument(params.textDocument.uri);

            this.logger.debug(
              () =>
                `[HOVER] Document retrieved: ${document ? 'yes' : 'no'} for ${params.textDocument.uri}`,
            );

            if (document) {
              const currentLevel = cache.getDetailLevel(
                params.textDocument.uri,
                document.version,
              );

              this.logger.debug(
                () =>
                  `[HOVER] Current detail level for ${params.textDocument.uri}: ${
                    currentLevel || 'unknown (assuming public-api)'
                  }`,
              );

              // If we're at 'public-api' or 'protected' level (or null/unknown,
              // which likely means public-api from workspace batch)
              // and need to find a symbol, enrich to 'private'
              if (
                currentLevel === null ||
                currentLevel === 'public-api' ||
                currentLevel === 'protected'
              ) {
                this.logger.debug(
                  () =>
                    `Enriching ${params.textDocument.uri} from ${currentLevel} to private for hover resolution`,
                );

                // Enrich synchronously (await) so we can retry immediately
                await this.layerEnrichmentService.enrichFiles(
                  [params.textDocument.uri],
                  'private',
                  'same-file',
                );

                // Retry symbol resolution after enrichment
                const symbolAfterEnrichment =
                  await this.symbolManager.getSymbolAtPosition(
                    params.textDocument.uri,
                    parserPosition,
                    'precise',
                  );

                if (symbolAfterEnrichment) {
                  this.logger.debug(
                    () =>
                      `Found symbol after enrichment: ${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`,
                  );

                  const hoverCreationStartTime = Date.now();
                  const hover = await this.createHoverInformation(
                    symbolAfterEnrichment,
                  );
                  const hoverCreationTime = Date.now() - hoverCreationStartTime;
                  const totalTime = Date.now() - hoverStartTime;

                  if (totalTime > 50) {
                    this.logger.debug(
                      () =>
                        `[HOVER-DIAG] Hover completed after enrichment in ${totalTime}ms ` +
                        `(keyword=${keywordCheckTime}ms, references=${referencesTime}ms, ` +
                        `fileSymbols=${fileSymbolsTime}ms, symbolResolution=${symbolResolutionTime}ms, ` +
                        `hoverCreation=${hoverCreationTime}ms)`,
                    );
                  }

                  return hover;
                } else {
                  this.logger.debug(
                    () =>
                      `Symbol still not found after enriching ${params.textDocument.uri} to private level`,
                  );
                }
              }
            }
          } catch (error) {
            this.logger.debug(
              () => `Error enriching SymbolTable for hover: ${error}`,
            );
          }
        }

        // If enrichment didn't help, fall back to missing artifact resolution
        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return (
            `No symbol found but TypeReference exists at parser position ${parserPos} ` +
            '- triggering missing artifact resolution'
          );
        });

        // Check if missing artifact resolution is enabled
        const settings = ApexSettingsManager.getInstance().getSettings();
        if (settings?.apex?.findMissingArtifact?.enabled) {
          // Initiate background resolution for missing artifact
          this.missingArtifactUtils.tryResolveMissingArtifactBackground(
            params.textDocument.uri,
            params.position,
            'hover',
          );

          // Return immediate feedback to user that we're searching
          const hoverCreationStartTime = Date.now();
          const searchingHover = await this.createSearchingHover(params);
          const hoverCreationTime = Date.now() - hoverCreationStartTime;
          const totalTime = Date.now() - hoverStartTime;

          if (totalTime > 50 || symbolResolutionTime > 30) {
            this.logger.debug(
              () =>
                `[HOVER-DIAG] Missing artifact hover completed in ${totalTime}ms ` +
                `(keyword=${keywordCheckTime}ms, references=${referencesTime}ms, ` +
                `fileSymbols=${fileSymbolsTime}ms, symbolResolution=${symbolResolutionTime}ms, ` +
                `hoverCreation=${hoverCreationTime}ms)`,
            );
          }

          return searchingHover;
        }

        // If missing artifact resolution is disabled, return null
        const totalTime = Date.now() - hoverStartTime;
        if (totalTime > 50) {
          this.logger.debug(
            () =>
              '[HOVER-DIAG] Hover returned null (missing artifact disabled) ' +
              `in ${totalTime}ms (symbolResolution=${symbolResolutionTime}ms)`,
          );
        }
        return null;
      } else if (!symbol && this.layerEnrichmentService) {
        // No references found but no symbol either - could be assignment LHS or other suppressed reference
        // Try enrichment if we're at a lower detail level
        try {
          const cache = getDocumentStateCache();
          const storage = ApexStorageManager.getInstance().getStorage();
          const document = await storage.getDocument(params.textDocument.uri);

          this.logger.debug(
            () =>
              '[HOVER] No references found at position, ' +
              `checking if enrichment needed. Document retrieved: ${
                document ? 'yes' : 'no'
              }`,
          );

          if (document) {
            const currentLevel = cache.getDetailLevel(
              params.textDocument.uri,
              document.version,
            );

            this.logger.debug(
              () =>
                `[HOVER] Current detail level for ${params.textDocument.uri}: ` +
                `${currentLevel || 'unknown (assuming public-api)'}`,
            );

            // If we're at 'public-api' or 'protected' level (or null/unknown), try enriching
            // This helps with assignment LHS and other cases where references might be suppressed
            if (
              currentLevel === null ||
              currentLevel === 'public-api' ||
              currentLevel === 'protected'
            ) {
              this.logger.debug(
                () =>
                  `Enriching ${params.textDocument.uri} from ` +
                  `${currentLevel || 'unknown'} to private for hover resolution ` +
                  '(no references found)',
              );

              // Enrich synchronously (await) so we can retry immediately
              await this.layerEnrichmentService.enrichFiles(
                [params.textDocument.uri],
                'private',
                'same-file',
              );

              // Retry symbol resolution after enrichment
              const symbolAfterEnrichment =
                await this.symbolManager.getSymbolAtPosition(
                  params.textDocument.uri,
                  parserPosition,
                  'precise',
                );

              this.logger.debug(
                () =>
                  `After enrichment, getSymbolAtPosition returned: ${
                    symbolAfterEnrichment
                      ? `${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`
                      : 'null'
                  }`,
              );

              if (symbolAfterEnrichment) {
                this.logger.debug(
                  () =>
                    `Found symbol after enrichment: ${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`,
                );

                const hoverCreationStartTime = Date.now();
                const hover = await this.createHoverInformation(
                  symbolAfterEnrichment,
                );
                const hoverCreationTime = Date.now() - hoverCreationStartTime;
                const totalTime = Date.now() - hoverStartTime;

                if (totalTime > 50) {
                  this.logger.debug(
                    () =>
                      '[HOVER-DIAG] Hover completed after enrichment ' +
                      `in ${totalTime}ms (keyword=${keywordCheckTime}ms, ` +
                      `references=${referencesTime}ms, ` +
                      `fileSymbols=${fileSymbolsTime}ms, ` +
                      `symbolResolution=${symbolResolutionTime}ms, ` +
                      `hoverCreation=${hoverCreationTime}ms)`,
                  );
                }

                return hover;
              } else {
                // Even after enrichment, no symbol found via getSymbolAtPosition
                // This might be a declaration (method/field name) with no references
                // Check symbols directly by identifierRange match
                const symbolsInFile = this.symbolManager.findSymbolsInFile(
                  params.textDocument.uri,
                );
                this.logger.debug(
                  () =>
                    `Checking ${symbolsInFile.length} symbols for identifierRange match ` +
                    `at position ${parserPosition.line}:${parserPosition.character}`,
                );
                for (const candidateSymbol of symbolsInFile) {
                  if (candidateSymbol.location?.identifierRange) {
                    const idRange = candidateSymbol.location.identifierRange;
                    const matches = this.isPositionInRange(
                      parserPosition,
                      idRange,
                    );
                    this.logger.debug(
                      () =>
                        `Symbol ${candidateSymbol.name} (${candidateSymbol.kind}): ` +
                        `identifierRange=${idRange.startLine}:${idRange.startColumn}-` +
                        `${idRange.endLine}:${idRange.endColumn}, ` +
                        `position=${parserPosition.line}:${parserPosition.character}, ` +
                        `matches=${matches}`,
                    );
                    if (matches) {
                      // Found a declaration symbol at this position
                      this.logger.debug(
                        () =>
                          'Found declaration symbol after enrichment: ' +
                          `${candidateSymbol.name} (${candidateSymbol.kind}) ` +
                          `at position ${parserPosition.line}:${parserPosition.character}`,
                      );
                      const hoverCreationStartTime = Date.now();
                      const hover =
                        await this.createHoverInformation(candidateSymbol);
                      const hoverCreationTime =
                        Date.now() - hoverCreationStartTime;
                      const totalTime = Date.now() - hoverStartTime;
                      if (totalTime > 50) {
                        this.logger.debug(
                          () =>
                            '[HOVER-DIAG] Hover completed for declaration ' +
                            `after enrichment in ${totalTime}ms ` +
                            `(hoverCreation=${hoverCreationTime}ms)`,
                        );
                      }
                      return hover;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          this.logger.debug(
            () => `Error enriching SymbolTable for hover: ${error}`,
          );
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
   */
  private async createHoverInformation(symbol: ApexSymbol): Promise<Hover> {
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
      const returnType = symbol.returnType?.name ?? 'void';
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${p.type?.name ?? 'any'} ${p.name}`)
        .join(', ');
      const methodName = fqn || symbol.name;
      content.push(`${returnType} ${methodName}(${paramsSig})`);
    } else if (isConstructorSymbol(symbol)) {
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${p.type?.name ?? 'any'} ${p.name}`)
        .join(', ');
      const ctorName = fqn || symbol.name;
      content.push(`${ctorName}(${paramsSig})`);
    } else if (isClassSymbol(symbol)) {
      content.push(`class ${fqn || symbol.name}`);
    } else if (isInterfaceSymbol(symbol)) {
      content.push(`interface ${fqn || symbol.name}`);
    } else if (isEnumSymbol(symbol)) {
      content.push(`enum ${fqn || symbol.name}`);
    } else if (isTriggerSymbol(symbol)) {
      content.push(`trigger ${fqn || symbol.name}`);
    } else if (isVariableSymbol(symbol)) {
      const variableSymbol = symbol as VariableSymbol;
      const type = variableSymbol.type?.name ?? 'unknown';
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
          content.push(`**Type:** ${variableSymbol.type.name}`);
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
}
