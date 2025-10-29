/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DocumentSymbolParams,
  DocumentSymbol,
  SymbolInformation,
  SymbolKind,
  Range,
} from 'vscode-languageserver-protocol';
import {
  SymbolTable,
  CompilerService,
  ApexSymbolCollectorListener,
  ApexSymbol,
  VariableSymbol,
  TypeInfo,
  inTypeSymbolGroup,
  isMethodSymbol,
} from '@salesforce/apex-lsp-parser-ast';

import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';
import { transformParserToLspPosition } from '../utils/positionUtils';
import { getParseResultCache } from '../services/ParseResultCache';

/**
 * Maps Apex symbol kinds to LSP symbol kinds
 * This converts the internal Apex symbol types to standard LSP SymbolKind values
 */
const SYMBOL_KIND_MAP: Record<string, SymbolKind> = {
  class: SymbolKind.Class, // 5
  interface: SymbolKind.Interface, // 11
  method: SymbolKind.Method, // 6
  property: SymbolKind.Property, // 7
  field: SymbolKind.Field, // 8
  constructor: SymbolKind.Constructor, // 9
  variable: SymbolKind.Variable, // 13
  enum: SymbolKind.Enum, // 10
  enumvalue: SymbolKind.EnumMember, // 22
  parameter: SymbolKind.Variable, // 13 (parameters are treated as variables)
  trigger: SymbolKind.Class, // 5 (treating triggers as classes for consistency)
};

/**
 * Interface for Apex document symbol providers
 */
