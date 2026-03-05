/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbol,
  SymbolResolutionStrategy,
  SymbolTable,
} from '../types/symbol';
import {
  ReferenceResult,
  DependencyAnalysis,
  ReferenceType,
} from '../symbols/ApexSymbolGraph';
import { type EnumValue } from '@salesforce/apex-lsp-shared';
import { FQNOptions } from '../utils/FQNUtils';
import { SymbolReference } from '../types/symbolReference';
import type {
  ApexComment,
  CommentAssociation,
} from '../parser/listeners/ApexCommentCollectorListener';
import type { GraphData, FileGraphData, TypeGraphData } from '../types/graph';
import { Effect } from 'effect';
import type { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';

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
  symbol: ApexSymbol | null;
  fileUri: string;
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
  addSymbol(symbol: ApexSymbol, fileUri: string): void;

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
   * Find the fully qualified name for a standard Apex class
   * @param className The class name without namespace (e.g., 'Assert', 'List')
   * @returns The FQN if found (e.g., 'System.Assert', 'System.List'), null otherwise
   */
  findFQNForStandardClass(className: string): string | null;

  /**
   * Find all symbols in a specific file
   */
  findSymbolsInFile(fileUri: string): ApexSymbol[];

  /**
   * Find files containing a symbol with the given name
   */
  findFilesForSymbol(name: string): string[];

  /**
   * Resolve cross-file references for a file on-demand.
   * This method processes references from the SymbolTable and resolves cross-file references
   * when needed (e.g., for diagnostics, hover, goto definition).
   *
   * @param fileUri The file URI to resolve cross-file references for
   * @returns Effect that resolves cross-file references for the file
   */
  resolveCrossFileReferencesForFile(
    fileUri: string,
  ): Effect.Effect<void, never, never>;

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
   * Get all references in a file
   * @param fileUri The file path to get references for
   * @returns Array of all TypeReference objects in the file
   */
  getAllReferencesInFile(fileUri: string): SymbolReference[];

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
  removeFile(fileUri: string): void;

  /**
   * Add a symbol table to the manager
   * @param symbolTable The symbol table to add
   * @param fileUri The file URI associated with the symbol table
   * @returns Effect that resolves when the symbol table is added
   */
  addSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Effect.Effect<void, never, never>;

  /**
   * Get SymbolTable for a file
   * @param fileUri The file URI
   * @returns The SymbolTable for the file, or undefined if not found
   */
  getSymbolTableForFile(fileUri: string): SymbolTable | undefined;

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
   * Store per-file comment associations for later retrieval by services.
   * Implementations should normalize the file path internally.
   */
  setCommentAssociations(
    fileUri: string,
    associations: CommentAssociation[],
  ): void;

  /**
   * Get documentation block comments associated with a symbol.
   */
  getBlockCommentsForSymbol(symbol: ApexSymbol): ApexComment[];

  /**
   * Get TypeReference data at a specific position in a file
   * This provides precise AST-based position data for enhanced symbol resolution
   * @param fileUri The file path to search in
   * @param position The position to search for references (1-based line index, 0-based column index)
   * @returns Array of TypeReference objects at the position
   */
  getReferencesAtPosition(
    fileUri: string,
    position: { line: number; character: number },
  ): SymbolReference[];

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
  ): Promise<ApexSymbol | null>;

  /**
   * Get the most specific symbol at a given position in a file
   * This provides reliable position-based symbol lookup for LSP services
   * @param fileUri The file URI to search in
   * @param position The position to search for symbols (1-based line index, 0-based column index)
   * @returns The most specific symbol at the position, or null if not found
   */
  getSymbolAtPositionWithinScope(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<ApexSymbol | null>;
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

  /**
   * Get graph data as JSON-serializable data
   */
  getGraphData(): GraphData;

  /**
   * Get graph data filtered by file as JSON-serializable data
   */
  getGraphDataForFile(fileUri: string): FileGraphData;

  /**
   * Get graph data filtered by symbol type as JSON-serializable data
   */
  getGraphDataByType(symbolType: string): TypeGraphData;

  /**
   * Get the current detail level for a file
   * @param fileUri The file URI to check
   * @returns The current detail level, or null if file not indexed
   */
  getDetailLevelForFile(fileUri: string): DetailLevel | null;

  /**
   * Enrich a file to a target detail level
   * Applies layers incrementally: public-api -> protected -> private -> full
   * @param fileUri The file URI to enrich
   * @param targetLevel The target detail level to reach
   * @param documentText The document text for compilation
   * @returns Effect that resolves when enrichment is complete
   */
  enrichToLevel(
    fileUri: string,
    targetLevel: DetailLevel,
    documentText: string,
  ): Effect.Effect<void, never, never>;

  /**
   * Resolve a symbol with iterative enrichment
   * Tries resolution after each enrichment layer until found or all layers exhausted
   * @param fileUri The file to enrich
   * @param documentText The document text for compilation
   * @param resolver Function that attempts resolution (called after each enrichment step)
   * @returns Effect that resolves to the result or null if not found after all layers
   */
  resolveWithEnrichment<T>(
    fileUri: string,
    documentText: string,
    resolver: () => T | null,
  ): Effect.Effect<T | null, never, never>;

  /**
   * Check if a type name represents a standard library type
   * This is useful for filtering out types that don't need artifact loading
   * @param name The type name to check (e.g., 'String', 'System', 'System.Assert', 'Foo')
   * @returns true if it's a standard library type, false otherwise
   */
  isStandardLibraryType(name: string): boolean;
}
