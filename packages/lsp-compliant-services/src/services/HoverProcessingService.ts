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
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  SymbolManagerFactory,
  ISymbolManager,
  TypeReference,
  ReferenceContext,
} from '@salesforce/apex-lsp-parser-ast';

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
  private symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager || SymbolManagerFactory.createSymbolManager();
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

      // Get the symbol at the position using the new getSymbolAtPosition method
      const symbol = this.symbolManager.getSymbolAtPosition(
        document.uri,
        params.position,
      );

      if (!symbol) {
        this.logger.debug(
          () =>
            `No symbol found at position ${params.position.line}:${params.position.character}`,
        );
        return null;
      }

      // Create hover information
      const hover = await this.createHoverInformation(symbol, 1.0);

      this.logger.debug(
        () => `Returning hover information for: ${symbol.name}`,
      );

      return hover;
    } catch (error) {
      this.logger.error(() => `Error processing hover: ${error}`);
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
      this.logger.debug(
        () =>
          `Searching for cross-file symbols at position ${position.line}:${position.character}`,
      );

      // Use parser package's TypeReference data for precise cross-file resolution
      const typeReferences = this.symbolManager.getReferencesAtPosition(
        document.uri,
        position,
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
        () =>
          'No TypeReference data found, using symbol manager cross-file lookup',
      );

      // For fallback, return empty array to let calling code handle
      return [];
    } catch (error) {
      this.logger.debug(() => `Error in cross-file symbol search: ${error}`);
      return null;
    }
  }

  /**
   * Resolve cross-file symbols using TypeReference data
   * Uses parser package's symbol lookup for cross-file resolution
   */
  private resolveCrossFileSymbolsFromReferences(
    typeReferences: TypeReference[],
    sourceFile: string,
    context: any,
  ): any[] {
    const resolvedSymbols: any[] = [];

    for (const ref of typeReferences) {
      try {
        // Find symbols by name that match the TypeReference
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
          () =>
            `Error resolving cross-file symbol from TypeReference ${ref.name}: ${error}`,
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
          (s) => s.kind === 'class' && s.id === symbol.parentId,
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
