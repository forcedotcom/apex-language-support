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
import {
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';

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
 */
export class DefaultApexDocumentSymbolProvider
  implements ApexDocumentSymbolProvider
{
  private compilerService: CompilerService;

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
      const document = await this.storage.getDocument(documentUri);

      if (!document) {
        return null;
      }

      // Create a symbol collector listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      // Parse the document
      const result = this.compilerService.compile(
        document.getText(),
        documentUri,
        listener,
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

      // Process each symbol
      for (const symbol of globalSymbols) {
        const range = Range.create(
          Position.create(
            symbol.location.startLine - 1,
            symbol.location.startColumn - 1,
          ),
          Position.create(
            symbol.location.endLine - 1,
            symbol.location.endColumn - 1,
          ),
        );

        const documentSymbol: DocumentSymbol = {
          name: symbol.name,
          kind: this.mapSymbolKind(symbol.kind),
          range,
          selectionRange: range,
          children: [], // Initialize empty children array
        };

        // Recursively collect children for classes, interfaces, enums, etc.
        if (
          'interfaces' in symbol ||
          ['class', 'interface', 'enum'].includes(symbol.kind.toLowerCase())
        ) {
          // Get all child scopes
          const childScopes = symbolTable.getCurrentScope().getChildren();

          // Find the scope for this type
          const typeScope = childScopes.find(
            (scope: any) => scope.name === symbol.name,
          );
          if (typeScope) {
            // Recursively collect children
            documentSymbol.children = this.collectChildren(
              typeScope,
              symbol.kind,
            );
          }
        }

        symbols.push(documentSymbol);
      }

      return symbols;
    } catch (error) {
      logger.error('Error providing document symbols:', error);
      return null;
    }
  }

  /**
   * Maps Apex symbol kinds to LSP symbol kinds
   */
  private mapSymbolKind(kind: string): SymbolKind {
    const logger = getLogger();
    logger.info(`Mapping symbol kind: ${kind}`);
    let mappedKind: SymbolKind;
    switch (kind.toLowerCase()) {
      case 'class':
        mappedKind = SymbolKind.Class; // 5
        break;
      case 'interface':
        mappedKind = SymbolKind.Interface; // 11
        break;
      case 'method':
        mappedKind = SymbolKind.Method; // 6
        break;
      case 'property':
        mappedKind = SymbolKind.Property; // 7
        break;
      case 'variable':
        mappedKind = SymbolKind.Variable; // 13
        break;
      case 'enum':
        mappedKind = SymbolKind.Enum; // 10
        break;
      case 'enumvalue':
        mappedKind = SymbolKind.EnumMember; // 22
        break;
      case 'parameter':
        mappedKind = SymbolKind.Variable; // 13
        break;
      case 'trigger':
        mappedKind = SymbolKind.Class; // 5 (treating triggers as classes)
        break;
      default:
        logger.warn(`Unknown symbol kind: ${kind}`);
        mappedKind = SymbolKind.Variable; // 13
    }
    logger.info(`Mapped to: ${mappedKind} (expected Class to be 5)`);
    return mappedKind;
  }

  /**
   * Recursively collects children symbols for a given scope and kind
   */
  private collectChildren(scope: any, parentKind: string): DocumentSymbol[] {
    const children: DocumentSymbol[] = [];
    const childSymbols = scope.getAllSymbols();
    // Debug log: print all child symbol names and kinds for this scope
    const logger = getLogger();
    logger.info(
      `collectChildren for parentKind=${parentKind}, scope=${scope.name}, childSymbols=${childSymbols.map(
        (s: any) => ({ name: s.name, kind: s.kind }),
      )}`,
    );
    for (const childSymbol of childSymbols) {
      // For interfaces, only include methods
      if (
        parentKind.toLowerCase() === 'interface' &&
        childSymbol.kind.toLowerCase() !== 'method'
      ) {
        continue;
      }
      const childRange = Range.create(
        Position.create(
          childSymbol.location.startLine - 1,
          childSymbol.location.startColumn - 1,
        ),
        Position.create(
          childSymbol.location.endLine - 1,
          childSymbol.location.endColumn - 1,
        ),
      );
      const childDocumentSymbol: DocumentSymbol = {
        name: childSymbol.name,
        kind: this.mapSymbolKind(childSymbol.kind),
        range: childRange,
        selectionRange: childRange,
        children: [],
      };
      // If the child is a class, interface, or enum, recursively collect its children
      if (
        ['class', 'interface', 'enum'].includes(childSymbol.kind.toLowerCase())
      ) {
        const childScope = scope
          .getChildren()
          .find((s: any) => s.name === childSymbol.name);
        if (childScope) {
          childDocumentSymbol.children = this.collectChildren(
            childScope,
            childSymbol.kind,
          );
        }
      }
      children.push(childDocumentSymbol);
    }
    return children;
  }
}
