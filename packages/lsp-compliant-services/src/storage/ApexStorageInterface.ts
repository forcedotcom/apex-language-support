/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Interface for type references between Apex symbols
 */
export interface ApexReference {
  /** Source file where the reference originates */
  sourceFile: string;

  /** Target type or symbol being referenced */
  targetSymbol: string;

  /** Line number in source file */
  line: number;

  /** Column number in source file */
  column: number;

  /** Reference type (e.g., 'method-call', 'field-access', 'type-reference') */
  referenceType: string;

  /** Any additional context for the reference */
  context?: Record<string, unknown>;
}

/**
 * Information about a document symbol for LSP requests
 */
export interface DocumentSymbolInfo {
  /** Symbol name */
  name: string;
  /** Symbol kind (class, method, field, etc.) */
  kind: string;
  /** Symbol location */
  location: SymbolLocation;
  /** Child symbols */
  children?: DocumentSymbolInfo[];
  /** Symbol details */
  details?: SymbolDetails;
}

/**
 * Location information for a symbol
 */
export interface SymbolLocation {
  /** Start line (1-based) */
  startLine: number;
  /** Start column (1-based) */
  startColumn: number;
  /** End line (1-based) */
  endLine: number;
  /** End column (1-based) */
  endColumn: number;
  /** Identifier start line (1-based) */
  identifierStartLine?: number;
  /** Identifier start column (1-based) */
  identifierStartColumn?: number;
  /** Identifier end line (1-based) */
  identifierEndLine?: number;
  /** Identifier end column (1-based) */
  identifierEndColumn?: number;
}

/**
 * Detailed information about a symbol
 */
export interface SymbolDetails {
  /** Return type for methods */
  returnType?: string;
  /** Parameters for methods */
  parameters?: ParameterInfo[];
  /** Visibility modifier */
  visibility?: string;
  /** Whether the symbol is static */
  isStatic?: boolean;
  /** Whether the symbol is final */
  isFinal?: boolean;
  /** Whether the symbol is abstract */
  isAbstract?: boolean;
  /** Fully qualified name */
  fqn?: string;
}

/**
 * Parameter information for methods
 */
export interface ParameterInfo {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Whether parameter is optional */
  optional?: boolean;
}

/**
 * Symbol information for general use
 */
export interface SymbolInfo {
  /** Symbol name */
  name: string;
  /** Symbol kind */
  kind: string;
  /** Symbol location */
  location: SymbolLocation;
  /** Symbol details */
  details?: SymbolDetails;
}

/**
 * Interface for persistent storage of Apex language artifacts
 * This defines the contract for storing and retrieving AST, symbol tables, and references
 * between symbols.
 */
export interface ApexStorageInterface {
  /**
   * Initialize the storage system
   * @param options Configuration options for the storage
   * @returns Promise that resolves when initialization is complete
   */
  initialize(options?: Record<string, unknown>): Promise<void>;

  /**
   * Close and clean up the storage system
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;

  /**
   * Store AST for a specified Apex file
   * @param filePath Path to the Apex file
   * @param ast AST structure to store
   * @returns Promise resolving to success boolean
   */
  storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean>;

  /**
   * Retrieve AST for a specified Apex file
   * @param filePath Path to the Apex file
   * @returns Promise resolving to the AST or null if not found
   */
  retrieveAst(filePath: string): Promise<ApexClassInfo[] | null>;

  /**
   * Store type information for a specific type
   * @param typeName Fully qualified name of the type
   * @param typeInfo Type information to store
   * @returns Promise resolving to success boolean
   */
  storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean>;

  /**
   * Retrieve type information for a specific type
   * @param typeName Fully qualified name of the type
   * @returns Promise resolving to type info or null if not found
   */
  retrieveTypeInfo(typeName: string): Promise<TypeInfo | null>;

  /**
   * Store a reference between symbols
   * @param reference Reference information to store
   * @returns Promise resolving to success boolean
   */
  storeReference(reference: ApexReference): Promise<boolean>;

