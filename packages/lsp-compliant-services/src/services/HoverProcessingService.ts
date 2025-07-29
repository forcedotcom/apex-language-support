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
import { SymbolManagerFactory } from '@salesforce/apex-lsp-parser-ast';

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
  private symbolManager: any;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.symbolManager = SymbolManagerFactory.createSymbolManager();
  }

  /**
   * Process a hover request
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async processHover(params: HoverParams): Promise<Hover | null> {
    this.logger.debug(
      () => `Processing hover request for: ${params.textDocument.uri}`,
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

      // Use symbol manager to find symbols at the given position
      const symbolsAtPosition = this.findSymbolsAtPosition(
        document,
        params.position,
      );
      if (!symbolsAtPosition || symbolsAtPosition.length === 0) {
        this.logger.debug(() => 'No symbols found at position');
        return null;
      }

      // Create resolution context for disambiguation
      const context = this.createResolutionContext(document, params);

      // Resolve the best symbol using context-aware resolution
      const resolvedSymbol = this.resolveBestSymbol(symbolsAtPosition, context);
      if (!resolvedSymbol) {
        this.logger.debug(() => 'Could not resolve symbol at position');
        return null;
      }

      // Create hover information
      const hover = await this.createHoverInformation(
        resolvedSymbol.symbol,
        resolvedSymbol.confidence,
      );

      this.logger.debug(
        () => `Returning hover information for: ${resolvedSymbol.symbol.name}`,
      );

      return hover;
    } catch (error) {
      this.logger.error(() => `Error processing hover: ${error}`);
      return null;
    }
  }

  /**
   * Find symbols at the given position using symbol manager
   */
  private findSymbolsAtPosition(
    document: TextDocument,
    position: any,
  ): any[] | null {
    try {
      // Get all symbols in the current file
      const fileSymbols = this.symbolManager.findSymbolsInFile(document.uri);

      // Filter symbols that contain the position
      const symbolsAtPosition = fileSymbols.filter((symbol: any) => {
        if (!symbol.location) return false;

        const { startLine, startColumn, endLine, endColumn } = symbol.location;

        // Check if position is within symbol bounds
        if (position.line < startLine || position.line > endLine) return false;
        if (position.line === startLine && position.character < startColumn)
          return false;
        if (position.line === endLine && position.character > endColumn)
          return false;

        return true;
      });

      return symbolsAtPosition.length > 0 ? symbolsAtPosition : null;
    } catch (error) {
      this.logger.debug(() => `Error finding symbols at position: ${error}`);
      return null;
    }
  }

  /**
   * Resolve the best symbol from multiple candidates using context
   */
  private resolveBestSymbol(
    symbols: any[],
    context: any,
  ): { symbol: any; confidence: number } | null {
    if (symbols.length === 1) {
      return { symbol: symbols[0], confidence: 0.9 };
    }

    // Multiple symbols at position - use context to find the best match
    let bestSymbol = symbols[0];
    let bestConfidence = 0.5;

    for (const symbol of symbols) {
      // Try to resolve the symbol name using the symbol manager's context-aware resolution
      const resolutionResult = this.symbolManager.resolveSymbol(
        symbol.name,
        context,
      );

      if (
        resolutionResult.symbol &&
        resolutionResult.confidence > bestConfidence
      ) {
        bestSymbol = resolutionResult.symbol;
        bestConfidence = resolutionResult.confidence;
      }
    }

    return { symbol: bestSymbol, confidence: bestConfidence };
  }

  /**
   * Create resolution context for symbol lookup
   */
  private createResolutionContext(document: TextDocument, params: HoverParams) {
    const text = document.getText();

    return {
      sourceFile: document.uri,
      importStatements: this.extractImportStatements(text),
      namespaceContext: this.extractNamespaceContext(text),
      currentScope: 'current-scope', // Would be extracted from AST
      scopeChain: ['current-scope'],
      expectedType: undefined,
      parameterTypes: [],
      accessModifier: 'public' as const,
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
    };
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
    content.push(`**${symbol.kind}** ${symbol.name}`);

    // Add FQN if available
    if (symbol.fqn) {
      content.push(`**FQN:** ${symbol.fqn}`);
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

    // Add relationship statistics
    try {
      const relationshipStats = this.symbolManager.getRelationshipStats(symbol);
      if (relationshipStats.totalReferences > 0) {
        content.push('');
        content.push('**Usage Statistics:**');
        content.push(
          `- Total references: ${relationshipStats.totalReferences}`,
        );
        content.push(
          `- Relationship types: ${relationshipStats.relationshipTypeCounts.size}`,
        );

        if (relationshipStats.mostCommonRelationshipType) {
          content.push(
            `- Most common: ${relationshipStats.mostCommonRelationshipType}`,
          );
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting relationship stats: ${error}`);
    }

    // Add dependency information
    try {
      const dependencyAnalysis = this.symbolManager.analyzeDependencies(symbol);
      if (
        dependencyAnalysis.dependencies.length > 0 ||
        dependencyAnalysis.dependents.length > 0
      ) {
        content.push('');
        content.push('**Dependencies:**');
        content.push(
          `- Dependencies: ${dependencyAnalysis.dependencies.length}`,
        );
        content.push(`- Dependents: ${dependencyAnalysis.dependents.length}`);
        content.push(
          `- Impact score: ${dependencyAnalysis.impactScore.toFixed(2)}`,
        );
      }
    } catch (error) {
      this.logger.debug(() => `Error getting dependency analysis: ${error}`);
    }

    // Add metrics information
    try {
      const metrics = this.symbolManager.computeMetrics(symbol);
      content.push('');
      content.push('**Metrics:**');
      content.push(`- Reference count: ${metrics.referenceCount}`);
      content.push(`- Dependency count: ${metrics.dependencyCount}`);
      content.push(`- Cyclomatic complexity: ${metrics.cyclomaticComplexity}`);
      content.push(`- Coupling score: ${metrics.couplingScore.toFixed(2)}`);
      content.push(`- Impact score: ${metrics.impactScore.toFixed(2)}`);
      content.push(`- Lifecycle: ${metrics.lifecycleStage}`);
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

  /**
   * Extract import statements from document text
   */
  private extractImportStatements(text: string): string[] {
    const imports: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        imports.push(trimmed);
      }
    }

    return imports;
  }

  /**
   * Extract namespace context from document text
   */
  private extractNamespaceContext(text: string): string {
    // Simplified - would use AST analysis in practice
    return 'default';
  }
}
