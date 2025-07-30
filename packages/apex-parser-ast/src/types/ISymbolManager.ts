/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol } from '../types/symbol';
import {
  ReferenceResult,
  DependencyAnalysis,
  ReferenceType,
} from '../symbols/ApexSymbolGraph';
import { type EnumValue } from '@salesforce/apex-lsp-shared';
import { FQNOptions } from '../utils/FQNUtils';

/**
 * Context for symbol resolution
 */
export interface SymbolResolutionContext {
  sourceFile: string;
  sourceSymbol?: ApexSymbol;
  importStatements: string[];
  namespaceContext: string;
  currentScope: string;
  scopeChain: string[];
  expectedType?: string;
  parameterTypes: string[];
  returnType?: string;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  isStatic: boolean;
  relationshipType?: EnumValue<typeof ReferenceType>;
  inheritanceChain: string[];
  interfaceImplementations: string[];
}

/**
 * Result of symbol resolution
 */
export interface SymbolResolutionResult {
  symbol: ApexSymbol;
  filePath: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: ApexSymbol[];
  resolutionContext?: string;
}

/**
 * Interface defining the contract for symbol managers
 * This allows for both production and test implementations
 */
export interface ISymbolManager {
  /**
   * Add a symbol to the manager
   */
  addSymbol(symbol: ApexSymbol, filePath: string): void;

  /**
   * Get symbol by ID
   */
  getSymbol(symbolId: string): ApexSymbol | null;

  /**
   * Find all symbols with a given name
   */
  findSymbolByName(name: string): ApexSymbol[];

  /**
   * Find a symbol by its fully qualified name
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null;

  /**
   * Find all symbols in a specific file
   */
  findSymbolsInFile(filePath: string): ApexSymbol[];

  /**
   * Find files containing a symbol with the given name
   */
  findFilesForSymbol(name: string): string[];

  /**
   * Resolve a symbol by name with context
   * @param name The symbol name to resolve
   * @param context The resolution context
   * @returns The resolution result
   */
  resolveSymbol(
    name: string,
    context: SymbolResolutionContext,
  ): SymbolResolutionResult;

  /**
   * Get all symbols for completion purposes
   * @returns Array of all available symbols
   */
  getAllSymbolsForCompletion(): ApexSymbol[];

  /**
   * Find references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[];

  /**
   * Find references from a symbol
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[];

  /**
   * Find related symbols by relationship type
   */
  findRelatedSymbols(
    symbol: ApexSymbol,
    relationshipType: EnumValue<typeof ReferenceType>,
  ): ApexSymbol[];

  /**
   * Analyze dependencies for a symbol
   */
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis;

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(): string[][];

  /**
   * Get statistics about the symbol manager
   */
  getStats(): {
    totalSymbols: number;
    totalFiles: number;
    totalReferences: number;
    circularDependencies: number;
    cacheHitRate: number;
  };

  /**
   * Clear all symbols
   */
  clear(): void;

  /**
   * Remove a file's symbols
   */
  removeFile(filePath: string): void;

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void;

  /**
   * Create comprehensive resolution context for symbol lookup
   * This is a shared utility for all LSP services that need context-aware symbol resolution
   */
  createResolutionContext(
    documentText: string,
    position: any,
    sourceFile: string,
  ): SymbolResolutionContext;

  /**
   * Construct fully qualified name for a symbol using hierarchical relationships
   * @param symbol The symbol to construct FQN for
   * @param options Options for FQN generation
   * @returns The fully qualified name
   */
  constructFQN(symbol: ApexSymbol, options?: FQNOptions): string;

  /**
   * Get the immediate containing type (class, interface, enum) for a symbol
   * @param symbol The symbol to find the containing type for
   * @returns The containing type symbol or null if not found
   */
  getContainingType(symbol: ApexSymbol): ApexSymbol | null;

  /**
   * Get the full chain of ancestor types for a symbol
   * @param symbol The symbol to get ancestors for
   * @returns Array of ancestor symbols from top-level to closest parent
   */
  getAncestorChain(symbol: ApexSymbol): ApexSymbol[];
}
