/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DefinitionParams,
  Location,
  Range,
  Position,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ApexStorageManager } from '../storage/ApexStorageManager';

/**
 * Interface for definition processing functionality
 */
export interface IDefinitionProcessor {
  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  processDefinition(params: DefinitionParams): Promise<Location[]>;
}

/**
 * Service for processing definition requests using ApexSymbolManager
 */
export class DefinitionProcessingService implements IDefinitionProcessor {
  private readonly logger: LoggerInterface;
  private symbolManager: ApexSymbolManager;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.symbolManager = new ApexSymbolManager();
  }

  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  public async processDefinition(
    params: DefinitionParams,
  ): Promise<Location[]> {
    this.logger.debug(
      () => `Processing definition request for: ${params.textDocument.uri}`,
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

      // Get definition locations
      const locations = await this.getDefinitionLocations(
        result.symbol,
        context,
      );

      this.logger.debug(
        () =>
          `Returning ${locations.length} definition locations for: ${symbolName}`,
      );

      return locations;
    } catch (error) {
      this.logger.error(() => `Error processing definition: ${error}`);
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
    params: DefinitionParams,
  ) {
    const text = document.getText();

    return {
      sourceFile: document.uri,
      importStatements: this.extractImportStatements(text),
      namespaceContext: this.extractNamespaceContext(text),
      currentScope: 'current-scope', // Would be extracted from AST
      scopeChain: ['current-scope'],
      expectedType: undefined,
      parameterTypes: [],
      accessModifier: 'public' as const,
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
    };
  }

  /**
   * Get definition locations for a symbol
   */
  private async getDefinitionLocations(
    symbol: any,
    context: any,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Get the primary definition location
      const primaryLocation = this.createLocationFromSymbol(symbol);
      if (primaryLocation) {
        locations.push(primaryLocation);
      }

      // Get related definitions through relationships
      const relatedDefinitions = await this.getRelatedDefinitions(symbol);
      locations.push(...relatedDefinitions);

      // Get interface implementations if applicable
      if (symbol.kind === 'class') {
        const interfaceDefinitions = await this.getInterfaceDefinitions(symbol);
        locations.push(...interfaceDefinitions);
      }

      // Get inherited definitions if applicable
      if (symbol.kind === 'class' || symbol.kind === 'interface') {
        const inheritedDefinitions = await this.getInheritedDefinitions(symbol);
        locations.push(...inheritedDefinitions);
      }
    } catch (error) {
      this.logger.debug(() => `Error getting definition locations: ${error}`);
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
        line: symbol.location.startLine - 1, // LSP uses 0-based lines
        character: symbol.location.startColumn - 1, // LSP uses 0-based characters
      },
      end: {
        line: symbol.location.endLine - 1,
        character: symbol.location.endColumn - 1,
      },
    };

    return { uri, range };
  }

  /**
   * Get related definitions through relationships
   */
  private async getRelatedDefinitions(symbol: any): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Find symbols that reference this symbol
      const references = this.symbolManager.findReferencesTo(symbol);

      for (const reference of references) {
        // Get the source symbol from the reference
        const location = this.createLocationFromSymbol(reference.symbol);
        if (location) {
          locations.push(location);
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting related definitions: ${error}`);
    }

    return locations;
  }

  /**
   * Get interface definitions for a class
   */
  private async getInterfaceDefinitions(symbol: any): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      if (symbol.interfaces && Array.isArray(symbol.interfaces)) {
        for (const interfaceName of symbol.interfaces) {
          const interfaceSymbol =
            this.symbolManager.findSymbolByFQN(interfaceName);
          if (interfaceSymbol) {
            const location = this.createLocationFromSymbol(interfaceSymbol);
            if (location) {
              locations.push(location);
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting interface definitions: ${error}`);
    }

    return locations;
  }

  /**
   * Get inherited definitions for a class or interface
   */
  private async getInheritedDefinitions(symbol: any): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Get superclass definition
      if (symbol.superClass) {
        const superClassSymbol = this.symbolManager.findSymbolByFQN(
          symbol.superClass,
        );
        if (superClassSymbol) {
          const location = this.createLocationFromSymbol(superClassSymbol);
          if (location) {
            locations.push(location);
          }
        }
      }

      // Get extended interface definitions
      if (symbol.kind === 'interface' && symbol.interfaces) {
        for (const interfaceName of symbol.interfaces) {
          const interfaceSymbol =
            this.symbolManager.findSymbolByFQN(interfaceName);
          if (interfaceSymbol) {
            const location = this.createLocationFromSymbol(interfaceSymbol);
            if (location) {
              locations.push(location);
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting inherited definitions: ${error}`);
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
