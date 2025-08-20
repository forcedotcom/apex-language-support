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
  ApexSymbol,
  isMethodSymbol,
  isClassSymbol,
  isInterfaceSymbol,
} from '@salesforce/apex-lsp-parser-ast';

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

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    // Use the real symbol manager from ApexSymbolProcessingManager, not the factory
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a hover request using modern symbol manager capabilities
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

      let symbol = this.symbolManager.getSymbolAtPosition(
        document.uri,
        parserPosition,
        'precise',
      );

      if (!symbol) {
        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return `No symbol found at parser position ${parserPos}`;
        });
        return null;
      }

      this.logger.debug(() => `Found symbol: ${symbol.name} (${symbol.kind})`);

      const hover = await this.createHoverInformation(symbol);

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
   * Resolve cross-file symbols using TypeReference data
   * This provides precise cross-file resolution when no local symbol is found
   */
  private async resolveCrossFileSymbol(
    document: TextDocument,
    parserPosition: { line: number; character: number },
  ): Promise<any | null> {
    try {
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
          );

        if (symbolsFromReferences.length > 0) {
          this.logger.debug(
            () =>
              `Resolved ${symbolsFromReferences.length} cross-file symbols using TypeReference data`,
          );
          return symbolsFromReferences[0]; // Return the first resolved symbol
        }
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
   * Create hover information for a symbol
   */
  private async createHoverInformation(symbol: ApexSymbol): Promise<Hover> {
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
    if (symbol._typeData?.type?.name) {
      content.push(`**Type:** ${symbol._typeData?.type?.name}`);
    }

    if (isMethodSymbol(symbol)) {
      // Add return type for methods
      if (symbol.returnType) {
        content.push(`**Returns:** ${symbol.returnType.name}`);
      }

      // Add parameters for methods
      if (symbol.parameters && symbol.parameters.length > 0) {
        const params = symbol.parameters
          .map((p: any) => `${p.name}: ${p.type?.name || 'any'}`)
          .join(', ');
        content.push(`**Parameters:** ${params}`);
      }
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
