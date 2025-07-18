/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HashMap } from 'data-structure-typed';

import { ApexReference, ApexStorageInterface } from './ApexStorageInterface';

/**
 * ApexStorage is a singleton class that stores the hover, definition, and references for a given key.
 * It is used to store the hover, definition, and references for a given key.
 */
export class ApexStorage implements ApexStorageInterface {
  private static instance: ApexStorage;
  private hoverMap: HashMap<string, string> = new HashMap();
  private definitionMap: HashMap<string, ApexReference> = new HashMap();
  private referencesMap: HashMap<string, ApexReference[]> = new HashMap();
  private astMap: HashMap<string, ApexClassInfo[]> = new HashMap();
  private typeInfoMap: HashMap<string, TypeInfo> = new HashMap();
  private initialized = false;
  private documents: HashMap<string, TextDocument> = new HashMap();
  private constructor() {}

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
  public getHover(symbolName: string): string | undefined {
    return this.hoverMap.get(symbolName);
  }

  public setHover(symbolName: string, hoverText: string): void {
    this.hoverMap.set(symbolName, hoverText);
  }

  // Definition getters and setters
  public getDefinition(symbolName: string): ApexReference | undefined {
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
}
