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
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  TypeReference,
  ReferenceContext,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { Position } from 'vscode-languageserver-protocol';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  transformLspToParserPosition,
  formatPosition,
} from '../utils/positionUtils';

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
 */
export class HoverProcessingService implements IHoverProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    // Use the real symbol manager from ApexSymbolProcessingManager, not the factory
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a hover request
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async processHover(params: HoverParams): Promise<Hover | null> {
    this.logger.debug(
      () =>
        `Processing hover for ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
    );

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Get the document
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        this.logger.warn(
          () => `Document not found: ${params.textDocument.uri}`,
        );
        return null;
      }

      this.logger.debug(
        () =>
          `Document found: ${document.uri}, length: ${document.getText().length}`,
      );

      // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
      const parserPosition = transformLspToParserPosition(params.position);

      this.logger.debug(
        () =>
          `Transformed position from LSP ${formatPosition(
            params.position,
            'lsp',
          )} to parser ${formatPosition(parserPosition, 'parser')}`,
      );

      // Get the symbol at the position using enhanced resolution with strategy
      let symbol = this.symbolManager.getSymbolAtPositionWithStrategy(
        document.uri,
        parserPosition,
        'hover',
      );

      if (!symbol) {
        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return `No symbol found at parser position ${parserPos}. Attempting cross-file resolution fallback...`;
        });

        // Minimal fallback: try resolving via TypeReferences at the exact position
        try {
          const typeRefs = this.symbolManager.getReferencesAtPosition(
            document.uri,
            parserPosition,
          );
          if (Array.isArray(typeRefs) && typeRefs.length > 0) {
            const order = [
              ReferenceContext.FIELD_ACCESS,
              ReferenceContext.METHOD_CALL,
              ReferenceContext.CLASS_REFERENCE,
              ReferenceContext.TYPE_DECLARATION,
              ReferenceContext.CONSTRUCTOR_CALL,
              ReferenceContext.VARIABLE_USAGE,
              ReferenceContext.PARAMETER_TYPE,
            ];
            const sorted = typeRefs.slice().sort((a: any, b: any) => {
              const aPri = order.indexOf(a.context);
              const bPri = order.indexOf(b.context);
              if (aPri !== bPri) return aPri - bPri;
              const aSize =
                (a.location.endLine - a.location.startLine) * 1000 +
                (a.location.endColumn - a.location.startColumn);
              const bSize =
                (b.location.endLine - b.location.startLine) * 1000 +
                (b.location.endColumn - b.location.startColumn);
              return aSize - bSize;
            });

            const bestRef = sorted[0];
            let candidates = this.symbolManager.findSymbolByName(bestRef.name);

            // Narrow by context
            if (bestRef.context === ReferenceContext.METHOD_CALL) {
              candidates = candidates.filter((s: any) => s.kind === 'method');
            } else if (bestRef.context === ReferenceContext.FIELD_ACCESS) {
              candidates = candidates.filter(
                (s: any) => s.kind === 'field' || s.kind === 'property',
              );
            } else if (
              bestRef.context === ReferenceContext.CLASS_REFERENCE ||
              bestRef.context === ReferenceContext.TYPE_DECLARATION
            ) {
              candidates = candidates.filter((s: any) => s.kind === 'class');
            }

            // If qualifier exists, prefer symbols whose containing type matches
            if (bestRef.qualifier && candidates.length > 0) {
              const qualified = candidates.filter((s: any) => {
                const containing = this.symbolManager.getContainingType(s);
                return containing && containing.name === bestRef.qualifier;
              });
              if (qualified.length > 0) {
                candidates = qualified;
              }
            }

            if (candidates.length > 0) {
              const picked = candidates[0];
              return this.createHoverInformation(picked, 0.9);
            }
          }
        } catch (_e) {
          // ignore and proceed to legacy fallbacks below
        }

        // Legacy token-based lookup fallback
        const fallbackContext =
          this.symbolManager.createResolutionContextWithRequestType(
            document.getText(),
            parserPosition,
            document.uri,
            'hover',
          );

        const tokenInfo = this.extractTokenInfo(document, params.position);
        if (tokenInfo && tokenInfo.word) {
          this.logger.debug(() => {
            const qualifierMsg = tokenInfo.qualifier
              ? ` with qualifier '${tokenInfo.qualifier}'`
              : '';
            return `Fallback token-based lookup for word '${tokenInfo.word}'${qualifierMsg}`;
          });

          let candidates = this.symbolManager.findSymbolByName(tokenInfo.word);
          if (candidates && candidates.length > 0) {
            // Prefer cross-file candidates first
            let filtered = candidates.filter(
              (s: any) => `file://${s.filePath}` !== document.uri,
            );

            // Narrow by context
            if (tokenInfo.isMethodContext) {
              filtered = filtered.filter((s: any) => s.kind === 'method');
              if (tokenInfo.qualifier) {
                filtered = filtered.filter((s: any) => {
                  const containing = this.symbolManager.getContainingType(s);
                  return containing && containing.name === tokenInfo.qualifier;
                });
              }
            } else if (tokenInfo.isTypeOrClassContext) {
              filtered = filtered.filter((s: any) => s.kind === 'class');
            }

            if (filtered.length === 0) {
              filtered = candidates;
            }

            if (filtered.length > 0) {
              const best = this.resolveBestSymbol(filtered, fallbackContext);
              if (best) {
                this.logger.debug(
                  () =>
                    `Using token-based fallback symbol: ${best.symbol.name} (${best.symbol.kind})`,
                );
                return this.createHoverInformation(
                  best.symbol,
                  best.confidence,
                );
              }
            }
          }
        }

        // Secondary: reference-based cross-file resolution
        const crossFileSymbols = this.findCrossFileSymbols(
          document,
          params.position,
          fallbackContext,
        );

        if (crossFileSymbols && crossFileSymbols.length > 0) {
          const filtered = this.filterSymbolsByContext(
            crossFileSymbols,
            fallbackContext,
          );
          const best = this.resolveBestSymbol(filtered, fallbackContext);
          if (best) {
            this.logger.debug(
              () =>
                `Using fallback cross-file symbol: ${best.symbol.name} (${best.symbol.kind})`,
            );
            return this.createHoverInformation(best.symbol, best.confidence);
          }
        }

        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return `No symbol found at parser position ${parserPos}`;
        });
        return null;
      }

      // Token-based correction if name under cursor disagrees with selected symbol
      const primaryTokenInfo = this.extractTokenInfo(document, params.position);
      if (
        primaryTokenInfo &&
        primaryTokenInfo.word &&
        symbol &&
        symbol.name !== primaryTokenInfo.word
      ) {
        this.logger.debug(() => {
          const token = primaryTokenInfo.word;
          const name = symbol!.name;
          return `Primary symbol '${name}' mismatches token '${token}'. Attempting token-based correction.`;
        });

        const correctionContext =
          this.symbolManager.createResolutionContextWithRequestType(
            document.getText(),
            parserPosition,
            document.uri,
            'hover',
          );

        let candidates = this.symbolManager.findSymbolByName(
          primaryTokenInfo.word,
        );
        if (candidates && candidates.length > 0) {
          // Prefer cross-file matches first
          let filtered = candidates.filter(
            (s: any) => `file://${s.filePath}` !== document.uri,
          );

          if (primaryTokenInfo.isMethodContext) {
            filtered = filtered.filter((s: any) => s.kind === 'method');
            if (primaryTokenInfo.qualifier) {
              filtered = filtered.filter((s: any) => {
                const containing = this.symbolManager.getContainingType(s);
                return (
                  containing && containing.name === primaryTokenInfo.qualifier
                );
              });
            }
          } else if (primaryTokenInfo.isTypeOrClassContext) {
            filtered = filtered.filter((s: any) => s.kind === 'class');
          }

          if (filtered.length === 0) {
            filtered = candidates;
          }

          if (filtered.length > 0) {
            const best = this.resolveBestSymbol(filtered, correctionContext);
            if (best) {
              this.logger.debug(
                () =>
                  `Token-based correction selected symbol: ${best.symbol.name} (${best.symbol.kind})`,
              );
              symbol = best.symbol;
            }
          }
        }
      }

      // Parser now handles precise dotted and cross-file resolution; no additional correction needed.

      this.logger.debug(
        () => `Found symbol: ${symbol!.name} (${symbol!.kind})`,
      );

      // Create enhanced resolution context for better accuracy
      const context = this.symbolManager.createResolutionContextWithRequestType(
        document.getText(),
        parserPosition,
        document.uri,
        'hover',
      );

      // Use strategy-based resolution for confidence scoring
      const resolutionResult =
        await this.symbolManager.resolveSymbolWithStrategy(
          {
            type: 'hover',
            position: {
              line: parserPosition.line,
              column: parserPosition.character,
            },
          },
          context,
        );

      // Create hover information with confidence from resolution strategy
      const confidence = resolutionResult.success ? 0.9 : 0.5;

      this.logger.debug(
        () =>
          `About to create hover information for symbol: ${symbol!.name} with confidence: ${confidence}`,
      );

      const hover = await this.createHoverInformation(symbol!, confidence);

      this.logger.debug(
        () => `Hover creation result: ${hover ? 'success' : 'null'}`,
      );

      return hover;
    } catch (error) {
      this.logger.error(() => `Error processing hover: ${error}`);
      return null;
    }
  }

  /**
   * Extract token information at a given position (word, qualifier, context hints)
   */
  private extractTokenInfo(
    document: TextDocument,
    position: Position,
  ): {
    word: string;
    qualifier?: string;
    isMethodContext: boolean;
    isTypeOrClassContext: boolean;
  } | null {
    try {
      const text = document.getText();
      const offset = document.offsetAt(position);

      // Find token bounds
      let word = '';
      let start = offset;
      let end = offset;

      // Expand left
      while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) start--;
      // Expand right
      while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end++;

      if (end > start) {
        word = text.substring(start, end);
      }

      if (!word) return null;

      // Look for qualifier pattern like Qualifier.word (e.g., FileUtilities.createFile)
      let qualifier: string | undefined;
      let isMethodContext = false;
      let isTypeOrClassContext = false;

      // Look back for dot and previous identifier
      const before = text.substring(0, start);
      const dotIndex = before.lastIndexOf('.');
      if (dotIndex !== -1) {
        // identifier before dot
        let qEnd = dotIndex;
        let qStart = qEnd - 1;
        while (qStart >= 0 && /[A-Za-z0-9_]/.test(text[qStart])) qStart--;
        qStart++;
        if (qStart < qEnd) {
          qualifier = text.substring(qStart, qEnd);
        }
      }

      // Heuristics: if the next non-space char after the word is '(', we are in method context
      let idx = end;
      while (idx < text.length && /\s/.test(text[idx])) idx++;
      if (idx < text.length && text[idx] === '(') {
        isMethodContext = true;
      }

      // If previous non-space token is 'new' or we are at a class decl line
      let pidx = start - 1;
      while (pidx >= 0 && /\s/.test(text[pidx])) pidx--;
      const prevSlice = text.substring(Math.max(0, pidx - 20), start);
      if (/\bclass\b/.test(prevSlice) || /\bnew\b/.test(prevSlice)) {
        isTypeOrClassContext = true;
      }

      return { word, qualifier, isMethodContext, isTypeOrClassContext };
    } catch {
      return null;
    }
  }

  /**
   * Find symbols across all files when no symbols found in current file
   * Uses parser package's TypeReference data for precise cross-file resolution
   */
  private findCrossFileSymbols(
    document: TextDocument,
    position: any,
    context: any,
  ): any[] | null {
    try {
      // Transform LSP position to parser position
      const parserPosition = transformLspToParserPosition(position);

      this.logger.debug(
        () =>
          `Searching for cross-file symbols at parser position ${formatPosition(
            parserPosition,
            'parser',
          )}`,
      );

      // Use parser package's TypeReference data for precise cross-file resolution
      const typeReferences = this.symbolManager.getReferencesAtPosition(
        document.uri,
        parserPosition,
      );

      if (typeReferences && typeReferences.length > 0) {
        this.logger.debug(
          () =>
            `Found ${typeReferences.length} TypeReference objects for cross-file resolution`,
        );

        // Use TypeReference data for cross-file resolution
        const symbolsFromReferences =
          this.resolveCrossFileSymbolsFromReferences(
            typeReferences,
            document.uri,
            context,
          );

        if (symbolsFromReferences.length > 0) {
          this.logger.debug(
            () =>
              `Resolved ${symbolsFromReferences.length} cross-file symbols using TypeReference data`,
          );
          return symbolsFromReferences;
        }
      }

      // Fallback: Use symbol manager's cross-file lookup
      this.logger.debug(
        () => 'Falling back to symbol manager cross-file lookup',
      );

      // Use available methods from ISymbolManager interface
      const allSymbols = this.symbolManager.getAllSymbolsForCompletion();
      const crossFileSymbols = allSymbols.filter(
        (symbol: any) => symbol.filePath !== document.uri,
      );

      if (crossFileSymbols && crossFileSymbols.length > 0) {
        this.logger.debug(
          () =>
            `Found ${crossFileSymbols.length} cross-file symbols via fallback`,
        );
        return crossFileSymbols;
      }

      this.logger.debug(() => 'No cross-file symbols found');
      return null;
    } catch (error) {
      this.logger.error(
        () => `Error in cross-file symbol resolution: ${error}`,
      );
      return null;
    }
  }

  /**
   * Resolve cross-file symbols from TypeReference data
   * This provides more precise resolution than generic cross-file lookup
   */
  private resolveCrossFileSymbolsFromReferences(
    typeReferences: TypeReference[],
    sourceFile: string,
    context: any,
  ): any[] {
    const resolvedSymbols: any[] = [];

    for (const ref of typeReferences) {
      try {
        // Use available methods from ISymbolManager interface
        // Try to find symbols by name that match the TypeReference
        const foundSymbols = this.symbolManager.findSymbolByName(ref.name);

        if (foundSymbols && foundSymbols.length > 0) {
          // Filter out symbols from the current file (we want cross-file only)
          const crossFileSymbols = foundSymbols.filter(
            (symbol: any) => symbol.filePath !== sourceFile,
          );

          if (crossFileSymbols.length > 0) {
            // Add context information from TypeReference
            const enhancedSymbols = crossFileSymbols.map((symbol: any) => ({
              ...symbol,
              _typeReference: ref,
              _context: ref.context,
              _qualifier: ref.qualifier,
              _isCrossFile: true,
            }));

            resolvedSymbols.push(...enhancedSymbols);

            this.logger.debug(
              () =>
                `Enhanced cross-file symbol ${ref.name} with TypeReference context: ${ReferenceContext[ref.context]}`,
            );
          }
        }
      } catch (error) {
        this.logger.debug(
          () => `Error resolving TypeReference ${ref.name}: ${error}`,
        );
      }
    }

    return resolvedSymbols;
  }

  /**
   * Filter symbols by context to determine if they're appropriate
   * Simplified to use basic symbol kind filtering
   */
  private filterSymbolsByContext(symbols: any[], context: any): any[] {
    // Simple filtering based on symbol kinds
    const hasClassSymbol = symbols.some((s) => s.kind === 'class');
    const hasVariableSymbol = symbols.some((s) => s.kind === 'variable');
    const hasMethodSymbol = symbols.some((s) => s.kind === 'method');

    // If we have variables but no classes, prefer classes and methods
    if (hasVariableSymbol && !hasClassSymbol && !hasMethodSymbol) {
      this.logger.debug(
        () => 'Filtering out variables in favor of classes/methods',
      );
      return symbols.filter((s) => s.kind !== 'variable');
    }

    return symbols;
  }

  /**
   * Resolve the best symbol when multiple candidates exist at the same position
   * Uses parser package's symbol resolution for consistency and accuracy
   */
  private resolveBestSymbol(
    symbols: any[],
    context: any,
  ): { symbol: any; confidence: number } | null {
    if (symbols.length === 1) {
      return { symbol: symbols[0], confidence: 0.9 };
    }

    // Use parser package's symbol resolution for multiple candidates
    let bestSymbol = symbols[0];
    let bestConfidence = 0.5;

    for (const symbol of symbols) {
      // Use the symbol manager's context-aware resolution
      const resolutionResult = this.symbolManager.resolveSymbol(
        symbol.name,
        context,
      );

      let confidence = resolutionResult.confidence || 0.5;

      // Special case: In method call context, prioritize cross-file class references
      // This ensures that "FileUtilities.createFile" hovers on "FileUtilities" class, not local method
      const isCrossFileClassInMethodCall =
        symbol.kind === 'class' &&
        symbol.filePath !== context.sourceFile?.replace('file://', '') &&
        context.currentScope === 'method';

      if (isCrossFileClassInMethodCall) {
        this.logger.debug(
          () =>
            `Found cross-file class ${symbol.name} in method context - giving priority`,
        );
        bestSymbol = symbol;
        bestConfidence = confidence;
      } else if (confidence > bestConfidence) {
        // Only update if not a cross-file class in method context
        bestSymbol = symbol;
        bestConfidence = confidence;
      }

      this.logger.debug(
        () =>
          `Symbol ${symbol.name} (${symbol.kind}) confidence: ${confidence}`,
      );
    }

    this.logger.debug(
      () =>
        `Resolved best symbol: ${bestSymbol.name} (confidence: ${bestConfidence})`,
    );

    return { symbol: bestSymbol, confidence: bestConfidence };
  }

  /**
   * Create resolution context for symbol lookup
   * Uses the parser package's context analysis for consistency and accuracy
   */
  private createResolutionContext(document: TextDocument, params: HoverParams) {
    return this.symbolManager.createResolutionContext(
      document.getText(),
      params.position,
      document.uri,
    );
  }

  /**
   * Create hover information for a symbol
   */
  private async createHoverInformation(
    symbol: any,
    confidence: number,
  ): Promise<Hover> {
    const content: string[] = [];

    // Basic symbol information
    const kindDisplay = symbol.kind
      ? symbol.kind.charAt(0).toUpperCase() + symbol.kind.slice(1)
      : 'Symbol';
    content.push(`**${kindDisplay}** ${symbol.name}`);

    // Add FQN using parser package's hierarchical FQN construction
    let fqn = symbol.fqn;
    if (!fqn) {
      // Use the symbol manager's hierarchical FQN construction
      fqn = this.symbolManager.constructFQN(symbol);
    }

    // If FQN is still just the symbol name, try to find containing type
    if (fqn === symbol.name) {
      const containingType = this.symbolManager.getContainingType(symbol);
      if (containingType) {
        fqn = `${containingType.name}.${symbol.name}`;
      }
    }

    // Special handling for cross-class method references
    // If this is a method and the FQN doesn't include the class name,
    // and the symbol is from a different file than the current context,
    // we need to construct the FQN manually
    if (symbol.kind === 'method' && fqn === symbol.name) {
      // Try to find the class that contains this method
      const methodFile = symbol.filePath;
      if (methodFile) {
        const fileSymbols = this.symbolManager.findSymbolsInFile(methodFile);
        const containingClass = fileSymbols.find(
          (s: any) => s.kind === 'class' && s.id === symbol.parentId,
        );
        if (containingClass) {
          fqn = `${containingClass.name}.${symbol.name}`;
        }
      }
    }

    if (fqn) {
      content.push(`**FQN:** ${fqn}`);
    }

    // Add modifiers
    if (symbol.modifiers) {
      const modifiers = [];
      if (symbol.modifiers.isStatic) modifiers.push('static');
      if (symbol.modifiers.visibility)
        modifiers.push(symbol.modifiers.visibility);
      if (symbol.modifiers.isFinal) modifiers.push('final');
      if (symbol.modifiers.isAbstract) modifiers.push('abstract');
      if (modifiers.length > 0) {
        content.push(`**Modifiers:** ${modifiers.join(', ')}`);
      }
    }

    // Add type information
    if (symbol.type) {
      content.push(`**Type:** ${symbol.type.name}`);
    }

    // Add return type for methods
    if (symbol.kind === 'method' && symbol.returnType) {
      content.push(`**Returns:** ${symbol.returnType.name}`);
    }

    // Add parameters for methods
    if (
      symbol.kind === 'method' &&
      symbol.parameters &&
      symbol.parameters.length > 0
    ) {
      const params = symbol.parameters
        .map((p: any) => `${p.name}: ${p.type?.name || 'any'}`)
        .join(', ');
      content.push(`**Parameters:** ${params}`);
    }

    // Add inheritance information
    if (symbol.kind === 'class' && symbol.superClass) {
      content.push(`**Extends:** ${symbol.superClass}`);
    }

    if (
      symbol.kind === 'class' &&
      symbol.interfaces &&
      symbol.interfaces.length > 0
    ) {
      content.push(`**Implements:** ${symbol.interfaces.join(', ')}`);
    }

    if (
      symbol.kind === 'interface' &&
      symbol.interfaces &&
      symbol.interfaces.length > 0
    ) {
      content.push(`**Extends:** ${symbol.interfaces.join(', ')}`);
    }

    // Add metrics information using available methods
    try {
      const referencesTo = this.symbolManager.findReferencesTo(symbol);
      const referencesFrom = this.symbolManager.findReferencesFrom(symbol);
      const dependencyAnalysis = this.symbolManager.analyzeDependencies(symbol);
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

    // Add confidence information
    if (confidence < 1.0) {
      content.push('');
      content.push(`**Confidence:** ${(confidence * 100).toFixed(1)}%`);
    }

    // Add file location
    if (symbol.filePath) {
      content.push('');
      content.push(`**File:** ${symbol.filePath}`);
    }

    const markupContent: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: content.join('\n'),
    };

    return {
      contents: markupContent,
    };
  }
}
