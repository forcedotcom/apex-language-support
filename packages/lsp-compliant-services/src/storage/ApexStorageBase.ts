/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type {
  ApexReference,
  DocumentSymbolInfo,
  SymbolInfo,
} from './ApexStorageInterface';
import { ApexStorageInterface } from './ApexStorageInterface';

/**
 * Abstract base class that implements ApexStorageInterface
 * Provides common implementations for parser data access methods
 * while requiring subclasses to implement storage-specific operations
 */
export abstract class ApexStorageBase implements ApexStorageInterface {
  /**
   * Initialize the storage system
   * @param options Configuration options for the storage
   * @returns Promise that resolves when initialization is complete
   */
  abstract initialize(options?: Record<string, unknown>): Promise<void>;

  /**
   * Close and clean up the storage system
   * @returns Promise that resolves when shutdown is complete
   */
  abstract shutdown(): Promise<void>;

  /**
   * Store AST for a specified Apex file
   * @param filePath Path to the Apex file
   * @param ast AST structure to store
   * @returns Promise resolving to success boolean
   */
  abstract storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean>;

  /**
   * Retrieve AST for a specified Apex file
   * @param filePath Path to the Apex file
   * @returns Promise resolving to the AST or null if not found
   */
  abstract retrieveAst(filePath: string): Promise<ApexClassInfo[] | null>;

  /**
   * Store type information for a specific type
   * @param typeName Fully qualified name of the type
   * @param typeInfo Type information to store
   * @returns Promise resolving to success boolean
   */
  abstract storeTypeInfo(
    typeName: string,
    typeInfo: TypeInfo,
  ): Promise<boolean>;

  /**
   * Retrieve type information for a specific type
   * @param typeName Fully qualified name of the type
   * @returns Promise resolving to type info or null if not found
   */
  abstract retrieveTypeInfo(typeName: string): Promise<TypeInfo | null>;

  /**
   * Store a reference between symbols
   * @param reference Reference information to store
   * @returns Promise resolving to success boolean
   */
  abstract storeReference(reference: ApexReference): Promise<boolean>;

  /**
   * Retrieve all references to a specific symbol
   * @param targetSymbol Symbol to find references for
   * @returns Promise resolving to array of references
   */
  abstract findReferencesTo(targetSymbol: string): Promise<ApexReference[]>;

  /**
   * Retrieve all references from a specific file
   * @param sourceFile Source file to find references from
   * @returns Promise resolving to array of references
   */
  abstract findReferencesFrom(sourceFile: string): Promise<ApexReference[]>;

  /**
   * Delete all stored data for a specific file
   * @param filePath Path to the file to clear data for
   * @returns Promise resolving to success boolean
   */
  abstract clearFile(filePath: string): Promise<boolean>;

  /**
   * Persist all in-memory changes to storage
   * @returns Promise resolving when persistence is complete
   */
  abstract persist(): Promise<void>;

  /**
   * Get the text document for a given URI
   * @param uri The URI of the document to retrieve
   * @returns Promise resolving to the TextDocument or null if not found
   */
  abstract getDocument(uri: string): Promise<TextDocument | null>;

  /**
   * Set a document for a given URI
   * @param uri The URI of the document to set
   * @param document The TextDocument to store
   * @returns Promise resolving to success boolean
   */
  abstract setDocument(uri: string, document: TextDocument): Promise<boolean>;

  /**
   * Delete a document for a given URI
   * @param uri The URI of the document to delete
   * @returns Promise resolving to success boolean
   */
  abstract deleteDocument(uri: string): Promise<boolean>;

  /**
   * Set a definition for a given symbol
   * @param symbolName The name of the symbol to set the definition for
   * @param definition The ApexReference to store as the definition
   * @returns Promise resolving to success boolean
   */
  abstract setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean>;

  /**
   * Set references for a given symbol
   * @param symbolName The name of the symbol to set references for
   * @param references The ApexReference[] to store as references
   * @returns Promise resolving to success boolean
   */
  abstract setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean>;

  /**
   * Get references for a given symbol
   * @param symbolName The name of the symbol to get references for
   * @returns Promise resolving to array of references
   */
  abstract getReferences(symbolName: string): Promise<ApexReference[]>;

