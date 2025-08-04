/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ReferenceParams,
  Location,
  Range,
  Position,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import { SymbolManagerFactory } from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for references processing functionality
 */
export interface IReferencesProcessor {
  /**
   * Process a references request
   * @param params The references parameters
   * @returns Reference locations for the requested symbol
   */
  processReferences(params: ReferenceParams): Promise<Location[]>;
}

/**
 * Service for processing references requests using ApexSymbolManager
 */
export class ReferencesProcessingService implements IReferencesProcessor {
  private readonly logger: LoggerInterface;
  private symbolManager: any;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.symbolManager = SymbolManagerFactory.createSymbolManager();
  }

  /**
   * Process a references request
   * @param params The references parameters
   * @returns Reference locations for the requested symbol
   */
  public async processReferences(params: ReferenceParams): Promise<Location[]> {
    this.logger.debug(
      () => `Processing references request for: ${params.textDocument.uri}`,
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
        return [];
      }

      // Extract symbol name at position
      const symbolName = this.extractSymbolNameAtPosition(
        document,
        params.position,
      );
      if (!symbolName) {
        this.logger.debug(() => 'No symbol found at position');
        return [];
      }

      // Create resolution context
      const context = this.createResolutionContext(document, params);

      // Use ApexSymbolManager for context-aware symbol resolution
      const result = this.symbolManager.resolveSymbol(symbolName, context);

      if (!result.symbol) {
        this.logger.debug(() => `No symbol found for: ${symbolName}`);
        return [];
      }

      // Get reference locations
      const locations = await this.getReferenceLocations(
        result.symbol,
        params.context?.includeDeclaration,
      );

      this.logger.debug(
        () =>
          `Returning ${locations.length} reference locations for: ${symbolName}`,
      );

      return locations;
    } catch (error) {
      this.logger.error(() => `Error processing references: ${error}`);
      return [];
    }
  }

  /**
   * Extract symbol name at the given position
   */
  private extractSymbolNameAtPosition(
    document: TextDocument,
    position: Position,
  ): string | null {
    // Simple word extraction (in practice would use AST analysis)
    const wordRange = this.getWordRangeAtPosition(document, position);
    if (wordRange) {
      return document.getText(wordRange);
    }

    return null;
  }

  /**
   * Create resolution context for symbol lookup
   */
  private createResolutionContext(
    document: TextDocument,
    params: ReferenceParams,
  ) {
    // Use shared context analysis from ApexSymbolManager
    return this.symbolManager.createResolutionContext(
      document.getText(),
      params.position,
      document.uri,
    );
  }

  /**
   * Get reference locations for a symbol
   */
  private async getReferenceLocations(
    symbol: any,
    includeDeclaration: boolean = false,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Include the declaration if requested
      if (includeDeclaration) {
        const declarationLocation = this.createLocationFromSymbol(symbol);
        if (declarationLocation) {
          locations.push(declarationLocation);
        }
      }

      // Get references to this symbol
      const referencesTo = this.symbolManager.findReferencesTo(symbol);
      for (const reference of referencesTo) {
        const location = this.createLocationFromReference(reference);
        if (location) {
          locations.push(location);
        }
      }

      // Get references from this symbol (for bidirectional analysis)
      const referencesFrom = this.symbolManager.findReferencesFrom(symbol);
      for (const reference of referencesFrom) {
        const location = this.createLocationFromReference(reference);
        if (location) {
          locations.push(location);
        }
      }

      // Get specific relationship type references
      const relationshipReferences =
        await this.getRelationshipTypeReferences(symbol);
      locations.push(...relationshipReferences);
    } catch (error) {
      this.logger.debug(() => `Error getting reference locations: ${error}`);
    }

    return locations;
  }

  /**
   * Create location from symbol
   */
  private createLocationFromSymbol(symbol: any): Location | null {
    if (!symbol.location) {
      return null;
    }

    const uri = this.getSymbolFileUri(symbol);
    if (!uri) {
      return null;
    }

    const range: Range = {
      start: {
        line: symbol.location.startLine, // Parser now provides LSP coordinates (0-based)
        character: symbol.location.startColumn, // Parser now provides LSP coordinates (0-based)
      },
      end: {
        line: symbol.location.endLine,
        character: symbol.location.endColumn,
      },
    };

    return { uri, range };
  }

  /**
   * Create location from reference
   */
  private createLocationFromReference(reference: any): Location | null {
    if (!reference.location) {
      return null;
    }

    const uri = this.getReferenceFileUri(reference);
    if (!uri) {
      return null;
    }

    const range: Range = {
      start: {
        line: reference.location.startLine, // Parser now provides LSP coordinates (0-based)
        character: reference.location.startColumn, // Parser now provides LSP coordinates (0-based)
      },
      end: {
        line: reference.location.endLine,
        character: reference.location.endColumn,
      },
    };

    return { uri, range };
  }

  /**
   * Get references by specific relationship types
   */
  private async getRelationshipTypeReferences(
    symbol: any,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Get method calls
      const methodCalls = this.symbolManager.findReferencesByType(
        symbol,
        'method-call',
      );
      for (const call of methodCalls) {
        const location = this.createLocationFromReference(call);
        if (location) {
          locations.push(location);
        }
      }

      // Get field access
      const fieldAccess = this.symbolManager.findReferencesByType(
        symbol,
        'field-access',
      );
      for (const access of fieldAccess) {
        const location = this.createLocationFromReference(access);
        if (location) {
          locations.push(location);
        }
      }

      // Get type references
      const typeReferences = this.symbolManager.findReferencesByType(
        symbol,
        'type-reference',
      );
      for (const ref of typeReferences) {
        const location = this.createLocationFromReference(ref);
        if (location) {
          locations.push(location);
        }
      }

      // Get constructor calls (if it's a class)
      if (symbol.kind === 'class') {
        const constructorCalls =
          this.symbolManager.findConstructorCalls(symbol);
        for (const call of constructorCalls) {
          const location = this.createLocationFromReference(call);
          if (location) {
            locations.push(location);
          }
        }
      }

      // Get static access
      const staticAccess = this.symbolManager.findStaticAccess(symbol);
      for (const access of staticAccess) {
        const location = this.createLocationFromReference(access);
        if (location) {
          locations.push(location);
        }
      }

      // Get import references
      const importReferences = this.symbolManager.findImportReferences(symbol);
      for (const ref of importReferences) {
        const location = this.createLocationFromReference(ref);
        if (location) {
          locations.push(location);
        }
      }
    } catch (error) {
      this.logger.debug(
        () => `Error getting relationship type references: ${error}`,
      );
    }

    return locations;
  }

  /**
   * Get the file URI for a symbol
   */
  private getSymbolFileUri(symbol: any): string | null {
    // Try to get from symbol's file path
    if (symbol.filePath) {
      return `file://${symbol.filePath}`;
    }

    // Try to find in symbol manager
    try {
      const files = this.symbolManager.findFilesForSymbol(symbol.name);
      if (files.length > 0) {
        return `file://${files[0]}`;
      }
    } catch (error) {
      this.logger.debug(() => `Error getting symbol file URI: ${error}`);
    }

    return null;
  }

  /**
   * Get the file URI for a reference
   */
  private getReferenceFileUri(reference: any): string | null {
    // Try to get from reference's file path
    if (reference.filePath) {
      return `file://${reference.filePath}`;
    }

    // Try to get from symbol's file path
    if (reference.symbol && reference.symbol.filePath) {
      return `file://${reference.symbol.filePath}`;
    }

    return null;
  }

  /**
   * Get word range at position (simplified implementation)
   */
  private getWordRangeAtPosition(
    document: TextDocument,
    position: Position,
  ): Range | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Simple word boundary detection
    const wordRegex = /\b\w+\b/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (offset >= start && offset <= end) {
        return {
          start: document.positionAt(start),
          end: document.positionAt(end),
        };
      }
    }

    return null;
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
