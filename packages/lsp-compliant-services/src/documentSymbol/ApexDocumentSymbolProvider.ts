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
  Position,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  SymbolTable,
  CompilerService,
  ApexSymbolCollectorListener,
  ApexSymbol,
  MethodSymbol,
  VariableSymbol,
  TypeInfo,
  isCompoundSymbolType,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';
import { ApexSettingsManager } from '../settings/ApexSettingsManager';

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
  variable: SymbolKind.Variable, // 13
  enum: SymbolKind.Enum, // 10
  enumvalue: SymbolKind.EnumMember, // 22
  parameter: SymbolKind.Variable, // 13 (parameters are treated as variables)
  trigger: SymbolKind.Class, // 5 (treating triggers as classes for consistency)
};

/**
 * Interface for precise identifier location information
 * Used to create more accurate ranges that exclude surrounding keywords/modifiers
 */
interface IdentifierLocation {
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * Extended Apex symbol with optional identifier location
 * This allows for more precise range calculations when identifier location is available
 */
type ApexSymbolWithIdentifier = ApexSymbol & {
  identifierLocation?: IdentifierLocation;
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

  constructor(private readonly storage: ApexStorageInterface) {
    this.compilerService = new CompilerService();
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
    try {
      const documentUri = params.textDocument.uri;
      logger.debug(
        () => `Attempting to get document from storage for URI: ${documentUri}`,
      );

      const document = await this.storage.getDocument(documentUri);

      if (!document) {
        logger.warn(
          () => `Document not found in storage for URI: ${documentUri}`,
        );
        return null;
      }

      const documentText = document.getText();
      logger.debug(
        `Document found in storage. Content length: ${documentText.length}`,
      );
      logger.debug(
        `Document content preview: ${documentText.substring(0, 100)}...`,
      );

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

      if (result.errors.length > 0) {
        (logger.error as any)('Errors parsing document:', result.errors);
        return null;
      }

      // Get the symbol table from the listener
      const symbolTable = listener.getResult();
      const symbols: DocumentSymbol[] = [];

      // Get all symbols from the global scope
      const globalSymbols = symbolTable.getCurrentScope().getAllSymbols();
      logger.debug(`Found ${globalSymbols.length} global symbols in document`);

      // Process each symbol and convert to LSP DocumentSymbol format
      for (const symbol of globalSymbols) {
        const documentSymbol = this.createDocumentSymbol(symbol, document);

        // Recursively collect children for compound symbol types (classes, interfaces, etc.)
        if (isCompoundSymbolType(symbol)) {
          const childScopes = symbolTable.getCurrentScope().getChildren();
          const typeScope = childScopes.find(
            (scope: any) => scope.name === symbol.name,
          );

          if (typeScope) {
            logger.debug(
              `Collecting children for ${symbol.kind} '${symbol.name}'`,
            );
            documentSymbol.children = this.collectChildren(
              typeScope,
              symbol.kind,
              document,
            );
          }
        }

        symbols.push(documentSymbol);
      }

      logger.debug(`Returning ${symbols.length} document symbols`);
      return symbols;
    } catch (error) {
      (logger.error as any)('Error providing document symbols:', error);
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
   * For other symbols, returns the simple name
   */
  private formatSymbolName(symbol: ApexSymbol): string {
    // Check if this is a method symbol
    if (symbol.kind?.toLowerCase() === 'method') {
      try {
        // Cast to MethodSymbol to access method-specific properties
        const methodSymbol = symbol as MethodSymbol;

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
  private createDocumentSymbol(
    symbol: ApexSymbol,
    document: TextDocument,
  ): DocumentSymbol {
    return {
      name: this.formatSymbolName(symbol),
      kind: this.mapSymbolKind(symbol.kind),
      range: this.createRange(symbol, document),
      selectionRange: this.createSelectionRange(symbol, document),
      children: [],
    };
  }

  /**
   * Recursively collects children symbols for a given scope and kind
   * This builds the hierarchical structure of the document outline
   */
  private collectChildren(
    scope: any,
    parentKind: string,
    document: TextDocument,
  ): DocumentSymbol[] {
    const children: DocumentSymbol[] = [];
    const childSymbols = scope.getAllSymbols();
    const logger = getLogger();

    logger.debug(
      `Collecting children for ${parentKind} '${scope.name}': ${childSymbols.length} symbols found`,
    );

    for (const childSymbol of childSymbols) {
      // For interfaces, only include methods (Apex interfaces can only contain method signatures)
      if (
        parentKind.toLowerCase() === 'interface' &&
        childSymbol.kind.toLowerCase() !== 'method'
      ) {
        logger.debug(
          `Skipping non-method symbol '${childSymbol.name}' in interface`,
        );
        continue;
      }

      const childDocumentSymbol = this.createDocumentSymbol(
        childSymbol,
        document,
      );

      // Recursively collect children for compound symbol types
      if (isCompoundSymbolType(childSymbol)) {
        const childScope = scope
          .getChildren()
          .find((s: any) => s.name === childSymbol.name);

        if (childScope) {
          logger.debug(
            `Recursively collecting children for nested ${childSymbol.kind} '${childSymbol.name}'`,
          );
          childDocumentSymbol.children = this.collectChildren(
            childScope,
            childSymbol.kind,
            document,
          );
        }
      }

      children.push(childDocumentSymbol);
    }

    logger.debug(
      `Collected ${children.length} children for ${parentKind} '${scope.name}'`,
    );
    return children;
  }

  /**
   * Creates a precise range that excludes leading whitespace
   * This finds the first non-whitespace character in the line for better UX
   */
  private createRange(
    symbol: ApexSymbolWithIdentifier,
    document: TextDocument,
  ): Range {
    const { location, identifierLocation } = symbol;

    // The end position is always the end of the full symbol location.
    const endPosition = Position.create(
      location.endLine - 1,
      location.endColumn - 1,
    );

    // If we have a precise identifier location, start the range from there
    // for a "tighter" range that excludes leading modifiers/keywords.
    if (identifierLocation) {
      const startPosition = Position.create(
        identifierLocation.startLine - 1,
        identifierLocation.startColumn,
      );
      return Range.create(startPosition, endPosition);
    }

    // Fallback to the full symbol location if no identifier location is available.
    const startPosition = Position.create(
      location.startLine - 1,
      location.startColumn - 1,
    );
    return Range.create(startPosition, endPosition);
  }

  /**
   * Creates a precise selection range for the symbol name
   * This excludes leading whitespace and keywords for better selection behavior
   */
  private createSelectionRange(
    symbol: ApexSymbolWithIdentifier,
    document: TextDocument,
  ): Range {
    const { identifierLocation, location, name } = symbol;

    // Use the precise identifier location if available.
    if (identifierLocation) {
      const { startLine, startColumn, endLine, endColumn } = identifierLocation;
      return Range.create(
        Position.create(startLine - 1, startColumn),
        Position.create(
          (endLine || startLine) - 1,
          endColumn ?? startColumn + name.length,
        ),
      );
    }

    // Fallback: search for the symbol name on its starting line.
    const lineContent = document.getText(
      Range.create(
        Position.create(location.startLine - 1, 0),
        Position.create(location.startLine - 1, Number.MAX_VALUE),
      ),
    );

    const nameIndex = lineContent.indexOf(name);
    const startCharacter =
      nameIndex > -1 ? nameIndex : location.startColumn - 1;

    return Range.create(
      Position.create(location.startLine - 1, startCharacter),
      Position.create(location.startLine - 1, startCharacter + name.length),
    );
  }
}
