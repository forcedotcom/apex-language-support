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
  FullSymbolCollectorListener,
  ApexSymbol,
  VariableSymbol,
  TypeInfo,
  inTypeSymbolGroup,
  isMethodSymbol,
  isBlockSymbol,
  SymbolKind as ApexSymbolKind,
  ScopeSymbol,
  ApexSymbolProcessingManager,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';
import { transformParserToLspPosition } from '../utils/positionUtils';
import { getDocumentStateCache } from '../services/DocumentStateCache';
import { getDiagnosticsFromErrors } from '../utils/handlerUtil';

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

      // For document symbols, always compile fresh with FullSymbolCollectorListener
      // to ensure we have complete symbol hierarchy (all visibility levels + block content)
      // This ensures consistency and avoids issues with cached symbol tables created
      // with different listeners
      const backgroundManager = ApexSymbolProcessingManager.getInstance();
      const symbolManager = backgroundManager.getSymbolManager();
      let symbolTable: SymbolTable;
      // Create a full symbol collector listener to parse the document
      const listener = new FullSymbolCollectorListener();

      const settingsManager = ApexSettingsManager.getInstance();
      const options = settingsManager.getCompilationOptions(
        'documentSymbols',
        documentText.length,
      );

      // Set file URI and project namespace if needed
      listener.setCurrentFileUri(documentUri);
      if (options.projectNamespace) {
        listener.setProjectNamespace(options.projectNamespace);
      }

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

        // Also ensure symbols are in symbol manager (replace if exists to ensure fresh data)
        await Effect.runPromise(
          symbolManager.addSymbolTable(symbolTable, documentUri),
        );
        logger.debug(
          () =>
            `Added SymbolTable to manager for ${documentUri} during document symbols`,
        );

        // Cache the compilation result for diagnostics
        const parseCache = getDocumentStateCache();
        const diagnostics = getDiagnosticsFromErrors(result.errors);
        parseCache.merge(documentUri, {
          diagnostics,
          documentVersion: document.version,
          documentLength: document.getText().length,
          symbolsIndexed: false,
        });
      } else {
        logger.error(() => 'Symbol table is null from compilation result');
        return null;
      }

      // Get all symbols from the entire symbol table
      const allSymbols = symbolTable.getAllSymbols();
      // Filter for only top-level symbols (classes, interfaces, enums, triggers)
      // Top-level symbols have parentId === null, while inner classes have parentId pointing to their containing class
      // With proper hierarchy maintenance, parentId is the source of truth - no need for location-based filtering
      const topLevelSymbols = allSymbols.filter(
        (symbol) => inTypeSymbolGroup(symbol) && symbol.parentId === null,
      );

      // Process each top-level symbol and convert to LSP DocumentSymbol format (with yielding)
      const symbolsResult = await Effect.runPromise(
        this.provideDocumentSymbolsEffect(topLevelSymbols, symbolTable, logger),
      );

      logger.debug(() => `Returning ${symbolsResult.length} document symbols`);
      return symbolsResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : JSON.stringify(error, Object.getOwnPropertyNames(error));
      logger.error(
        () =>
          `Error providing document symbols: ${errorMessage}. Error type: ${typeof error}. Stack: ${
            error instanceof Error ? error.stack : 'N/A'
          }`,
      );
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
   * Provide document symbols (Effect-based with yielding)
   */
  private provideDocumentSymbolsEffect(
    topLevelSymbols: ApexSymbol[],
    symbolTable: SymbolTable,
    logger: any,
  ): Effect.Effect<DocumentSymbol[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const symbols: DocumentSymbol[] = [];
      const batchSize = 50;

      // Process each top-level symbol and convert to LSP DocumentSymbol format
      for (let i = 0; i < topLevelSymbols.length; i++) {
        const symbol = topLevelSymbols[i];
        const documentSymbol = self.createDocumentSymbol(symbol);

        // Recursively collect children for top-level symbol types (classes, interfaces, etc.)
        // Get child scopes by finding block symbols with parentId === symbol.id
        const childScopes = symbolTable
          .getAllSymbols()
          .filter(
            (s) => s.parentId === symbol.id && s.kind === ApexSymbolKind.Block,
          ) as ScopeSymbol[];

        // Find the scope symbol for this type (class/interface/enum body)
        // Look for a class block with scopeType === 'class' and parentId === symbol.id
        const typeScope = childScopes.find(
          (scope) =>
            scope.scopeType === 'class' && scope.parentId === symbol.id,
        );

        if (typeScope) {
          logger.debug(
            () => `Collecting children for ${symbol.kind} '${symbol.name}'`,
          );
          documentSymbol.children = yield* self.collectChildrenEffect(
            typeScope.id,
            symbol.kind,
            symbolTable,
            symbol.id, // Pass the type symbol ID for finding inner types
          );
        }

        symbols.push(documentSymbol);

        // Yield after every batchSize symbols
        if ((i + 1) % batchSize === 0 && i + 1 < topLevelSymbols.length) {
          yield* Effect.yieldNow();
        }
      }

      return symbols;
    });
  }

  /**
   * Recursively collects children symbols for a given scope ID and kind (Effect-based with yielding)
   * This builds the hierarchical structure of the document outline
   * @param scopeId The ID of the scope block (class block, method block, etc.)
   * @param parentKind The kind of the parent type (class, interface, enum)
   * @param symbolTable The symbol table to search
   * @param parentTypeId The ID of the parent type symbol (for finding inner types)
   */
  private collectChildrenEffect(
    scopeId: string,
    parentKind: string,
    symbolTable: SymbolTable,
    parentTypeId?: string,
  ): Effect.Effect<DocumentSymbol[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const children: DocumentSymbol[] = [];
      const allSymbols = symbolTable.getAllSymbols();
      const logger = getLogger();
      const batchSize = 50;

      // Find all symbols that are children of this scope
      // Children can be:
      // 1. Direct children of the scope block (methods, fields, etc.) - parentId === scopeId
      // 2. Inner types (classes, interfaces, enums) - parentId === parentTypeId
      // Filter to only include semantic symbols for document outline
      // Exclude: block symbols, variable symbols (type references), and parameter symbols
      const childSymbols = allSymbols.filter((symbol: ApexSymbol) => {
        // Include symbols that are direct children of the scope block
        const isChildOfScope = symbol.parentId === scopeId;
        // Include inner types that are children of the parent type (if parentTypeId provided)
        const isInnerType =
          parentTypeId &&
          inTypeSymbolGroup(symbol) &&
          symbol.parentId === parentTypeId;

        if (!isChildOfScope && !isInnerType) {
          return false;
        }

        // Exclude block symbols
        if (isBlockSymbol(symbol)) {
          return false;
        }
        // For enums, include enum values (they're children of the enum block)
        if (parentKind.toLowerCase() === 'enum') {
          if (symbol.kind === ApexSymbolKind.EnumValue) {
            return true; // Include enum values
          }
        }
        // Exclude variable and parameter symbols (these are type references, not declarations)
        // Only include actual field/property declarations
        if (
          symbol.kind === ApexSymbolKind.Variable ||
          symbol.kind === ApexSymbolKind.Parameter
        ) {
          return false;
        }
        return true;
      });

      logger.debug(
        () =>
          `Collecting children for ${parentKind} (scopeId: ${scopeId}): ${childSymbols.length} semantic symbols found`,
      );

      for (let i = 0; i < childSymbols.length; i++) {
        const childSymbol = childSymbols[i];
        // For interfaces, only include methods (Apex interfaces can only contain method signatures)
        if (
          parentKind.toLowerCase() === 'interface' &&
          !isMethodSymbol(childSymbol)
        ) {
          logger.debug(
            () =>
              `Skipping non-method symbol '${childSymbol.name}' in interface`,
          );
          continue;
        }

        const childDocumentSymbol = self.createDocumentSymbol(childSymbol);

        // Recursively collect children for top-level symbol types
        if (inTypeSymbolGroup(childSymbol)) {
          // Find the class block for this nested type
          const childClassBlocks = allSymbols.filter(
            (s) =>
              s.parentId === childSymbol.id &&
              s.kind === ApexSymbolKind.Block &&
              (s as ScopeSymbol).scopeType === 'class',
          ) as ScopeSymbol[];

          if (childClassBlocks.length > 0) {
            const childScope = childClassBlocks[0];
            logger.debug(
              () =>
                `Recursively collecting children for nested ${childSymbol.kind} '${childSymbol.name}', ` +
                `blockId: ${childScope.id?.slice(-30)}`,
            );
            // Debug: check what symbols have this block as parent
            const childrenOfBlock = symbolTable
              .getAllSymbols()
              .filter((s) => s.parentId === childScope.id);
            logger.debug(
              () =>
                `Found ${childrenOfBlock.length} direct children of block: ` +
                `${childrenOfBlock.map((s) => `${s.kind}:${s.name}`).join(', ')}`,
            );
            childDocumentSymbol.children = yield* self.collectChildrenEffect(
              childScope.id,
              childSymbol.kind,
              symbolTable,
              childSymbol.id, // Pass parentTypeId for finding nested inner types
            );
          } else {
            logger.debug(
              () =>
                `No class block found for nested ${childSymbol.kind} '${childSymbol.name}' ` +
                `(parentId: ${childSymbol.parentId?.slice(-30)})`,
            );
          }
        }

        children.push(childDocumentSymbol);

        // Yield after every batchSize symbols
        if ((i + 1) % batchSize === 0 && i + 1 < childSymbols.length) {
          yield* Effect.yieldNow();
        }
      }

      logger.debug(
        () =>
          `Collected ${children.length} children for ${parentKind} (scopeId: ${scopeId})`,
      );
      return children;
    });
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
