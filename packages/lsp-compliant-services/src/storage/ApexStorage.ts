/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
// HashMap replaced with native Map

import { ApexStorageBase } from './ApexStorageBase';
import type {
  ApexReference,
  DocumentSymbolInfo,
  SymbolInfo,
} from './ApexStorageInterface';

/**
 * ApexStorage is a singleton class that stores the hover, definition, and references for a given key.
 * It is used to store the hover, definition, and references for a given key.
 */
export class ApexStorage extends ApexStorageBase {
  private static instance: ApexStorage;
  private hoverMap: Map<string, string> = new Map();
  private definitionMap: Map<string, ApexReference> = new Map();
  private referencesMap: Map<string, ApexReference[]> = new Map();
  private astMap: Map<string, ApexClassInfo[]> = new Map();
  private typeInfoMap: Map<string, TypeInfo> = new Map();
  private initialized = false;
  private documents: Map<string, TextDocument> = new Map();
  private constructor() {
    super();
  }

  public static getInstance(): ApexStorage {
    if (!ApexStorage.instance) {
      ApexStorage.instance = new ApexStorage();
    }
    return ApexStorage.instance;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean> {
    this.astMap.set(filePath, ast);
    return true;
  }

  async retrieveAst(filePath: string): Promise<ApexClassInfo[] | null> {
    return this.astMap.get(filePath) || null;
  }

  async storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean> {
    this.typeInfoMap.set(typeName, typeInfo);
    return true;
  }

  async retrieveTypeInfo(typeName: string): Promise<TypeInfo | null> {
    return this.typeInfoMap.get(typeName) || null;
  }

  async storeReference(reference: ApexReference): Promise<boolean> {
    const refs = this.referencesMap.get(reference.targetSymbol) || [];
    refs.push(reference);
    this.referencesMap.set(reference.targetSymbol, refs);
    return true;
  }

  async findReferencesTo(targetSymbol: string): Promise<ApexReference[]> {
    return this.referencesMap.get(targetSymbol) || [];
  }

  async findReferencesFrom(sourceFile: string): Promise<ApexReference[]> {
    return Array.from(this.referencesMap.values())
      .flat()
      .filter((ref) => ref.sourceFile === sourceFile);
  }

  async clearFile(filePath: string): Promise<boolean> {
    this.astMap.delete(filePath);
    return true;
  }

  async persist(): Promise<void> {
    // No-op for in-memory storage
  }

  async getDocument(uri: string): Promise<TextDocument | null> {
    return this.documents.get(uri) || null;
  }

  async setDocument(uri: string, document: TextDocument): Promise<boolean> {
    this.documents.set(uri, document);
    return true;
  }

  // Hover getters and setters
  public async getHover(symbolName: string): Promise<string | undefined> {
    return this.hoverMap.get(symbolName);
  }

  public async setHover(
    symbolName: string,
    hoverText: string,
  ): Promise<boolean> {
    this.hoverMap.set(symbolName, hoverText);
    return true;
  }

  // Definition getters and setters
  public async getDefinition(
    symbolName: string,
  ): Promise<ApexReference | undefined> {
    return this.definitionMap.get(symbolName);
  }

  public async setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean> {
    this.definitionMap.set(symbolName, definition);
    return true;
  }

  // References getters and setters
  public async getReferences(symbolName: string): Promise<ApexReference[]> {
    return this.referencesMap.get(symbolName) || [];
  }

  public async setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean> {
    this.referencesMap.set(symbolName, references);
    return true;
  }

  // Override protected implementation methods for parser data access
  protected async _getDocumentSymbolsImpl(
    documentUri: string,
  ): Promise<DocumentSymbolInfo[]> {
    // Implementation would parse document and return document symbols
    // This is a placeholder - actual implementation would use parser internally
    return [];
  }

  protected async _getSymbolAtLocationImpl(
    documentUri: string,
    line: number,
    column: number,
  ): Promise<SymbolInfo | null> {
    // Implementation would find symbol at specific location
    // This is a placeholder - actual implementation would use parser internally
    return null;
  }

  protected async _getAllSymbolsInDocumentImpl(
    documentUri: string,
  ): Promise<SymbolInfo[]> {
    // Implementation would get all symbols in document
    // This is a placeholder - actual implementation would use parser internally
    return [];
  }

  protected async _findSymbolInDocumentImpl(
    symbolName: string,
    documentUri: string,
  ): Promise<SymbolInfo | null> {
    // Implementation would find symbol by name in document
    // This is a placeholder - actual implementation would use parser internally
    return null;
  }

  protected async _getSymbolTypeInfoImpl(
    symbolName: string,
    documentUri: string,
  ): Promise<TypeInfo | null> {
    // Implementation would get type info for symbol
    // This is a placeholder - actual implementation would use parser internally
    return null;
  }
}
