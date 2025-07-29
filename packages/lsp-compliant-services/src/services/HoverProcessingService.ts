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
      if (context.accessModifierContext && symbol.modifiers?.visibility) {
        if (context.accessModifierContext === symbol.modifiers.visibility) {
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

      // Update best match if this symbol has higher confidence
      if (confidence > bestConfidence) {
        bestSymbol = symbol;
        bestConfidence = confidence;
      }
    }

    return { symbol: bestSymbol, confidence: Math.min(bestConfidence, 0.95) };
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
   * Create resolution context for symbol lookup
   */
  private createResolutionContext(document: TextDocument, params: HoverParams) {
    const text = document.getText();
    const position = params.position;

    // Extract Apex-specific context
    const accessModifierContext = this.extractAccessModifierContext(text);
    const currentScope = this.determineCurrentScope(text, position);
    const scopeChain = this.buildScopeChain(text, position);
    const expectedType = this.inferExpectedType(text, position);
    const parameterTypes = this.extractParameterTypes(text, position);
    const accessModifier = this.determineAccessModifier(text, position);
    const isStatic = this.determineIsStatic(text, position);
    const inheritanceChain = this.extractInheritanceChain(text);
    const interfaceImplementations = this.extractInterfaceImplementations(text);

    return {
      sourceFile: document.uri,
      accessModifierContext,
      currentScope,
      scopeChain,
      expectedType,
      parameterTypes,
      accessModifier,
      isStatic,
      inheritanceChain,
      interfaceImplementations,
      // Remove importStatements since Apex doesn't use imports
      importStatements: [],
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
}
