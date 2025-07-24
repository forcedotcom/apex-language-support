/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { promises as fs } from 'fs';

import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import type {
  ApexReference,
  DocumentSymbolInfo,
  SymbolInfo,
} from '@salesforce/apex-lsp-compliant-services';
import { ApexStorageBase } from '@salesforce/apex-lsp-compliant-services';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Implementation of ApexStorageInterface for Node.js environments (VSCode extension).
 * This is a no-op implementation that doesn't actually store anything persistently.
 * In a real implementation, this would use Node.js filesystem APIs or a database.
 */
export class NodeFileSystemApexStorage extends ApexStorageBase {
  // In-memory storage
  private astMap: HashMap<string, ApexClassInfo[]> = new HashMap();
  private typeInfoMap: HashMap<string, TypeInfo> = new HashMap();
  private references: ApexReference[] = [];
  private documents: HashMap<string, TextDocument> = new HashMap();
  private initialized = false;
  private readonly logger = getLogger();

  constructor() {
    super();
  }

  /**
   * Initialize the storage system
   * @param options Configuration options for storage
   */
  async initialize(options?: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would:
    // - Create or open storage directory
    // - Initialize database connections
    // - Load existing data into memory

    this.logger.debug(
      () => `Initializing Node.js storage with options: ${options}`,
    );
    this.initialized = true;
  }

  /**
   * Close and clean up the storage system
   */
  async shutdown(): Promise<void> {
    // In a real implementation, this would:
    // - Close file handles
    // - Save any pending data
    // - Close database connections

    this.logger.debug(() => 'Shutting down Node.js storage');
    this.initialized = false;
  }

  /**
   * Store AST for a specified Apex file
   */
  async storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // In a real implementation, this would serialize and store
    // the AST to disk or database
    this.astMap.set(filePath, ast);
    return true;
  }

  /**
   * Retrieve AST for a specified Apex file
   */
  async retrieveAst(filePath: string): Promise<ApexClassInfo[] | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.astMap.get(filePath) || null;
  }

  /**
   * Store type information for a specific type
   */
  async storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.typeInfoMap.set(typeName, typeInfo);
    return true;
  }

  /**
   * Retrieve type information for a specific type
   */
  async retrieveTypeInfo(typeName: string): Promise<TypeInfo | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.typeInfoMap.get(typeName) || null;
  }

  /**
   * Store a reference between symbols
   */
  async storeReference(reference: ApexReference): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.references.push(reference);
    return true;
  }

  /**
   * Retrieve all references to a specific symbol
   */
  async findReferencesTo(targetSymbol: string): Promise<ApexReference[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.references.filter((ref) => ref.targetSymbol === targetSymbol);
  }

  /**
   * Retrieve all references from a specific file
   */
  async findReferencesFrom(sourceFile: string): Promise<ApexReference[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.references.filter((ref) => ref.sourceFile === sourceFile);
  }

  /**
   * Delete all stored data for a specific file
   */
  async clearFile(filePath: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.astMap.delete(filePath);
    this.references = this.references.filter(
      (ref) => ref.sourceFile !== filePath,
    );
    return true;
  }

  /**
   * Persist all in-memory changes to storage
   */
  async persist(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // In a real implementation, this would flush all in-memory
    // data to disk or database
    this.logger.debug(() => 'Persisting data to Node.js storage');
  }

  /**
   * Get the text document for a given URI
   * @param uri The URI of the document to retrieve
   * @returns Promise resolving to the TextDocument or null if not found
   */
  async getDocument(uri: string): Promise<TextDocument | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // Check if we have the document in memory
    const cachedDoc = this.documents.get(uri);
    if (cachedDoc) {
      return cachedDoc;
    }

    try {
      // Convert URI to file path
      const filePath = URI.parse(uri).fsPath;

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Create TextDocument
      const document = TextDocument.create(uri, 'apex', 0, content);

      // Cache the document
      this.documents.set(uri, document);

      return document;
    } catch (error) {
      this.logger.error(() => `Error reading document ${uri}: ${error}`);
      return null;
    }
  }

  async getHover(symbolName: string): Promise<string | undefined> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // For now, return undefined as hover is not implemented yet
    return undefined;
  }

  async setHover(symbolName: string, hoverText: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // For now, just return true as hover is not critical for document symbols
    return true;
  }

  async getDefinition(symbolName: string): Promise<ApexReference | undefined> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // For now, return undefined as definition lookup is not critical for document symbols
    return undefined;
  }

  async setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // For now, just return true as this is not critical for document symbols
    return true;
  }

  async getReferences(symbolName: string): Promise<ApexReference[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    return this.references.filter((ref) => ref.targetSymbol === symbolName);
  }

  async setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // Remove existing references for this symbol
    this.references = this.references.filter(
      (ref) => ref.targetSymbol !== symbolName,
    );
    // Add new references
    this.references.push(...references);
    return true;
  }

  async setDocument(uri: string, document: TextDocument): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // Store the document in memory cache
    this.documents.set(uri, document);
    return true;
  }

  // Override protected implementation methods for parser data access
  protected async _getDocumentSymbolsImpl(
    documentUri: string,
  ): Promise<DocumentSymbolInfo[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.logger.debug(() => `Getting document symbols for: ${documentUri}`);
    // Implementation would parse document and return document symbols
    // This is a placeholder - actual implementation would use parser internally
    return [];
  }

  protected async _getSymbolAtLocationImpl(
    documentUri: string,
    line: number,
    column: number,
  ): Promise<SymbolInfo | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.logger.debug(
      () => `Getting symbol at location ${line}:${column} in ${documentUri}`,
    );
    // Implementation would find symbol at specific location
    // This is a placeholder - actual implementation would use parser internally
    return null;
  }

  protected async _getAllSymbolsInDocumentImpl(
    documentUri: string,
  ): Promise<SymbolInfo[]> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.logger.debug(() => `Getting all symbols in document: ${documentUri}`);
    // Implementation would get all symbols in document
    // This is a placeholder - actual implementation would use parser internally
    return [];
  }

  protected async _findSymbolInDocumentImpl(
    symbolName: string,
    documentUri: string,
  ): Promise<SymbolInfo | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.logger.debug(
      () => `Finding symbol ${symbolName} in document: ${documentUri}`,
    );
    // Implementation would find symbol by name in document
    // This is a placeholder - actual implementation would use parser internally
    return null;
  }

  protected async _getSymbolTypeInfoImpl(
    symbolName: string,
    documentUri: string,
  ): Promise<TypeInfo | null> {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    this.logger.debug(
      () =>
        `Getting type info for symbol ${symbolName} in document: ${documentUri}`,
    );
    // Implementation would get type info for symbol
    // This is a placeholder - actual implementation would use parser internally
    return null;
  }
}
