/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-logging';
import type { ApexStorageInterface } from '@salesforce/apex-lsp-compliant-services';

/**
 * Location information for a symbol or reference
 */
export interface SymbolLocation {
  /** File path where the symbol is defined */
  filePath: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** End line number (1-based) */
  endLine?: number;
  /** End column number (1-based) */
  endColumn?: number;
}

/**
 * Information about a symbol for hover or definition requests
 */
export interface SymbolInfo {
  /** Symbol name */
  name: string;
  /** Symbol kind (class, method, field, etc.) */
  kind: string;
  /** Symbol location */
  location: SymbolLocation;
  /** Fully qualified name if available */
  fqn?: string;
  /** Return type for methods */
  returnType?: string;
  /** Parameters for methods */
  parameters?: string[];
  /** Documentation or hover text */
  documentation?: string;
  /** Visibility modifier */
  visibility?: string;
  /** Whether the symbol is static */
  isStatic?: boolean;
}

/**
 * Reference information for find references requests
 */
export interface ReferenceInfo {
  /** File where the reference occurs */
  filePath: string;
  /** Line number where reference occurs */
  line: number;
  /** Column number where reference occurs */
  column: number;
  /** Type of reference (method-call, field-access, etc.) */
  referenceType: string;
  /** Context around the reference */
  context?: string;
}

/**
 * Query context for symbol resolution
 */
export interface QueryContext {
  /** Current file being processed */
  currentFile?: string;
  /** Expected namespace */
  namespace?: string;
  /** Current scope (class, method, etc.) */
  scope?: string;
  /** Whether looking for static members */
  isStatic?: boolean;
}

/**
 * Service for querying Apex parser data without exposing internal structures
 */
export class ApexQueryService {
  private readonly logger = getLogger();
  private readonly storage: ApexStorageInterface;

  constructor(storage: ApexStorageInterface) {
    this.storage = storage;
  }

  /**
   * Find symbol information for hover requests
   * @param symbolName Name of the symbol to find
   * @param context Query context for disambiguation
   * @returns Symbol information or null if not found
   */
  async findSymbolForHover(
    symbolName: string,
    context?: QueryContext,
  ): Promise<SymbolInfo | null> {
    try {
      this.logger.debug(() => `Finding symbol for hover: ${symbolName}`);

      // Get AST from storage for the current file
      if (!context?.currentFile) {
        this.logger.warn(() => 'No current file provided for hover query');
        return null;
      }

      const ast = await this.storage.retrieveAst(context.currentFile);
      if (!ast) {
        this.logger.debug(
          () => `No AST found for file: ${context.currentFile}`,
        );
        return null;
      }

      // Search for the symbol in the AST
      const symbol = this.findSymbolInAst(ast, symbolName, context);
      if (!symbol) {
        return null;
      }

      return this.createSymbolInfo(symbol, context.currentFile);
    } catch (error) {
      this.logger.error(() => `Error finding symbol for hover: ${error}`);
      return null;
    }
  }

  /**
   * Find symbol definition for go-to-definition requests
   * @param symbolName Name of the symbol to find
   * @param context Query context for disambiguation
   * @returns Symbol location or null if not found
   */
  async findSymbolDefinition(
    symbolName: string,
    context?: QueryContext,
  ): Promise<SymbolLocation | null> {
    try {
      this.logger.debug(() => `Finding definition for symbol: ${symbolName}`);

      // First check current file
      if (context?.currentFile) {
        const ast = await this.storage.retrieveAst(context.currentFile);
        if (ast) {
          const symbol = this.findSymbolInAst(ast, symbolName, context);
          if (symbol) {
            return this.createSymbolLocation(symbol, context.currentFile);
          }
        }
      }

      // Check references to see if symbol is defined elsewhere
      const references = await this.storage.findReferencesTo(symbolName);
      const definitionRef = references.find(
        (ref) => ref.referenceType === 'definition',
      );

      if (definitionRef) {
        return {
          filePath: definitionRef.sourceFile,
          line: definitionRef.line,
          column: definitionRef.column,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(() => `Error finding symbol definition: ${error}`);
      return null;
    }
  }

  /**
   * Find all references to a symbol
   * @param symbolName Name of the symbol to find references for
   * @param context Query context
   * @returns Array of reference locations
   */
  async findSymbolReferences(
    symbolName: string,
    context?: QueryContext,
  ): Promise<ReferenceInfo[]> {
    try {
      this.logger.debug(() => `Finding references for symbol: ${symbolName}`);

      const references = await this.storage.findReferencesTo(symbolName);

      return references.map((ref) => ({
        filePath: ref.sourceFile,
        line: ref.line,
        column: ref.column,
        referenceType: ref.referenceType,
        context: ref.context ? JSON.stringify(ref.context) : undefined,
      }));
    } catch (error) {
      this.logger.error(() => `Error finding symbol references: ${error}`);
      return [];
    }
  }

  /**
   * Get all symbols in a file for document symbol requests
   * @param filePath Path to the file
   * @returns Array of symbol information
   */
  async getFileSymbols(filePath: string): Promise<SymbolInfo[]> {
    try {
      this.logger.debug(() => `Getting symbols for file: ${filePath}`);

      const ast = await this.storage.retrieveAst(filePath);
      if (!ast) {
        return [];
      }

      return ast.flatMap((classInfo) =>
        this.extractSymbolsFromClass(classInfo, filePath),
      );
    } catch (error) {
      this.logger.error(() => `Error getting file symbols: ${error}`);
      return [];
    }
  }

  /**
   * Find symbol in AST by name and context
   */
  private findSymbolInAst(
    ast: any[],
    symbolName: string,
    context?: QueryContext,
  ): any | null {
    // Implementation would traverse AST to find symbol
    // This is a placeholder - actual implementation would depend on AST structure
    for (const classInfo of ast) {
      // Search in class members, methods, etc.
      // Return the first matching symbol
    }
    return null;
  }

  /**
   * Create SymbolInfo from internal symbol structure
   */
  private createSymbolInfo(symbol: any, filePath: string): SymbolInfo {
    // Convert internal symbol structure to public interface
    // This is a placeholder - actual implementation would map internal fields
    return {
      name: symbol.name || 'Unknown',
      kind: symbol.kind || 'unknown',
      location: this.createSymbolLocation(symbol, filePath),
      fqn: symbol.fqn,
      returnType: symbol.returnType,
      parameters: symbol.parameters,
      documentation: symbol.documentation,
      visibility: symbol.visibility,
      isStatic: symbol.isStatic,
    };
  }

  /**
   * Create SymbolLocation from internal symbol structure
   */
  private createSymbolLocation(symbol: any, filePath: string): SymbolLocation {
    return {
      filePath,
      line: symbol.location?.startLine || 1,
      column: symbol.location?.startColumn || 1,
      endLine: symbol.location?.endLine,
      endColumn: symbol.location?.endColumn,
    };
  }

  /**
   * Extract all symbols from a class AST
   */
  private extractSymbolsFromClass(
    classInfo: any,
    filePath: string,
  ): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    // Add class itself
    if (classInfo.name) {
      symbols.push(this.createSymbolInfo(classInfo, filePath));
    }

    // Add methods, fields, etc.
    // This is a placeholder - actual implementation would traverse class structure

    return symbols;
  }
}
