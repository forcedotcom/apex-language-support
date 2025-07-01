/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DocumentSymbol,
  SymbolInformation,
  DocumentSymbolParams,
  SymbolKind,
  Range,
  Position,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CompilerService,
  SymbolTable,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  MethodSymbol,
  VariableSymbol,
  ApexSymbol,
  TypeInfo,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';
import { ApexSettingsManager } from '../settings/ApexSettingsManager';

/**
 * Symbol types that can have children (classes, interfaces, enums, triggers)
 * These are compound symbols that can contain other symbols within their scope
 */
const COMPOUND_SYMBOL_TYPES = [
  'class',
  'interface',
  'enum',
  'trigger',
] as const;

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
        `Attempting to get document from storage for URI: ${documentUri}`,
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
        logger.error('Errors parsing document:', result.errors);
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
        if (this.isCompoundSymbolType(symbol.kind)) {
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
      logger.error('Error providing document symbols:', error);
      return null;
    }
  }

  /**
   * Maps Apex symbol kinds to LSP symbol kinds
   * This converts the internal Apex symbol types to standard LSP SymbolKind values
   */
  private mapSymbolKind(kind: string): SymbolKind {
    const kindMap: Record<string, SymbolKind> = {
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

    const mappedKind = kindMap[kind.toLowerCase()];
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
    if (symbol.kind?.toLowerCase() !== 'method') {
      return symbol.name;
    }

    try {
      const methodSymbol = symbol as MethodSymbol;
      const parameterList = this.buildParameterList(
        methodSymbol.parameters || [],
      );
      const returnTypeString = this.formatReturnType(methodSymbol.returnType);

      // Format: methodName(paramTypes) : ReturnType
      return `${symbol.name}(${parameterList}) : ${returnTypeString}`;
    } catch (error) {
      // Fallback to original name if anything goes wrong
      return symbol.name;
    }
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
      range: this.createTrimmedRange(symbol, document),
      selectionRange: this.createSelectionRange(symbol, document),
      children: [],
    };
  }

  /**
   * Checks if a symbol type can have children
   * Only compound symbol types (classes, interfaces, enums, triggers) can contain other symbols
   */
  private isCompoundSymbolType(kind: string): boolean {
    return COMPOUND_SYMBOL_TYPES.includes(
      kind.toLowerCase() as (typeof COMPOUND_SYMBOL_TYPES)[number],
    );
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
      if (this.isCompoundSymbolType(childSymbol.kind)) {
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
   * Creates a range from identifier location or returns null if not available
   * This provides the most precise range when identifier location is available from the parser
   */
  private createRangeFromIdentifier(
    symbol: ApexSymbolWithIdentifier,
    document: TextDocument,
  ): Range | null {
    if (!symbol.identifierLocation) {
      return null;
    }

    const idLocation = symbol.identifierLocation;
    const endColumn =
      idLocation.endColumn || idLocation.startColumn + symbol.name.length;

    return Range.create(
      Position.create(idLocation.startLine - 1, idLocation.startColumn),
      Position.create(
        (idLocation.endLine || idLocation.startLine) - 1,
        endColumn,
      ),
    );
  }

  /**
   * Creates a precise range that excludes leading whitespace
   * This finds the first non-whitespace character in the line for better UX
   */
  private createTrimmedRange(
    symbol: ApexSymbolWithIdentifier,
    document: TextDocument,
  ): Range {
    // Try to use identifier location first (most precise)
    const identifierRange = this.createRangeFromIdentifier(symbol, document);
    if (identifierRange) {
      return identifierRange;
    }

    // Fallback: find first non-whitespace character on the start line
    const symbolLine = symbol.location.startLine - 1; // Convert to 0-based indexing
    const lineText = document.getText().split('\n')[symbolLine] || '';
    const trimmedStart = lineText.search(/\S/);

    if (trimmedStart >= 0) {
      const nameIndex = lineText.indexOf(symbol.name, trimmedStart);
      const nameEnd =
        nameIndex >= 0 ? nameIndex + symbol.name.length : trimmedStart + 1;

      return Range.create(
        Position.create(symbolLine, trimmedStart),
        Position.create(symbolLine, nameEnd),
      );
    }

    // Final fallback to the original range if trimming fails
    return this.createFallbackRange(symbol);
  }

  /**
   * Creates a precise selection range for the symbol name
   * This excludes leading whitespace and keywords for better selection behavior
   */
  private createSelectionRange(
    symbol: ApexSymbolWithIdentifier,
    document: TextDocument,
  ): Range {
    // Try to use identifier location first (most precise)
    const identifierRange = this.createRangeFromIdentifier(symbol, document);
    if (identifierRange) {
      return identifierRange;
    }

    // Fallback: find the symbol name in the line
    const symbolLine = symbol.location.startLine - 1; // Convert to 0-based indexing
    const lineText = document.getText().split('\n')[symbolLine] || '';
    const nameIndex = lineText.indexOf(symbol.name);

    if (nameIndex >= 0) {
      return Range.create(
        Position.create(symbolLine, nameIndex),
        Position.create(symbolLine, nameIndex + symbol.name.length),
      );
    }

    // Fallback to the original range if name not found
    return this.createFallbackRange(symbol);
  }

  /**
   * Creates a fallback range using the original symbol location
   * This is used when more precise range calculation fails
   */
  private createFallbackRange(symbol: ApexSymbol): Range {
    return Range.create(
      Position.create(
        symbol.location.startLine - 1,
        symbol.location.startColumn - 1,
      ),
      Position.create(
        symbol.location.endLine - 1,
        symbol.location.endColumn - 1,
      ),
    );
  }
}