export interface ApexDocumentSymbolProvider {
  /**
   * Provides document symbols for the given document
   * @param params The document symbol parameters
   * @returns Array of document symbols or symbol information
   */
  provideDocumentSymbols(
    params: DocumentSymbolParams,
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null>;
}

/**
 * Implementation of Apex document symbol provider
 * Converts Apex symbols from the parser into LSP DocumentSymbol format
 */
export class DefaultApexDocumentSymbolProvider
  implements ApexDocumentSymbolProvider
{
  private readonly compilerService: CompilerService;

  constructor(
    private readonly storage: ApexStorageInterface,
    compilerService?: CompilerService,
  ) {
    this.compilerService = compilerService || new CompilerService();
  }

  /**
   * Provides document symbols for the given document
   * @param params The document symbol parameters
   * @returns Array of document symbols or symbol information
   */
  async provideDocumentSymbols(
    params: DocumentSymbolParams,
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    const logger = getLogger();
    logger.debug(
      '=== ApexDocumentSymbolProvider.provideDocumentSymbols called ===',
    );

    try {
      const documentUri = params.textDocument.uri;
      logger.debug(() => `Document URI: ${documentUri}`);
      logger.debug(
        () => `Attempting to get document from storage for URI: ${documentUri}`,
      );

      logger.debug(() => 'About to call storage.getDocument...');
      const document = await this.storage.getDocument(documentUri);
      logger.debug(
        () =>
          `Storage.getDocument returned: ${document ? 'document found' : 'document not found'}`,
      );

      if (!document) {
        logger.warn(
          () => `Document not found in storage for URI: ${documentUri}`,
        );
        return null;
      }

      const documentText = document.getText();
      logger.debug(
        () =>
          `Document found in storage. Content length: ${documentText.length}`,
      );
      logger.debug(
        () => `Document content preview: ${documentText.substring(0, 100)}...`,
      );

      // Check parse result cache first
      // NOTE: Safe to use cached SymbolTable even with different compilation options
      // because SymbolTable only contains structural symbols (classes, methods, fields)
      // and is independent of comment collection settings
      const parseCache = getParseResultCache();
      const cached = parseCache.getSymbolResult(documentUri, document.version);

      let symbolTable: SymbolTable;

      if (cached) {
        logger.debug(
          () =>
            `Using cached parse result for document symbols ${documentUri} (version ${document.version})`,
        );
        // Use cached symbol table for document symbols
        symbolTable = cached.symbolTable;
      } else {
        // Create a symbol collector listener to parse the document
        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);

        const settingsManager = ApexSettingsManager.getInstance();
        const options = settingsManager.getCompilationOptions(
          'documentSymbols',
          documentText.length,
        );

        // Parse the document using the compiler service
        const result = this.compilerService.compile(
          documentText,
          documentUri,
          listener,
          options,
        );

        logger.debug(
          () =>
            `Compilation result: ${JSON.stringify({
              hasResult: !!result.result,
              errorCount: result.errors.length,
              warningCount: result.warnings.length,
            })}`,
        );

        // Get the symbol table from the compilation result
        if (result.result) {
          symbolTable = result.result;
        } else {
          logger.error(() => 'Symbol table is null from compilation result');
          return null;
        }
      }

      const symbols: DocumentSymbol[] = [];

      const currentScope = symbolTable.getCurrentScope();

      // Debug: Check what's in the symbol table
      logger.debug(() => `Symbol table current scope: ${currentScope.name}`);
      logger.debug(
        () =>
          `Symbol table current scope path: ${JSON.stringify(
            symbolTable.getCurrentScopePath(),
          )}`,
      );

      // Get all symbols from the entire symbol table (not just current scope)
      const allSymbols = symbolTable.getAllSymbols();
      // Filter for only top-level symbols (classes, interfaces, enums, triggers)
      const topLevelSymbols = allSymbols.filter((symbol) =>
        inTypeSymbolGroup(symbol),
      );

      // Process each top-level symbol and convert to LSP DocumentSymbol format
      for (const symbol of topLevelSymbols) {
        const documentSymbol = this.createDocumentSymbol(symbol);

        // Recursively collect children for top-level symbol types (classes, interfaces, etc.)
        const childScopes = symbolTable.getCurrentScope().getChildren();

        const typeScope = childScopes.find(
          (scope: any) => scope.name === symbol.name,
        );

        if (typeScope) {
          logger.debug(
            () => `Collecting children for ${symbol.kind} '${symbol.name}'`,
          );
          documentSymbol.children = this.collectChildren(
            typeScope,
            symbol.kind,
          );
        }

        symbols.push(documentSymbol);
      }

      logger.debug(() => `Returning ${symbols.length} document symbols`);
      return symbols;
    } catch (error) {
      const errorMessage = JSON.stringify(error);
      logger.error(() => `Error providing document symbols: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Maps Apex symbol kinds to LSP symbol kinds
   * This converts the internal Apex symbol types to standard LSP SymbolKind values
   */
  private mapSymbolKind(kind: string): SymbolKind {
    const mappedKind = SYMBOL_KIND_MAP[kind.toLowerCase()];
    if (mappedKind) {
      return mappedKind;
    }

    getLogger().warn(() => `Unknown symbol kind: ${kind}`);
    return SymbolKind.Variable; // 13 (default fallback)
  }

  /**
   * Formats the display name for a symbol based on its type
   * For methods, includes parameter types and return type for better UX
   * For fields and properties, includes type information for better UX
   * For other symbols, returns the simple name
   */
  private formatSymbolName(symbol: ApexSymbol): string {
    // Check if this is a method symbol
    if (isMethodSymbol(symbol)) {
      try {
        const methodSymbol = symbol;

        // Build parameter list
        const parameterList = this.buildParameterList(
          methodSymbol.parameters || [],
        );

        // Build return type string
        const returnTypeString = this.formatReturnType(methodSymbol.returnType);

        // Format: methodName(paramTypes) : ReturnType
        return `${symbol.name}(${parameterList}) : ${returnTypeString}`;
      } catch (error) {
        getLogger().warn(
          () =>
            `Error formatting method symbol name for '${symbol.name}': ${error}`,
        );
        // Fallback to original name if anything goes wrong
        return symbol.name;
      }
    }

    // Check if this is a field or property symbol
    if (
      (symbol.kind === 'field' || symbol.kind === 'property') &&
      'type' in symbol
    ) {
      try {
        const variableSymbol = symbol as VariableSymbol;
        const typeString = this.formatTypeInfo(variableSymbol.type);

        // Format: fieldName : Type
        return `${symbol.name} : ${typeString}`;
      } catch (error) {
        getLogger().warn(
          () =>
            `Error formatting ${symbol.kind} symbol name for '${symbol.name}': ${error}`,
        );
        // Fallback to original name if anything goes wrong
        return symbol.name;
      }
    }

    // For other symbols, returns the simple name
    return symbol.name;
  }

  /**
   * Builds a comma-separated list of parameter types
   * Used for method signature display in the outline
   */
  private buildParameterList(parameters: VariableSymbol[]): string {
    if (!parameters?.length) {
      return '';
    }

    return parameters
      .map((param) => this.formatTypeInfo(param.type))
      .join(', ');
  }

  /**
   * Formats a return type for display
   * Returns 'void' for methods without return types
   */
  private formatReturnType(returnType: TypeInfo): string {
    return returnType ? this.formatTypeInfo(returnType) : 'void';
  }

  /**
   * Formats a TypeInfo object for display
   * Uses originalTypeString if available for better accuracy
   */
  private formatTypeInfo(typeInfo: TypeInfo): string {
    if (!typeInfo) {
      return 'unknown';
    }

    return typeInfo.originalTypeString || typeInfo.name || 'unknown';
  }

  /**
   * Creates a document symbol from an Apex symbol
   * This is the main conversion point from internal Apex symbols to LSP DocumentSymbol format
   */
  private createDocumentSymbol(symbol: ApexSymbol): DocumentSymbol {
    return {
      name: this.formatSymbolName(symbol),
      kind: this.mapSymbolKind(symbol.kind),
      range: this.createRange(symbol),
      selectionRange: this.createSelectionRange(symbol),
      children: [],
    };
  }

  /**
   * Recursively collects children symbols for a given scope and kind
   * This builds the hierarchical structure of the document outline
   */
  private collectChildren(scope: any, parentKind: string): DocumentSymbol[] {
    const children: DocumentSymbol[] = [];
    const childSymbols = scope.getAllSymbols();
    const logger = getLogger();

    logger.debug(
      () =>
        `Collecting children for ${parentKind} '${scope.name}': ${childSymbols.length} symbols found`,
    );

    for (const childSymbol of childSymbols) {
      // For interfaces, only include methods (Apex interfaces can only contain method signatures)
      if (
        parentKind.toLowerCase() === 'interface' &&
        !isMethodSymbol(childSymbol)
      ) {
        logger.debug(
          () => `Skipping non-method symbol '${childSymbol.name}' in interface`,
        );
        continue;
      }

      const childDocumentSymbol = this.createDocumentSymbol(childSymbol);

      // Recursively collect children for top-level symbol types
      if (inTypeSymbolGroup(childSymbol)) {
        const childScope = scope
          .getChildren()
          .find((s: any) => s.name === childSymbol.name);

        if (childScope) {
          logger.debug(
            () =>
              `Recursively collecting children for nested ${childSymbol.kind} '${childSymbol.name}'`,
          );
          childDocumentSymbol.children = this.collectChildren(
            childScope,
            childSymbol.kind,
          );
        }
      }

      children.push(childDocumentSymbol);
    }

    logger.debug(
      () =>
        `Collected ${children.length} children for ${parentKind} '${scope.name}'`,
    );
    return children;
  }

  /**
   * Creates the range that covers the symbol name + scope (body)
   * This excludes modifiers but includes the entire symbol definition
   */
  private createRange(symbol: ApexSymbol): Range {
    const { location } = symbol;

    const startPosition = transformParserToLspPosition({
      line: location.symbolRange.startLine,
      character: location.symbolRange.startColumn,
    });

    const endPosition = transformParserToLspPosition({
      line: location.symbolRange.endLine,
      character: location.symbolRange.endColumn,
    });
    return Range.create(startPosition, endPosition);
  }

  /**
   * Creates a precise selection range for just the symbol name
   * This excludes modifiers and scope, providing precise positioning for the identifier
   */
  private createSelectionRange(symbol: ApexSymbol): Range {
    const { location } = symbol;

    const startPosition = transformParserToLspPosition({
      line: location.identifierRange.startLine,
      character: location.identifierRange.startColumn,
    });

    const endPosition = transformParserToLspPosition({
      line: location.identifierRange.endLine,
      character: location.identifierRange.endColumn,
    });

    return Range.create(startPosition, endPosition);
  }
}
