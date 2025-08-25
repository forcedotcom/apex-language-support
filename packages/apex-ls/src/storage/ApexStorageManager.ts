/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
// ApexStorage interface was consolidated into IStorage in StorageInterface.ts
import type { IStorage } from './StorageInterface';

/**
 * Interface for type references between Apex symbols
 */
export interface ApexReference {
  sourceFile: string;
  targetSymbol: string;
  line: number;
  column: number;
  referenceType: string;
  context?: Record<string, unknown>;
}

/**
 * Extended storage interface for Apex-specific functionality
 */
export interface ApexStorageInterface {
  initialize(options?: Record<string, unknown>): Promise<void>;
  shutdown(): Promise<void>;
  storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean>;
  retrieveAst(filePath: string): Promise<ApexClassInfo[] | null>;
  storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean>;
  retrieveTypeInfo(typeName: string): Promise<TypeInfo | null>;
  storeReference(reference: ApexReference): Promise<boolean>;
  findReferencesTo(targetSymbol: string): Promise<ApexReference[]>;
  findReferencesFrom(sourceFile: string): Promise<ApexReference[]>;
  clearFile(filePath: string): Promise<boolean>;
  persist(): Promise<void>;
  getDocument(uri: string): Promise<TextDocument | null>;
  setDocument(uri: string, document: TextDocument): Promise<boolean>;
  setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean>;
  setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean>;
  getReferences(symbolName: string): Promise<ApexReference[]>;
  clearAll(): Promise<void>;
}

/**
 * Storage adapter that extends basic storage with Apex-specific functionality
 */
export class ApexStorageAdapter implements ApexStorageInterface {
  private astMap: Map<string, ApexClassInfo[]>;
  private typeInfoMap: Map<string, TypeInfo>;
  private referencesMap: Map<string, ApexReference[]>;
  private definitionsMap: Map<string, ApexReference>;
  private referencesToMap: Map<string, ApexReference[]>;
  private referencesFromMap: Map<string, ApexReference[]>;

  constructor(private baseStorage: IStorage) {
    this.astMap = new Map();
    this.typeInfoMap = new Map();
    this.referencesMap = new Map();
    this.definitionsMap = new Map();
    this.referencesToMap = new Map();
    this.referencesFromMap = new Map();
  }

  async initialize(options?: Record<string, unknown>): Promise<void> {
    await this.baseStorage.initialize(options as any);
  }

  async getDocument(uri: string): Promise<TextDocument | null> {
    return (await this.baseStorage.getDocument(uri)) || null;
  }

  async setDocument(uri: string, document: TextDocument): Promise<boolean> {
    try {
      await this.baseStorage.setDocument(uri, document);
      return true;
    } catch {
      return false;
    }
  }

  async clearFile(filePath: string): Promise<boolean> {
    try {
      this.astMap.delete(filePath);
      this.referencesFromMap.delete(filePath);
      await this.baseStorage.clearFile(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async clearAll(): Promise<void> {
    this.astMap.clear();
    this.typeInfoMap.clear();
    this.referencesMap.clear();
    this.definitionsMap.clear();
    this.referencesToMap.clear();
    this.referencesFromMap.clear();
    await this.baseStorage.clearAll();
  }

  async shutdown(): Promise<void> {
    await this.persist();
    await this.clearAll();
  }

  async storeAst(filePath: string, ast: ApexClassInfo[]): Promise<boolean> {
    try {
      this.astMap.set(filePath, ast);
      return true;
    } catch {
      return false;
    }
  }

  async retrieveAst(filePath: string): Promise<ApexClassInfo[] | null> {
    return this.astMap.get(filePath) || null;
  }

  async storeTypeInfo(typeName: string, typeInfo: TypeInfo): Promise<boolean> {
    try {
      this.typeInfoMap.set(typeName, typeInfo);
      return true;
    } catch {
      return false;
    }
  }

  async retrieveTypeInfo(typeName: string): Promise<TypeInfo | null> {
    return this.typeInfoMap.get(typeName) || null;
  }

  async storeReference(reference: ApexReference): Promise<boolean> {
    try {
      // Store reference in both directions
      let referencesTo = this.referencesToMap.get(reference.targetSymbol) || [];
      referencesTo.push(reference);
      this.referencesToMap.set(reference.targetSymbol, referencesTo);

      let referencesFrom =
        this.referencesFromMap.get(reference.sourceFile) || [];
      referencesFrom.push(reference);
      this.referencesFromMap.set(reference.sourceFile, referencesFrom);

      return true;
    } catch {
      return false;
    }
  }

  async findReferencesTo(targetSymbol: string): Promise<ApexReference[]> {
    return this.referencesToMap.get(targetSymbol) || [];
  }

  async findReferencesFrom(sourceFile: string): Promise<ApexReference[]> {
    return this.referencesFromMap.get(sourceFile) || [];
  }

  async persist(): Promise<void> {
    // No-op for now - implement if needed
  }

  async setDefinition(
    symbolName: string,
    definition: ApexReference,
  ): Promise<boolean> {
    try {
      this.definitionsMap.set(symbolName, definition);
      return true;
    } catch {
      return false;
    }
  }

  async setReferences(
    symbolName: string,
    references: ApexReference[],
  ): Promise<boolean> {
    try {
      this.referencesMap.set(symbolName, references);
      return true;
    } catch {
      return false;
    }
  }

  async getReferences(symbolName: string): Promise<ApexReference[]> {
    return this.referencesMap.get(symbolName) || [];
  }
}