  /**
   * Retrieve all references to a specific symbol
   * @param targetSymbol Symbol to find references for
   * @returns Promise resolving to array of references
   */
  findReferencesTo(targetSymbol: string): Promise<ApexReference[]>;

  /**
   * Retrieve all references from a specific file
   * @param sourceFile Source file to find references from
   * @returns Promise resolving to array of references
   */
  findReferencesFrom(sourceFile: string): Promise<ApexReference[]>;

  /**
   * Delete all stored data for a specific file
   * @param filePath Path to the file to clear data for
   * @returns Promise resolving to success boolean
   */
  clearFile(filePath: string): Promise<boolean>;

  /**
   * Persist all in-memory changes to storage
   * @returns Promise resolving when persistence is complete
   */
  persist(): Promise<void>;

  /**
   * Get the text document for a given URI
   * @param uri The URI of the document to retrieve
   * @returns Promise resolving to the TextDocument or null if not found
   */
  getDocument(uri: string): Promise<TextDocument | null>;

  /**
   * Set a document for a given URI
   * @param uri The URI of the document to set
   * @param document The TextDocument to store
   * @returns Promise resolving to success boolean
   */
  setDocument(uri: string, document: TextDocument): Promise<boolean>;

  /**
   * Set a definition for a given symbol
   * @param symbolName The name of the symbol to set the definition for
   * @param definition The ApexReference to store as the definition
   * @returns Promise resolving to success boolean
   */
  setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean>;

  /**
   * Set references for a given symbol
   * @param symbolName The name of the symbol to set references for
   * @param references The ApexReference[] to store as references
   * @returns Promise resolving to success boolean
   */
  setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean>;

  /**
   * Get references for a given symbol
   * @param symbolName The name of the symbol to get references for
   * @returns Promise resolving to array of references
   */
  getReferences(symbolName: string): Promise<ApexReference[]>;

  /**
   * Get definition for a given symbol
   * @param symbolName The name of the symbol to get definition for
   * @returns Promise resolving to definition reference or undefined if not found
   */
  getDefinition(symbolName: string): Promise<ApexReference | undefined>;

  /**
   * Get hover information for a given symbol
   * @param symbolName The name of the symbol to get hover info for
   * @returns Promise resolving to hover text or undefined if not found
   */
  getHover(symbolName: string): Promise<string | undefined>;

  /**
   * Set hover information for a given symbol
   * @param symbolName The name of the symbol to set hover info for
   * @param hoverText The hover text to store
   * @returns Promise resolving to success boolean
   */
  setHover(symbolName: string, hoverText: string): Promise<boolean>;

  /**
   * Parse document and return document symbols
   * @param documentUri URI of the document to parse
   * @returns Promise resolving to array of document symbol information
   */
  getDocumentSymbols(documentUri: string): Promise<DocumentSymbolInfo[]>;

  /**
   * Get symbol information for a specific location in a document
   * @param documentUri URI of the document
   * @param line Line number (1-based)
   * @param column Column number (1-based)
   * @returns Promise resolving to symbol information or null if not found
   */
  getSymbolAtLocation(
    documentUri: string,
    line: number,
    column: number,
  ): Promise<SymbolInfo | null>;

  /**
   * Get all symbols in a document with their locations
   * @param documentUri URI of the document
   * @returns Promise resolving to array of symbol information
   */
  getAllSymbolsInDocument(documentUri: string): Promise<SymbolInfo[]>;

  /**
   * Find symbol by name in a specific document
   * @param symbolName Name of the symbol to find
   * @param documentUri URI of the document to search in
   * @returns Promise resolving to symbol information or null if not found
   */
  findSymbolInDocument(
    symbolName: string,
    documentUri: string,
  ): Promise<SymbolInfo | null>;

  /**
   * Get type information for a symbol in a specific document
   * @param symbolName Name of the symbol to get type info for
   * @param documentUri URI of the document
   * @returns Promise resolving to type information or null if not found
   */
  getSymbolTypeInfo(
    symbolName: string,
    documentUri: string,
  ): Promise<TypeInfo | null>;
}
