/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol, SymbolResolutionStrategy } from '../types/symbol';
import {
  ReferenceResult,
  DependencyAnalysis,
  ReferenceType,
} from '../symbols/ApexSymbolGraph';
import { type EnumValue } from '@salesforce/apex-lsp-shared';
import { FQNOptions } from '../utils/FQNUtils';
import { TypeReference } from '../types/typeReference';

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

  /**
   * Get TypeReference data at a specific position in a file
   * This provides precise AST-based position data for enhanced symbol resolution
   * @param filePath The file path to search in
   * @param position The position to search for references (1-based line index, 0-based column index)
   * @returns Array of TypeReference objects at the position
   */
  getReferencesAtPosition(
    filePath: string,
    position: { line: number; character: number },
  ): TypeReference[];

  /**
   * Get the most specific symbol at a given position using explicit resolution strategy
   * This provides unified access to different resolution strategies for LSP services
   * @param fileUri The file URI to search in
   * @param position The position to search for symbols (1-based line index, 0-based column index)
   * @param strategy The resolution strategy to use
   * @returns The most specific symbol at the position, or null if not found
   */
  getSymbolAtPosition(
    fileUri: string,
    position: { line: number; character: number },
    strategy?: SymbolResolutionStrategy,
  ): ApexSymbol | null;

  /**
   * @deprecated Use getSymbolAtPosition(uri, position, 'scope') instead
   * Get the most specific symbol at a given position in a file
   * This provides reliable position-based symbol lookup for LSP services
   * @param fileUri The file URI to search in
   * @param position The position to search for symbols (1-based line index, 0-based column index)
   * @returns The most specific symbol at the position, or null if not found
   */
  getSymbolAtPositionWithinScope(
    fileUri: string,
    position: { line: number; character: number },
  ): ApexSymbol | null;

  /**
   * @deprecated Use getSymbolAtPosition(uri, position, strategy) instead
   * Get the most specific symbol at a given position using strategy-based resolution
   * @param fileUri The file URI to search in
   * @param position The position to search for symbols (1-based line index, 0-based column index)
   * @param requestType The type of LSP request (hover, definition, references, etc.)
   * @returns The most specific symbol at the position, or null if not found
   */
  getSymbolAtPositionWithStrategy(
    fileUri: string,
    position: { line: number; character: number },
    requestType?: string,
  ): ApexSymbol | null;

  /**
   * Resolve a symbol using the appropriate resolution strategy
   * @param request The resolution request with type and position information
   * @param context The resolution context for the request
   * @returns Promise resolving to the resolution result
   */
  resolveSymbolWithStrategy(
    request: any,
    context: SymbolResolutionContext,
  ): Promise<{ strategy: string; success: boolean }>;

  /**
   * Create enhanced resolution context with request type information
   * @param documentText The document text for context analysis
   * @param position The position in the document (1-based line index, 0-based column index)
   * @param sourceFile The source file path
   * @param requestType The type of LSP request
   * @returns Enhanced resolution context with request type information
   */
  createResolutionContextWithRequestType(
    documentText: string,
    position: { line: number; character: number },
    sourceFile: string,
    requestType?: string,
  ): SymbolResolutionContext & {
    requestType?: string;
    position?: { line: number; character: number };
  };
}
