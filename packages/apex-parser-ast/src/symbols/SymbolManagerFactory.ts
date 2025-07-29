/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ISymbolManager,
  SymbolResolutionContext,
  SymbolResolutionResult,
} from '../types/ISymbolManager';
import { ApexSymbolManager } from './ApexSymbolManager';
import { ApexSymbol } from '../types/symbol';

/**
 * Factory for creating symbol manager instances
 * Supports both production and test implementations
 */
export class SymbolManagerFactory {
  private static instance: ISymbolManager | null = null;
  private static testMode = false;

  /**
   * Set test mode to use mock implementations
   */
  static setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    this.instance = null; // Clear cached instance
  }

  /**
   * Create or get a symbol manager instance
   */
  static createSymbolManager(): ISymbolManager {
    if (this.instance) {
      return this.instance;
    }

    if (this.testMode) {
      this.instance = new TestSymbolManager();
    } else {
      this.instance = new ApexSymbolManager();
    }

    return this.instance;
  }

  /**
   * Reset the factory (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.testMode = false;
  }
}

/**
 * Test implementation of ISymbolManager for testing purposes
 */
class TestSymbolManager implements ISymbolManager {
  private symbols: Map<string, ApexSymbol> = new Map();
  private fileSymbols: Map<string, ApexSymbol[]> = new Map();
  private symbolCount = 0;

  addSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolId = `${symbol.name}:${filePath}`;
    this.symbols.set(symbolId, symbol);
    this.symbolCount++;

    // Track symbols by file
    if (!this.fileSymbols.has(filePath)) {
      this.fileSymbols.set(filePath, []);
    }
    this.fileSymbols.get(filePath)!.push(symbol);
  }

  getSymbol(symbolId: string): ApexSymbol | null {
    return this.symbols.get(symbolId) || null;
  }

  findSymbolByName(name: string): ApexSymbol[] {
    return Array.from(this.symbols.values()).filter(
      (symbol) => symbol.name === name,
    );
  }

  findSymbolByFQN(fqn: string): ApexSymbol | null {
    return (
      Array.from(this.symbols.values()).find((symbol) => symbol.fqn === fqn) ||
      null
    );
  }

  findSymbolsInFile(filePath: string): ApexSymbol[] {
    return this.fileSymbols.get(filePath) || [];
  }

  findFilesForSymbol(name: string): string[] {
    const files = new Set<string>();
    for (const [filePath, symbols] of this.fileSymbols.entries()) {
      if (symbols.some((symbol) => symbol.name === name)) {
        files.add(filePath);
      }
    }
    return Array.from(files);
  }

  resolveSymbol(
    name: string,
    context: SymbolResolutionContext,
  ): SymbolResolutionResult {
    const candidates = this.findSymbolByName(name);

    if (candidates.length === 0) {
      return {
        symbol: null as any,
        filePath: context.sourceFile,
        confidence: 0,
        isAmbiguous: false,
        resolutionContext: 'No symbols found with this name',
      };
    }

    if (candidates.length === 1) {
      return {
        symbol: candidates[0],
        filePath: context.sourceFile,
        confidence: 0.9,
        isAmbiguous: false,
        resolutionContext: 'Single symbol found',
      };
    }

    // Multiple candidates - return the first one
    return {
      symbol: candidates[0],
      filePath: context.sourceFile,
      confidence: 0.7,
      isAmbiguous: true,
      candidates,
      resolutionContext: 'Multiple candidates found',
    };
  }

  getAllSymbolsForCompletion(): ApexSymbol[] {
    const allSymbols: ApexSymbol[] = [];
    for (const symbols of this.fileSymbols.values()) {
      allSymbols.push(...symbols);
    }
    return allSymbols;
  }

  findReferencesTo(symbol: ApexSymbol): any[] {
    // Mock implementation - return empty array for now
    return [];
  }

  findReferencesFrom(symbol: ApexSymbol): any[] {
    // Mock implementation - return empty array for now
    return [];
  }

  findRelatedSymbols(symbol: ApexSymbol, relationshipType: any): ApexSymbol[] {
    // Mock implementation - return empty array for now
    return [];
  }

  analyzeDependencies(symbol: ApexSymbol): any {
    // Mock implementation
    return {
      dependencies: [],
      dependents: [],
      impactScore: 0,
      circularDependencies: [],
    };
  }

  detectCircularDependencies(): string[][] {
    // Mock implementation - return empty array for now
    return [];
  }

  getStats(): {
    totalSymbols: number;
    totalFiles: number;
    totalReferences: number;
    circularDependencies: number;
    cacheHitRate: number;
  } {
    return {
      totalSymbols: this.symbolCount,
      totalFiles: this.fileSymbols.size,
      totalReferences: 0,
      circularDependencies: 0,
      cacheHitRate: 0,
    };
  }

  clear(): void {
    this.symbols.clear();
    this.fileSymbols.clear();
    this.symbolCount = 0;
  }

  removeFile(filePath: string): void {
    const symbols = this.fileSymbols.get(filePath) || [];
    symbols.forEach((symbol) => {
      const symbolId = `${symbol.name}:${filePath}`;
      this.symbols.delete(symbolId);
      this.symbolCount--;
    });
    this.fileSymbols.delete(filePath);
  }

  optimizeMemory(): void {
    // Mock implementation - no-op for tests
  }

  createResolutionContext(
    documentText: string,
    position: any,
    sourceFile: string,
  ): SymbolResolutionContext {
    // Mock implementation for tests
    return {
      sourceFile,
      namespaceContext: 'public',
      currentScope: 'global',
      scopeChain: ['global'],
      expectedType: undefined,
      parameterTypes: [],
      accessModifier: 'public',
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
      importStatements: [],
    };
  }
}
