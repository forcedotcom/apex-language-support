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

import { ApexStorageManager } from '../storage/ApexStorageManager';
import { SymbolManagerFactory } from '@salesforce/apex-lsp-parser-ast';
import { transformParserToLspPosition } from '../utils/positionUtils';

/**
 * Interface for definition processing functionality
 */
export interface IDefinitionProcessor {
  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  processDefinition(params: DefinitionParams): Promise<Location[] | null>;
}

/**
 * Service for processing definition requests using ApexSymbolManager
 */
export class DefinitionProcessingService implements IDefinitionProcessor {
  private readonly logger: LoggerInterface;
  private symbolManager: any;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.symbolManager = SymbolManagerFactory.createSymbolManager();
  }

  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  public async processDefinition(
    params: DefinitionParams,
  ): Promise<Location[] | null> {
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
        return null;
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
      this.logger.error(() => `Error processing definition request: ${error}`);
      return null;
    }
  }

  /**
   * Extract symbol name from text at a specific position
   * @param text The document text
   * @param position The position in the text
   * @returns The extracted symbol name or null
   */
  public extractSymbolName(text: string, position: number): string | null {
    // Simple implementation - extract word at position
    const words = text.split(/\s+/);
    let currentPos = 0;

    for (const word of words) {
      const wordStart = currentPos;
      const wordEnd = currentPos + word.length;

      if (position >= wordStart && position <= wordEnd) {
        // Clean up the word (remove punctuation)
        return word.replace(/[^\w]/g, '');
      }

      currentPos = wordEnd + 1; // +1 for space
    }

    return null;
  }

  /**
   * Check if the context is static
   * @param text The document text
   * @param position The position in the text
   * @returns True if in static context
   */
  public isInStaticContext(text: string, position: number): boolean {
    // Simple implementation - check for static keyword before position
    const beforePosition = text.substring(0, position);
    return beforePosition.includes('static');
  }

  /**
   * Get access modifier context
   * @param text The document text
   * @param position The position in the text
   * @returns The access modifier or 'public' as default
   */
  public getAccessModifierContext(
    text: string,
    position: number,
  ): 'public' | 'private' | 'protected' | 'global' {
    // Simple implementation - check for access modifiers before position
    const beforePosition = text.substring(0, position);

    if (beforePosition.includes('private')) return 'private';
    if (beforePosition.includes('protected')) return 'protected';
    if (beforePosition.includes('global')) return 'global';

    return 'public'; // Default
  }

  /**
   * Extract symbol name at position from document
   * @param document The text document
   * @param position The position
   * @returns The symbol name or null
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
    // Use shared context analysis from ApexSymbolManager
    return this.symbolManager.createResolutionContext(
      document.getText(),
      params.position,
      document.uri,
    );
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
      start: transformParserToLspPosition({
        line: symbol.location.startLine,
        character: symbol.location.startColumn,
      }),
      end: transformParserToLspPosition({
        line: symbol.location.endLine,
        character: symbol.location.endColumn,
      }),
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
