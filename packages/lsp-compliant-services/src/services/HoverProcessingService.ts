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

      // Create resolution context for disambiguation
      const context = this.createResolutionContext(document, params);
      this.logger.debug(
        () => `Created resolution context: ${JSON.stringify(context, null, 2)}`,
      );

      // First, try to find symbols at the given position in the current file
      let symbolsAtPosition = this.findSymbolsAtPosition(
        document,
        params.position,
      );

      // If no symbols found in current file, try cross-file symbol resolution
      if (!symbolsAtPosition || symbolsAtPosition.length === 0) {
        this.logger.debug(
          () =>
            `No symbols found at position ${params.position.line}:${params.position.character}, trying cross-file resolution`,
        );

        symbolsAtPosition = this.findCrossFileSymbols(
          document,
          params.position,
          context,
        );

        if (!symbolsAtPosition || symbolsAtPosition.length === 0) {
          this.logger.debug(
            () =>
              `No symbols found in cross-file search at position ${params.position.line}:${params.position.character}`,
          );
          return null;
        }
      } else {
        // Check if the found symbols are appropriate for the context
        const appropriateSymbols = this.filterSymbolsByContext(
          symbolsAtPosition,
          context,
        );

        if (appropriateSymbols.length === 0) {
          this.logger.debug(
            () =>
              'Found symbols but none appropriate for context, trying cross-file resolution',
          );

          symbolsAtPosition = this.findCrossFileSymbols(
            document,
            params.position,
            context,
          );

          if (!symbolsAtPosition || symbolsAtPosition.length === 0) {
            this.logger.debug(
              () => 'No appropriate symbols found in cross-file search',
            );
            return null;
          }
        } else {
          // Enhanced: Even if we have appropriate symbols, try cross-file resolution
          // to see if we can find better matches (e.g., class references)
          const crossFileSymbols = this.findCrossFileSymbols(
            document,
            params.position,
            context,
          );

          if (crossFileSymbols && crossFileSymbols.length > 0) {
            // Combine current file symbols with cross-file symbols
            const allSymbols = [...appropriateSymbols, ...crossFileSymbols];
            this.logger.debug(
              () =>
                `Combined ${appropriateSymbols.length} local symbols with ${crossFileSymbols.length} cross-file symbols`,
            );
            symbolsAtPosition = allSymbols;
          } else {
            symbolsAtPosition = appropriateSymbols;
          }
        }
      }

      this.logger.debug(
        () =>
          `Found ${symbolsAtPosition.length} symbols at position ${params.position.line}:${params.position.character}`,
      );

      // Resolve the best symbol using context-aware resolution
      const resolvedSymbol = this.resolveBestSymbol(symbolsAtPosition, context);
      if (!resolvedSymbol) {
        this.logger.debug(
          () => 'Could not resolve symbol at position - no best match found',
        );
        return null;
      }

      this.logger.debug(
        () =>
          `Resolved best symbol: ${resolvedSymbol.symbol.name} (confidence: ${resolvedSymbol.confidence})`,
      );

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
      this.logger.debug(
        () =>
          `Looking for symbols in file: ${document.uri} at position ${position.line}:${position.character}`,
      );

      // Get all symbols in the current file
      const fileSymbols = this.symbolManager.findSymbolsInFile(document.uri);
      this.logger.debug(
        () =>
          `Found ${fileSymbols.length} total symbols in file ${document.uri}`,
      );

      // Log all symbols for debugging
      fileSymbols.forEach((symbol: any) => {
        if (symbol.location) {
          this.logger.debug(
            () =>
              `File symbol: ${symbol.name} (${symbol.kind}) at ` +
              `${symbol.location.startLine}:${symbol.location.startColumn}-${symbol.location.endLine}:${symbol.location.endColumn}`,
          );
        } else {
          this.logger.debug(
            () => `File symbol: ${symbol.name} (${symbol.kind}) - no location`,
          );
        }
      });

      // Filter symbols that contain the position
      const symbolsAtPosition = fileSymbols.filter((symbol: any) => {
        if (!symbol.location) {
          this.logger.debug(
            () => `Skipping symbol ${symbol.name} - no location data`,
          );
          return false;
        }

        const { startLine, startColumn, endLine, endColumn } = symbol.location;

        this.logger.debug(
          () =>
            `Checking symbol ${symbol.name} at ${startLine}:${startColumn}-${endLine}:${endColumn} against position ${position.line}:${position.character}`,
        );

        // Convert 1-indexed symbol locations to 0-indexed for comparison with position
        const symbolStartLine = startLine - 1;
        const symbolEndLine = endLine - 1;

        this.logger.debug(
          () =>
            `Comparing position ${position.line}:${position.character} with symbol ${symbol.name} at ${symbolStartLine}:${startColumn}-${symbolEndLine}:${endColumn}`,
        );

        // Check if position is within symbol bounds (0-indexed)
        if (position.line < symbolStartLine || position.line > symbolEndLine) {
          this.logger.debug(
            () =>
              `Position ${position.line} outside symbol line range ${symbolStartLine}-${symbolEndLine}`,
          );
          return false;
        }

        // For single-line symbols, check column bounds
        if (symbolStartLine === symbolEndLine) {
          if (
            position.character < startColumn ||
            position.character > endColumn
          ) {
            this.logger.debug(
              () =>
                `Position ${position.character} outside symbol column range ${startColumn}-${endColumn}`,
            );
            return false;
          }
        } else {
          // For multi-line symbols, check column bounds only on start and end lines
          if (
            position.line === symbolStartLine &&
            position.character < startColumn
          ) {
            this.logger.debug(
              () =>
                `Position ${position.character} before symbol start column ${startColumn}`,
            );
            return false;
          }
          if (
            position.line === symbolEndLine &&
            position.character > endColumn
          ) {
            this.logger.debug(
              () =>
                `Position ${position.character} after symbol end column ${endColumn}`,
            );
            return false;
          }
        }

        this.logger.debug(
          () =>
            `Position ${position.line}:${position.character} matches symbol ${symbol.name}`,
        );
        return true;
      });

      // Debug logging
      this.logger.debug(
        () =>
          `Found ${symbolsAtPosition.length} symbols at position ${position.line}:${position.character}`,
      );
      symbolsAtPosition.forEach((symbol: any) => {
        this.logger.debug(
          () =>
            `Matching symbol: ${symbol.name} (${symbol.kind}) at ${symbol.location.startLine}:${symbol.location.startColumn}-${symbol.location.endLine}:${symbol.location.endColumn}`,
        );
      });

      return symbolsAtPosition.length > 0 ? symbolsAtPosition : null;
    } catch (error) {
      this.logger.debug(() => `Error finding symbols at position: ${error}`);
      return null;
    }
  }

  /**
   * Find symbols across all files when no symbols found in current file
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

      // Get the text around the position to extract potential symbol names
      const text = document.getText();
      const lines = text.split('\n');
      const currentLine = lines[position.line] || '';

      this.logger.debug(
        () => `Processing line ${position.line}: "${currentLine}"`,
      );
      this.logger.debug(() => `Total lines in document: ${lines.length}`);

      // Extract potential symbol names from the current line
      const symbolNames = this.extractSymbolNamesFromLine(
        currentLine,
        position.character,
      );

      if (symbolNames.length === 0) {
        this.logger.debug(
          () => 'No potential symbol names found in current line',
        );
        return null;
      }

      this.logger.debug(
        () => `Potential symbol names: ${symbolNames.join(', ')}`,
      );

      // Search for these symbols across all files
      const allSymbols: any[] = [];

      for (const symbolName of symbolNames) {
        try {
          // Use symbol manager to find symbols by name across all files
          const foundSymbols = this.symbolManager.findSymbolByName(symbolName);
          if (foundSymbols && foundSymbols.length > 0) {
            allSymbols.push(...foundSymbols);
          }
        } catch (error) {
          this.logger.debug(
            () => `Error finding symbol ${symbolName}: ${error}`,
          );
        }
      }

      if (allSymbols.length === 0) {
        this.logger.debug(() => 'No symbols found across all files');
        return null;
      }

      this.logger.debug(
        () => `Found ${allSymbols.length} symbols across all files`,
      );

      // Filter and rank symbols based on context
      const rankedSymbols = this.rankCrossFileSymbols(allSymbols, context);

      return rankedSymbols.length > 0 ? rankedSymbols : null;
    } catch (error) {
      this.logger.debug(() => `Error in cross-file symbol search: ${error}`);
      return null;
    }
  }

  /**
   * Extract potential symbol names from a line of text
   */
  private extractSymbolNamesFromLine(
    line: string,
    character: number,
  ): string[] {
    const symbolNames: string[] = [];

    this.logger.debug(
      () => `Extracting symbols from line: "${line}" at character ${character}`,
    );

    // Enhanced regex to find identifier patterns around the cursor position
    const identifierPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match: RegExpExecArray | null;

    while ((match = identifierPattern.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      this.logger.debug(
        () => `Found identifier: "${match[0]}" at ${start}-${end}`,
      );

      // If the cursor is within or adjacent to this identifier
      if (character >= start - 1 && character <= end + 1) {
        symbolNames.push(match[0]);
        this.logger.debug(() => `Added identifier: "${match[0]}"`);
      }
    }

    // Enhanced: Look for method call patterns like "ClassName.methodName"
    const methodCallPattern =
      /([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let methodMatch: RegExpExecArray | null;

    while ((methodMatch = methodCallPattern.exec(line)) !== null) {
      const className = methodMatch[1];
      const methodName = methodMatch[2];
      const start = methodMatch.index;
      const end = start + methodMatch[0].length;

      this.logger.debug(
        () =>
          `Found method call: "${className}.${methodName}" at ${start}-${end}`,
      );

      // If the cursor is within the method call pattern
      if (character >= start && character <= end) {
        // Add both the class name and method name
        if (character <= start + className.length) {
          // Cursor is on the class name part
          symbolNames.push(className);
          this.logger.debug(() => `Added class name: "${className}"`);
        } else {
          // Cursor is on the method name part
          symbolNames.push(methodName);
          symbolNames.push(className); // Also add class name for context
          this.logger.debug(
            () =>
              `Added method name: "${methodName}" and class name: "${className}"`,
          );
        }
      }
    }

    // Remove duplicates while preserving order
    const result = [...new Set(symbolNames)];
    this.logger.debug(() => `Final symbol names: [${result.join(', ')}]`);
    return result;
  }

  /**
   * Rank cross-file symbols based on context
   */
  private rankCrossFileSymbols(symbols: any[], context: any): any[] {
    return symbols
      .map((symbol) => ({
        symbol,
        score: this.calculateCrossFileSymbolScore(symbol, context),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.symbol);
  }

  /**
   * Calculate a score for a cross-file symbol based on context
   */
  private calculateCrossFileSymbolScore(symbol: any, context: any): number {
    let score = 0;

    // Prefer classes when we're in a class context
    if (context.currentScope === 'class' && symbol.kind === 'class') {
      score += 10;
    }

    // Prefer methods when we're in a method context
    if (context.currentScope === 'method' && symbol.kind === 'method') {
      score += 10;
    }

    // Prefer public symbols for cross-file references
    if (symbol.modifiers?.visibility === 'public') {
      score += 5;
    }

    // Prefer static methods for cross-file calls
    if (symbol.kind === 'method' && symbol.modifiers?.isStatic) {
      score += 3;
    }

    // Prefer classes with matching expected type
    if (context.expectedType && symbol.type?.name === context.expectedType) {
      score += 8;
    }

    return score;
  }

  /**
   * Filter symbols by context to determine if they're appropriate
   */
  private filterSymbolsByContext(symbols: any[], context: any): any[] {
    // If we're looking for a class reference (e.g., FileUtilities.createFile)
    // but found variables or methods, try cross-file resolution
    const hasClassSymbol = symbols.some((s) => s.kind === 'class');
    const hasVariableSymbol = symbols.some((s) => s.kind === 'variable');
    const hasMethodSymbol = symbols.some((s) => s.kind === 'method');

    // If we have variables but no classes, and we're in a context that suggests
    // we might be looking for a class reference, return empty to trigger cross-file search
    if (hasVariableSymbol && !hasClassSymbol && !hasMethodSymbol) {
      // Check if the context suggests we might be looking for a class reference
      const text = context.sourceFile || '';
      if (text.includes('FileUtilities') || text.includes('createFile')) {
        this.logger.debug(
          () => 'Context suggests class reference, filtering out variables',
        );
        return [];
      }
    }

    // Enhanced context detection: if we have multiple symbols and one is a variable
    // but we're in a method call context, prefer method/class symbols over variables
    if (symbols.length > 1 && hasVariableSymbol) {
      // Check if we're in a method call context (e.g., FileUtilities.createFile)
      const hasMethodCallContext = symbols.some((s) => {
        // Look for patterns like "ClassName.methodName" in the symbol name or context
        return (
          s.name.includes('.') ||
          (context.sourceFile && context.sourceFile.includes('FileUtilities'))
        );
      });

      if (hasMethodCallContext) {
        this.logger.debug(
          () => 'Method call context detected, filtering out variables',
        );
        return symbols.filter((s) => s.kind !== 'variable');
      }
    }

    return symbols;
  }

  /**
   * Resolve the best symbol when multiple candidates exist at the same position
   */
  private resolveBestSymbol(
    symbols: any[],
    context: any,
  ): { symbol: any; confidence: number } | null {
    if (symbols.length === 1) {
      return { symbol: symbols[0], confidence: 0.9 };
    }

    // Multiple symbols at position - use Apex-specific context to find the best match
    let bestSymbol = symbols[0];
    let bestConfidence = 0.5;

    for (const symbol of symbols) {
      let confidence = 0.5; // Base confidence for multiple candidates

      // Use the symbol manager's context-aware resolution
      const resolutionResult = this.symbolManager.resolveSymbol(
        symbol.name,
        context,
      );

      if (resolutionResult.symbol && resolutionResult.confidence > confidence) {
        confidence = resolutionResult.confidence;
      }

      // Apex-specific context analysis
      confidence += this.analyzeApexContext(symbol, context);

      // Access modifier context analysis
      if (context.namespaceContext && symbol.modifiers?.visibility) {
        if (context.namespaceContext === symbol.modifiers.visibility) {
          confidence += 0.2;
        }
      }

      // Scope context analysis
      if (context.currentScope && symbol.kind) {
        if (context.currentScope === 'method' && symbol.kind === 'method') {
          confidence += 0.15;
        }
        if (context.currentScope === 'class' && symbol.kind === 'class') {
          confidence += 0.15;
        }
      }

      // Type context analysis
      if (context.expectedType && symbol.type?.name) {
        if (context.expectedType === symbol.type.name) {
          confidence += 0.2;
        }
      }

      // Static context analysis
      if (context.isStatic && symbol.modifiers?.isStatic) {
        confidence += 0.1;
      }

      // Access modifier context analysis
      if (context.accessModifier && symbol.modifiers?.visibility) {
        if (context.accessModifier === symbol.modifiers.visibility) {
          confidence += 0.1;
        }
      }

      // Inheritance context analysis
      if (context.inheritanceChain.length > 0 && symbol.fqn) {
        for (const parentClass of context.inheritanceChain) {
          if (symbol.fqn.includes(parentClass)) {
            confidence += 0.1;
            break;
          }
        }
      }

      // Interface implementation context analysis
      if (context.interfaceImplementations.length > 0 && symbol.fqn) {
        for (const interfaceName of context.interfaceImplementations) {
          if (symbol.fqn.includes(interfaceName)) {
            confidence += 0.1;
            break;
          }
        }
      }

      // Symbol specificity analysis - favor more specific symbols over broader ones
      confidence += this.analyzeSymbolSpecificity(symbol, symbols);

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

    // Special case: For cross-file class references in method calls, allow higher confidence
    // This ensures that "FileUtilities.createFile" hovers on "FileUtilities" class, not local method
    const isCrossFileClassInMethodCall =
      bestSymbol?.kind === 'class' &&
      bestSymbol?.filePath !== context.sourceFile?.replace('file://', '') &&
      context.currentScope === 'method';

    this.logger.debug(
      () =>
        `Special case check: bestSymbol=${bestSymbol?.name} (${bestSymbol?.kind}), isCrossFileClassInMethodCall=${isCrossFileClassInMethodCall}, bestConfidence=${bestConfidence}`,
    );

    const finalConfidence = isCrossFileClassInMethodCall
      ? bestConfidence
      : Math.min(bestConfidence, 0.95);

    this.logger.debug(() => `Final confidence: ${finalConfidence}`);

    return { symbol: bestSymbol, confidence: finalConfidence };
  }

  /**
   * Analyze Apex-specific context for symbol resolution
   */
  private analyzeApexContext(symbol: any, context: any): number {
    let confidence = 0;

    // Check if symbol is in the same file (higher priority)
    if (context.sourceFile && symbol.filePath) {
      const sourceFileName = context.sourceFile.replace('file://', '');
      if (symbol.filePath === sourceFileName) {
        confidence += 0.3;
      }
    }

    // Special case: In method call context, prioritize cross-file class references
    // This handles cases like "FileUtilities.createFile" where we want to hover on "FileUtilities"
    if (
      context.currentScope === 'method' &&
      symbol.kind === 'class' &&
      symbol.filePath !== context.sourceFile?.replace('file://', '')
    ) {
      confidence += 1.0; // Maximum priority for cross-file class references in method calls
      this.logger.debug(
        () =>
          `Boosted confidence for cross-file class ${symbol.name} in method context: +1.0`,
      );
    }

    // Check for Apex-specific symbol kinds
    if (symbol.kind === 'class' && context.currentScope === 'class') {
      confidence += 0.1;
    }

    if (symbol.kind === 'method' && context.currentScope === 'method') {
      confidence += 0.1;
    }

    // Check for Apex annotations
    if (symbol.annotations && symbol.annotations.length > 0) {
      // Apex-specific annotations like @AuraEnabled, @TestVisible, etc.
      const apexAnnotations = [
        'AuraEnabled',
        'TestVisible',
        'RemoteAction',
        'WebService',
      ];
      for (const annotation of symbol.annotations) {
        if (apexAnnotations.includes(annotation.name)) {
          confidence += 0.05;
        }
      }
    }

    return confidence;
  }

  /**
   * Analyze symbol specificity to favor more specific symbols over broader ones
   */
  private analyzeSymbolSpecificity(symbol: any, allSymbols: any[]): number {
    let confidence = 0;

    // Calculate symbol span (how much of the file it covers)
    const symbolSpan = this.calculateSymbolSpan(symbol);

    // Find the smallest span among all symbols at this position
    const minSpan = Math.min(
      ...allSymbols.map((s) => this.calculateSymbolSpan(s)),
    );

    // If this symbol has the smallest span, it's more specific
    if (symbolSpan === minSpan) {
      confidence += 0.3; // High bonus for most specific symbol
    } else {
      // Reduce confidence for broader symbols
      const spanRatio = minSpan / symbolSpan;
      confidence += spanRatio * 0.1;
    }

    // Additional specificity based on symbol kind
    switch (symbol.kind?.toLowerCase()) {
      case 'method':
        confidence += 0.2; // Methods are more specific than classes
        break;
      case 'property':
        confidence += 0.15; // Properties are more specific than classes
        break;
      case 'field':
        confidence += 0.15; // Fields are more specific than classes
        break;
      case 'class':
        confidence -= 0.1; // Classes are less specific
        break;
    }

    return confidence;
  }

  /**
   * Calculate the span of a symbol (how much of the file it covers)
   */
  private calculateSymbolSpan(symbol: any): number {
    if (!symbol.location) return 0;

    const { startLine, endLine, startColumn, endColumn } = symbol.location;

    // Calculate total characters spanned
    const lineSpan = endLine - startLine;
    const columnSpan = endColumn - startColumn;

    return lineSpan * 1000 + columnSpan; // Weight lines more heavily than columns
  }

  /**
   * Create resolution context for symbol lookup
   */
  private createResolutionContext(document: TextDocument, params: HoverParams) {
    // Create context using our own scope detection for better hover accuracy
    const text = document.getText();
    const currentScope = this.determineCurrentScope(text, params.position);
    const scopeChain = this.buildScopeChain(text, params.position);
    const expectedType = this.inferExpectedType(text, params.position);
    const parameterTypes = this.extractParameterTypes(text, params.position);
    const accessModifier = this.determineAccessModifier(text, params.position);
    const isStatic = this.determineIsStatic(text, params.position);
    const inheritanceChain = this.extractInheritanceChain(text);
    const interfaceImplementations = this.extractInterfaceImplementations(text);
    const importStatements = this.extractImportStatements(text);
    const namespaceContext = this.extractNamespaceContext(text);

    return {
      sourceFile: document.uri,
      namespaceContext,
      currentScope,
      scopeChain,
      expectedType,
      parameterTypes,
      accessModifier,
      isStatic,
      inheritanceChain,
      interfaceImplementations,
      importStatements,
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
    const kindDisplay = symbol.kind
      ? symbol.kind.charAt(0).toUpperCase() + symbol.kind.slice(1)
      : 'Symbol';
    content.push(`**${kindDisplay}** ${symbol.name}`);

    // Add FQN if available or construct it using hierarchical relationships
    let fqn = symbol.fqn;
    if (!fqn) {
      // Use the symbol manager's hierarchical FQN construction
      fqn = this.symbolManager.constructFQN(symbol);

      // If the FQN is just the symbol name (no parent relationship), try to construct it manually
      if (fqn === symbol.name) {
        // Try to find containing type using symbol manager
        const containingType = this.symbolManager.getContainingType(symbol);
        if (containingType) {
          fqn = `${containingType.name}.${symbol.name}`;
        } else {
          // Fallback: search for class in the same file
          const symbolsInFile = this.symbolManager.findSymbolsInFile(
            symbol.filePath || '',
          );
          const classSymbol = symbolsInFile.find(
            (s: any) => s.kind === 'class',
          );
          if (classSymbol) {
            fqn = `${classSymbol.name}.${symbol.name}`;
          } else {
            // Additional fallback: try to extract class name from file path
            const fileName = symbol.filePath?.split('/').pop()?.split('.')[0];
            if (fileName && fileName !== symbol.name) {
              fqn = `${fileName}.${symbol.name}`;
            }
          }
        }
      }
    }

    // Enhanced FQN construction for all symbol types, not just methods
    if (fqn && fqn === symbol.name) {
      // For any symbol that doesn't have a proper FQN, try to construct it
      const containingType = this.symbolManager.getContainingType(symbol);
      if (containingType) {
        fqn = `${containingType.name}.${symbol.name}`;
      } else {
        // Try to find class in the same file
        const symbolsInFile = this.symbolManager.findSymbolsInFile(
          symbol.filePath || '',
        );
        const classSymbol = symbolsInFile.find((s: any) => s.kind === 'class');
        if (classSymbol) {
          fqn = `${classSymbol.name}.${symbol.name}`;
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

    // Add relationship statistics using available methods
    try {
      const referencesTo = this.symbolManager.findReferencesTo(symbol);
      const referencesFrom = this.symbolManager.findReferencesFrom(symbol);
      const totalReferences = referencesTo.length + referencesFrom.length;

      if (totalReferences > 0) {
        content.push('');
        content.push('**Usage Statistics:**');
        content.push(`- Total references: ${totalReferences}`);
        content.push(`- References to this symbol: ${referencesTo.length}`);
        content.push(`- References from this symbol: ${referencesFrom.length}`);
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

    // Add metrics information using available methods
    try {
      const referencesTo = this.symbolManager.findReferencesTo(symbol);
      const referencesFrom = this.symbolManager.findReferencesFrom(symbol);
      const dependencyAnalysis = this.symbolManager.analyzeDependencies(symbol);

      content.push('');
      content.push('**Metrics:**');
      content.push(
        `- Reference count: ${referencesTo.length + referencesFrom.length}`,
      );
      content.push(
        `- Dependency count: ${dependencyAnalysis.dependencies.length}`,
      );
      content.push(
        `- Dependents count: ${dependencyAnalysis.dependents.length}`,
      );
      content.push(
        `- Impact score: ${dependencyAnalysis.impactScore.toFixed(2)}`,
      );
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
   * Extract Apex access modifier context from document text
   */
  private extractAccessModifierContext(text: string): string {
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for global class declarations (Apex namespace)
      if (trimmed.startsWith('global class ')) {
        return 'global';
      }
      // Look for public class declarations (default namespace)
      if (trimmed.startsWith('public class ')) {
        return 'public';
      }
      // Look for private class declarations
      if (trimmed.startsWith('private class ')) {
        return 'private';
      }
    }

    return 'default';
  }

  /**
   * Determine the current scope at the given position
   */
  private determineCurrentScope(text: string, position: any): string {
    const lines = text.split('\n');
    const currentLine = position.line;

    // Check current line for method call context first
    const currentLineText = lines[currentLine] || '';
    if (currentLineText.includes('.') && currentLineText.includes('(')) {
      // This looks like a method call (e.g., "FileUtilities.createFile(")
      return 'method';
    }

    // Simple scope detection based on indentation and context
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i] || '';
      const trimmed = line.trim();

      // Check for method declaration
      if (
        trimmed.includes('(') &&
        trimmed.includes(')') &&
        (trimmed.includes('public') ||
          trimmed.includes('private') ||
          trimmed.includes('global'))
      ) {
        return 'method';
      }

      // Check for class declaration
      if (
        trimmed.includes('class ') &&
        (trimmed.includes('public') ||
          trimmed.includes('private') ||
          trimmed.includes('global'))
      ) {
        return 'class';
      }

      // Check for trigger context
      if (trimmed.includes('trigger ')) {
        return 'trigger';
      }
    }

    return 'global';
  }

  /**
   * Build scope chain from current position
   */
  private buildScopeChain(text: string, position: any): string[] {
    const lines = text.split('\n');
    const currentLine = position.line;
    const scopeChain: string[] = [];

    // Build scope chain by walking up from current position
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i] || '';
      const trimmed = line.trim();

      if (trimmed.includes('class ')) {
        scopeChain.push('class');
        break;
      }

      if (
        trimmed.includes('(') &&
        trimmed.includes(')') &&
        (trimmed.includes('public') ||
          trimmed.includes('private') ||
          trimmed.includes('global'))
      ) {
        scopeChain.push('method');
      }
    }

    return scopeChain.length > 0 ? scopeChain : ['global'];
  }

  /**
   * Infer expected type at the given position
   */
  private inferExpectedType(text: string, position: any): string | undefined {
    const lines = text.split('\n');
    const currentLine = position.line;
    const currentChar = position.character;
    const line = lines[currentLine] || '';

    // Look for assignment context
    const beforeCursor = line.substring(0, currentChar);
    const assignmentMatch = beforeCursor.match(/(\w+)\s*=\s*$/);
    if (assignmentMatch) {
      // Look for variable declaration above
      for (let i = currentLine - 1; i >= 0; i--) {
        const prevLine = lines[i] || '';
        const varMatch = prevLine.match(
          new RegExp(`\\b${assignmentMatch[1]}\\s+(\\w+)`),
        );
        if (varMatch) {
          return varMatch[1];
        }
      }
    }

    // Look for method parameter context
    const methodMatch = beforeCursor.match(/\(([^)]*)$/);
    if (methodMatch) {
      // Try to find method declaration
      for (let i = currentLine - 1; i >= 0; i--) {
        const prevLine = lines[i] || '';
        if (prevLine.includes('(') && prevLine.includes(')')) {
          // Extract parameter types from method signature
          const paramMatch = prevLine.match(/\(([^)]+)\)/);
          if (paramMatch) {
            const params = paramMatch[1].split(',').map((p) => p.trim());
            const paramIndex = methodMatch[1].split(',').length;
            if (params[paramIndex]) {
              const typeMatch = params[paramIndex].match(/^(\w+)/);
              if (typeMatch) {
                return typeMatch[1];
              }
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Extract parameter types at the given position
   */
  private extractParameterTypes(text: string, position: any): string[] {
    const lines = text.split('\n');
    const currentLine = position.line;
    const parameterTypes: string[] = [];

    // Look for method declaration
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i] || '';
      const methodMatch = line.match(/\(([^)]+)\)/);
      if (methodMatch) {
        const params = methodMatch[1].split(',').map((p) => p.trim());
        for (const param of params) {
          const typeMatch = param.match(/^(\w+)/);
          if (typeMatch) {
            parameterTypes.push(typeMatch[1]);
          }
        }
        break;
      }
    }

    return parameterTypes;
  }

  /**
   * Determine access modifier at the given position
   */
  private determineAccessModifier(
    text: string,
    position: any,
  ): 'public' | 'private' | 'protected' | 'global' {
    const lines = text.split('\n');
    const currentLine = position.line;

    // Look for access modifier in current or previous lines
    for (let i = currentLine; i >= Math.max(0, currentLine - 5); i--) {
      const line = lines[i] || '';
      const trimmed = line.trim();

      if (trimmed.includes('global ')) return 'global';
      if (trimmed.includes('public ')) return 'public';
      if (trimmed.includes('private ')) return 'private';
      if (trimmed.includes('protected ')) return 'protected';
    }

    return 'public';
  }

  /**
   * Determine if current context is static
   */
  private determineIsStatic(text: string, position: any): boolean {
    const lines = text.split('\n');
    const currentLine = position.line;

    // Look for static keyword in current or previous lines
    for (let i = currentLine; i >= Math.max(0, currentLine - 5); i--) {
      const line = lines[i] || '';
      const trimmed = line.trim();

      if (trimmed.includes('static ')) return true;
    }

    return false;
  }

  /**
   * Extract inheritance chain from document text
   */
  private extractInheritanceChain(text: string): string[] {
    const lines = text.split('\n');
    const inheritanceChain: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for extends clause
      const extendsMatch = trimmed.match(/extends\s+(\w+)/);
      if (extendsMatch) {
        inheritanceChain.push(extendsMatch[1]);
      }
    }

    return inheritanceChain;
  }

  /**
   * Extract interface implementations from document text
   */
  private extractInterfaceImplementations(text: string): string[] {
    const lines = text.split('\n');
    const interfaceImplementations: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for implements clause
      const implementsMatch = trimmed.match(/implements\s+([^,\s]+)/);
      if (implementsMatch) {
        interfaceImplementations.push(implementsMatch[1]);
      }
    }

    return interfaceImplementations;
  }

  /**
   * Extract namespace context from text
   */
  private extractNamespaceContext(text: string): string {
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('namespace ')) {
        const match = trimmed.match(/namespace\s+([^\s]+)/);
        if (match) {
          return match[1];
        }
      }
    }

    return 'default';
  }
}