  /**
   * Get definition for a given symbol
   * @param symbolName The name of the symbol to get definition for
   * @returns Promise resolving to definition reference or undefined if not found
   */
  abstract getDefinition(
    symbolName: string,
  ): Promise<ApexReference | undefined>;

  /**
   * Get hover information for a given symbol
   * @param symbolName The name of the symbol to get hover info for
   * @returns Promise resolving to hover text or undefined if not found
   */
  abstract getHover(symbolName: string): Promise<string | undefined>;

  /**
   * Set hover information for a given symbol
   * @param symbolName The name of the symbol to set hover info for
   * @param hoverText The hover text to store
   * @returns Promise resolving to success boolean
   */
  abstract setHover(symbolName: string, hoverText: string): Promise<boolean>;

  // Concrete implementations for parser data access methods

  /**
   * Parse document and return document symbols
   * @param documentUri URI of the document to parse
   * @returns Promise resolving to array of document symbol information
   */
  async getDocumentSymbols(documentUri: string): Promise<DocumentSymbolInfo[]> {
    return this._getDocumentSymbolsImpl(documentUri);
  }

  /**
   * Get symbol information for a specific location in a document
   * @param documentUri URI of the document
   * @param line Line number (1-based)
   * @param column Column number (1-based)
   * @returns Promise resolving to symbol information or null if not found
   */
  async getSymbolAtLocation(
    documentUri: string,
    line: number,
    column: number,
  ): Promise<SymbolInfo | null> {
    return this._getSymbolAtLocationImpl(documentUri, line, column);
  }

  /**
   * Get all symbols in a document with their locations
   * @param documentUri URI of the document
   * @returns Promise resolving to array of symbol information
   */
  async getAllSymbolsInDocument(documentUri: string): Promise<SymbolInfo[]> {
    return this._getAllSymbolsInDocumentImpl(documentUri);
  }

  /**
   * Find symbol by name in a specific document
   * @param symbolName Name of the symbol to find
   * @param documentUri URI of the document to search in
   * @returns Promise resolving to symbol information or null if not found
   */
  async findSymbolInDocument(
    symbolName: string,
    documentUri: string,
  ): Promise<SymbolInfo | null> {
    return this._findSymbolInDocumentImpl(symbolName, documentUri);
  }

  /**
   * Get type information for a symbol in a specific document
   * @param symbolName Name of the symbol to get type info for
   * @param documentUri URI of the document
   * @returns Promise resolving to type information or null if not found
   */
  async getSymbolTypeInfo(
    symbolName: string,
    documentUri: string,
  ): Promise<TypeInfo | null> {
    return this._getSymbolTypeInfoImpl(symbolName, documentUri);
  }

  // Protected implementation methods - can be overridden by subclasses

  protected async _getDocumentSymbolsImpl(
    documentUri: string,
  ): Promise<DocumentSymbolInfo[]> {
    throw new Error(
      "Operation 'getDocumentSymbols' not implemented. Parser data access requires concrete implementation.",
    );
  }

  protected async _getSymbolAtLocationImpl(
    documentUri: string,
    line: number,
    column: number,
  ): Promise<SymbolInfo | null> {
    throw new Error(
      "Operation 'getSymbolAtLocation' not implemented. Parser data access requires concrete implementation.",
    );
  }

  protected async _getAllSymbolsInDocumentImpl(
    documentUri: string,
  ): Promise<SymbolInfo[]> {
    throw new Error(
      "Operation 'getAllSymbolsInDocument' not implemented. Parser data access requires concrete implementation.",
    );
  }

  protected async _findSymbolInDocumentImpl(
    symbolName: string,
    documentUri: string,
  ): Promise<SymbolInfo | null> {
    throw new Error(
      "Operation 'findSymbolInDocument' not implemented. Parser data access requires concrete implementation.",
    );
  }

  protected async _getSymbolTypeInfoImpl(
    symbolName: string,
    documentUri: string,
  ): Promise<TypeInfo | null> {
    throw new Error(
      "Operation 'getSymbolTypeInfo' not implemented. Parser data access requires concrete implementation.",
    );
  }
}
