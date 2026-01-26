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

      // Get file-scope symbols (top-level symbols with parentId === null)
      // This uses the roots array which deduplicates by ID (one entry per ID)
      const fileScopeSymbols = symbolTable.getFileScopeSymbols();
      
      // Filter for only type symbols (classes, interfaces, enums, triggers)
      const topLevelTypeSymbols = fileScopeSymbols.filter((symbol) =>
        inTypeSymbolGroup(symbol),
      );

      logger.debug(
        () =>
          `[ApexDocumentSymbolProvider] getFileScopeSymbols returned ${fileScopeSymbols.length} symbols, ` +
          `${topLevelTypeSymbols.length} type symbols`,
      );

      // Collect all top-level symbols, including intentional duplicates
      // Check getAllSymbolsById() to see if there are actual duplicate declarations
      // (different objects with different locations, not same object added multiple times)
      const topLevelSymbols: ApexSymbol[] = [];
      const processedIds = new Set<string>();
      
      for (const symbol of topLevelTypeSymbols) {
        if (!processedIds.has(symbol.id)) {
          // Check if symbolMap has duplicates stored as an array
          const allWithSameId = symbolTable.getAllSymbolsById(symbol.id);
          
          if (allWithSameId.length > 1) {
            // Filter to only top-level type symbols
            // Only show duplicates if they have different locations (actual duplicate declarations)
            // If they all have the same location, they're the same declaration processed multiple times
            const validDuplicates: ApexSymbol[] = [];
            const seenObjects = new Set<ApexSymbol>();
            const locations = new Set<number>();
            
            for (const duplicateSymbol of allWithSameId) {
              if (
                inTypeSymbolGroup(duplicateSymbol) &&
                duplicateSymbol.parentId === null
              ) {
                const line = duplicateSymbol.location.identifierRange.startLine;
                locations.add(line);
                
                // Deduplicate by object reference
                if (!seenObjects.has(duplicateSymbol)) {
                  seenObjects.add(duplicateSymbol);
                  validDuplicates.push(duplicateSymbol);
                }
              }
            }
            
            // Only show duplicates if they have different locations
            // If all have the same location, show only one (they're the same declaration)
            if (locations.size > 1) {
              // Actual duplicate declarations at different locations - show all
              for (const duplicateSymbol of validDuplicates) {
                topLevelSymbols.push(duplicateSymbol);
              }
              
              logger.debug(
                () =>
                  `[ApexDocumentSymbolProvider] Class ${symbol.name} has ${allWithSameId.length} entries in symbolMap, ` +
                  `${validDuplicates.length} valid top-level symbols, ` +
                  `${locations.size} unique locations (actual duplicates), showing ${validDuplicates.length} in outline`,
              );
            } else {
              // All have same location - same declaration processed multiple times, show only one
              topLevelSymbols.push(symbol);
              
              logger.debug(
                () =>
                  `[ApexDocumentSymbolProvider] Class ${symbol.name} has ${allWithSameId.length} entries in symbolMap ` +
                  `but only ${locations.size} unique location(s), showing 1 in outline`,
              );
            }
          } else {
            // Only one declaration - use the symbol from roots
            topLevelSymbols.push(symbol);
          }
          
          processedIds.add(symbol.id);
        }
      }

      logger.debug(
        () =>
          `[ApexDocumentSymbolProvider] Collected ${topLevelSymbols.length} top-level symbols to convert`,
      );

      // Process each top-level symbol and convert to LSP DocumentSymbol format (with yielding)
      const symbolsResult = await Effect.runPromise(
        this.provideDocumentSymbolsEffect(topLevelSymbols, symbolTable, logger),
      );

      // WORKAROUND: Check source code for duplicate class declarations that parser missed
      // 
      // The parser grammar doesn't correctly handle duplicate top-level class declarations.
      // When there are multiple class declarations with the same name, the parser treats
      // them as ONE class declaration spanning from the first to the last (e.g., lines 2-92).
      // This results in only ONE symbol being created, even though there are multiple
      // actual declarations in the source code.
      //
      // To work around this parser limitation, we:
      // 1. Scan the source code directly with regex to find all class declarations
      // 2. Compare with what the parser found (symbolsResult)
      // 3. Create additional DocumentSymbol entries for declarations the parser missed
      // 4. These synthetic DocumentSymbol entries have empty children (no methods/fields)
      //    since the parser didn't parse them as separate declarations
      const classNamesInResults = new Set<string>();
      const duplicateDeclarations: DocumentSymbol[] = [];

      for (const docSymbol of symbolsResult) {
        if (docSymbol.kind === SymbolKind.Class) {
          classNamesInResults.add(docSymbol.name);
        }
      }

      // For each class in results, check if there are multiple declarations in source
      for (const className of classNamesInResults) {
        // Find all class declarations in source code
        // Match: (modifiers?) class ClassName {
        // Escape special regex characters in className
        const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const classRegex = new RegExp(
          `(?:public|private|global|@isTest\\s+)?(?:public|private|global|with\\s+sharing|without\\s+sharing)?\\s*class\\s+${escapedClassName}\\s*\\{`,
          'gi',
        );
        const matches = Array.from(documentText.matchAll(classRegex));
        const declarationLines: Array<{ line: number; column: number }> = [];

        for (const match of matches) {
          // Get line number from match index
          const beforeMatch = documentText.substring(0, match.index!);
          const lineNumber = beforeMatch.split('\n').length;
          const lines = documentText.split('\n');
          const lineText = lines[lineNumber - 1] || '';
          // Find the actual position of "class ClassName" on this line
          const classKeywordIndex = lineText.toLowerCase().indexOf('class');
          if (classKeywordIndex !== -1) {
            // Verify this is actually the class name we're looking for
            const afterClass = lineText.substring(classKeywordIndex + 5).trim();
            if (afterClass.startsWith(className)) {
              declarationLines.push({ line: lineNumber, column: classKeywordIndex });
            }
          }
        }

        if (declarationLines.length > 1) {
          // Found duplicate declarations in source
          logger.debug(
            () =>
              `[ApexDocumentSymbolProvider] Found ${declarationLines.length} class declarations ` +
              `for ${className} in source at lines: ${declarationLines.map(d => d.line).join(', ')}`,
          );

          // Find the existing DocumentSymbol for this class (from parser)
          const existingDocSymbol = symbolsResult.find(
            (s) => s.name === className && s.kind === SymbolKind.Class,
          );

          if (existingDocSymbol) {
            // Get the line number of the existing symbol
            const existingLine = existingDocSymbol.range.start.line + 1; // Convert to 1-based
            
            // Create additional DocumentSymbol entries only for declarations NOT already represented
            // Skip the declaration that matches the existing symbol's line (already represented)
            let addedCount = 0;
            for (let i = 0; i < declarationLines.length; i++) {
              const { line, column } = declarationLines[i];
              
              // Skip if this line matches the existing symbol's line (already represented)
              if (line === existingLine) {
                logger.debug(
                  () =>
                    `[ApexDocumentSymbolProvider] Skipping line ${line} for ${className} (already represented by parser symbol at line ${existingLine})`,
                );
                continue;
              }
              
              const duplicateDocSymbol: DocumentSymbol = {
                name: className,
                kind: SymbolKind.Class,
                range: {
                  start: { line: line - 1, character: column },
                  end: {
                    line: line - 1,
                    character: column + `class ${className}`.length,
                  },
                },
                selectionRange: {
                  start: { line: line - 1, character: column },
                  end: {
                    line: line - 1,
                    character: column + `class ${className}`.length,
                  },
                },
                children: [], // Empty children for duplicate declarations
              };
              duplicateDeclarations.push(duplicateDocSymbol);
              addedCount++;
            }
            
            logger.debug(
              () =>
                `[ApexDocumentSymbolProvider] Created ${addedCount} duplicate DocumentSymbol entries ` +
                `for ${className} (found ${declarationLines.length} total declarations, existing symbol at line ${existingLine})`,
            );
          }
        }
      }

      // Add duplicate declarations to results
      if (duplicateDeclarations.length > 0) {
        logger.debug(
          () =>
            `[ApexDocumentSymbolProvider] Adding ${duplicateDeclarations.length} duplicate class declarations from source scan`,
        );
        symbolsResult.push(...duplicateDeclarations);
      }

      logger.debug(
        () =>
          `[ApexDocumentSymbolProvider] Returning ${symbolsResult.length} document symbols`,
      );
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
